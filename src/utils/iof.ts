// frontend/src/utils/iof.ts
import { slug } from '@/utils/slug';
import { buildEventIndex } from '@/utils/indexes';

export type Split = { code: string; seq: number; split?: number; cum?: number };
export type Competitor = {
  id: string;
  name?: string;
  club?: string;
  status?: string;
  pos?: string | number;
  timeS?: number;
  splits?: Split[];
};
export type ClassData = { competitors: Competitor[] };
export type EventData = {
  id: string;
  name: string;
  date?: string;
  classes: Record<string, ClassData>;
  __index?: any;
};

/** Importa um arquivo IOF XML (ResultList) e retorna o objeto de evento pronto */
export async function importIOFXML(file: File): Promise<EventData> {
  const text = await file.text();
  return parseIOFXML(text);
}

/** Faz o parse do IOF XML (v3.x ResultList) para EventData */
export function parseIOFXML(xmlText: string): EventData {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  // Falha de parsing?
  if (doc.querySelector('parsererror')) {
    throw new Error('XML inválido (parsererror)');
  }

  const eventName =
    textOf(doc.querySelector('Event > Name')) ||
    textOf(doc.querySelector('Event > Name > *')) ||
    'Evento';

  const eventIdRaw =
    textOf(doc.querySelector('Event > Id')) ||
    textOf(doc.querySelector('EventId')) ||
    '';

  const date =
    textOf(doc.querySelector('Event > StartTime > Date')) ||
    textOf(doc.querySelector('Event > StartDate')) ||
    textOf(doc.querySelector('Date')) ||
    undefined;

  const ev: EventData = {
    id: eventIdRaw || `${slug(eventName)}-${(date || '').replace(/\D/g, '') || Date.now()}`,
    name: eventName,
    date,
    classes: {},
  };

  // Percorre ClassResult
  doc.querySelectorAll('ClassResult').forEach((cr) => {
    const className = textOf(cr.querySelector('Class > Name')) || 'Classe';
    const competitors: Competitor[] = [];

    cr.querySelectorAll('PersonResult').forEach((pr) => {
      const pid =
        textOf(pr.querySelector('Person > Id')) ||
        textOf(pr.querySelector('PersonId')) ||
        randId();

      const given = textOf(pr.querySelector('Person > Name > Given'));
      const family = textOf(pr.querySelector('Person > Name > Family'));
      const full = textOf(pr.querySelector('Person > Name > Text'));
      const name = (full || `${given} ${family}`).trim() || '(sem nome)';

      const club =
        textOf(pr.querySelector('Organisation > Name')) ||
        textOf(pr.querySelector('Club > Name')) ||
        undefined;

      // Pega um Result principal (se houver múltiplos, ficamos com o primeiro)
      const result = pr.querySelector('Result');
      const status = textOf(result?.querySelector('Status')) || 'OK';
      const timeS = toSec(textOf(result?.querySelector('Time')));

      // Posição <Position> (ou <Place> em alguns exports)
      const posTxt =
        textOf(result?.querySelector('Position')) ||
        textOf(result?.querySelector('Place')) ||
        '';

      // Splits
      const splits: Split[] = [];
      const stNodes = result ? Array.from(result.querySelectorAll('SplitTime')) : [];
      let seqAuto = 1;
      let lastCum: number | undefined = undefined;

      stNodes.forEach((st) => {
        const code = textOf(st.querySelector('ControlCode')) || '';
        if (!code) return;

        const seqXml = toInt(textOf(st.querySelector('Sequence')));
        const cum = toSec(textOf(st.querySelector('Time')));     // cumulativo
        const leg = toSec(textOf(st.querySelector('LegTime')));  // split do trecho

        const s: Split = { code, seq: typeof seqXml === 'number' ? seqXml : seqAuto };

        if (typeof cum === 'number') {
          s.cum = cum;
          if (typeof lastCum === 'number') s.split = cum - lastCum;
        }
        if (typeof leg === 'number') {
          s.split = leg;
          if (typeof s.cum !== 'number' && typeof lastCum === 'number') s.cum = lastCum + leg;
        }
        // fallbacks cruzados
        if (typeof s.split !== 'number' && typeof s.cum === 'number' && typeof lastCum === 'number') {
          s.split = s.cum - lastCum;
        }
        if (typeof s.cum !== 'number' && typeof s.split === 'number' && typeof lastCum === 'number') {
          s.cum = lastCum + s.split;
        }

        splits.push(s);
        if (typeof s.cum === 'number') lastCum = s.cum;
        seqAuto++;
      });

      const comp: Competitor = {
        id: pid,
        name,
        club,
        status,
        timeS,
        splits,
      };
      if (posTxt) comp.pos = posTxt;

      competitors.push(comp);
    });

    ev.classes[className] = { competitors };
  });

  // Gera índice por classe (ordem canônica de controles + fallback de posição)
  ev.__index = buildEventIndex(ev);

  return ev;
}

/* ===================== helpers ===================== */

function textOf(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent || '').trim();
}

function toInt(s?: string): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

/** Converte várias representações em segundos:
 * - "1234"         -> 1234
 * - "MM:SS"        -> mm*60 + ss
 * - "HH:MM:SS"     -> hh*3600 + mm*60 + ss
 * - "PT#H#M#S"     -> ISO8601 duration (parcial)
 */
function toSec(s?: string): number | undefined {
  if (!s) return undefined;
  const t = s.trim();

  // inteiro simples (MeOS/Helga costumam usar segundos)
  if (/^\d+$/.test(t)) return parseInt(t, 10);

  // HH:MM:SS
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [hh, mm, ss] = t.split(':').map((x) => parseInt(x, 10));
    return hh * 3600 + mm * 60 + ss;
  }

  // MM:SS
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [mm, ss] = t.split(':').map((x) => parseInt(x, 10));
    return mm * 60 + ss;
  }

  // ISO 8601 duration tipo PT#H#M#S
  const m = t.match(/^P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/i);
  if (m) {
    const hh = parseInt(m[2] || '0', 10);
    const mm = parseInt(m[3] || '0', 10);
    const ss = parseInt(m[4] || '0', 10);
    return hh * 3600 + mm * 60 + ss;
  }

  const n = parseInt(t, 10);
  return isNaN(n) ? undefined : n;
}

function randId(): string {
  return 'c' + Math.random().toString(36).slice(2, 10);
}