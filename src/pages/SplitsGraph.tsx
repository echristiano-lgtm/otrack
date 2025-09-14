import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { load } from '@/utils/storage';
import { hms } from '@/utils/time';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts';

type Row = Record<string, any>;
type AnyObj = Record<string, any>;

/* ===================== Helpers de normalização ===================== */
function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
function baseCourseFromClass(clsName: string) {
  const s = (clsName || '').trim();
  const parts = s.split(' - ');
  return parts[0].trim();
}
function toNum(x: any): number | undefined {
  if (x == null) return undefined;
  const n = Number(String(x).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/* ===================== Extração de pernas do CourseData ===================== */
/**
 * Tenta encontrar um "course" correspondente à classe.
 * Considera nomes "de base" (ex.: "B - Feminino" → "B") e algumas estruturas comuns.
 */
function findCourseNode(ev: AnyObj, className: string): AnyObj | null {
  const cd: AnyObj | undefined = ev?.courseData;
  if (!cd) return null;
  const root = (cd.CourseData ?? cd) as AnyObj;

  // candidatos de array de courses
  const candidates =
    root?.RaceCourseData?.Course ??
    root?.Course ??
    root?.Courses ??
    root?.CourseData?.Course ?? null;

  const list: AnyObj[] = Array.isArray(candidates)
    ? candidates
    : candidates
    ? [candidates]
    : [];

  if (!list.length) return null;

  const clsBase = baseCourseFromClass(className);
  const keys = [className, clsBase].map(norm);

  // tenta casar por Name / CourseName / ClassName / Class.Name
  const nameFrom = (c: AnyObj) =>
    c?.Name ?? c?.CourseName ?? c?.ClassName ?? c?.Class?.Name ?? c?.Class?.ShortName ?? '';

  let found = list.find((c) => keys.includes(norm(nameFrom(c))));
  if (found) return found;

  // fallback: se houver só um course, devolve ele
  if (list.length === 1) return list[0];

  return null;
}

/**
 * Extrai um array de pernas (comprimento até o próximo controle), na ordem
 * declarada no arquivo de curso.
 * Procura propriedades comuns: LegLength, LengthToNext, DistanceToNext, Length, etc.
 */
function extractLegsFromCourse(course: AnyObj): { orderCodes: string[]; legM: (number | undefined)[] } | null {
  // estruturas comuns de controles: CourseControl[], Control[], Controls.Control[]
  const raw =
    course?.CourseControl ??
    course?.Control ??
    course?.Controls?.Control ??
    course?.CourseControls ??
    null;

  const controls: AnyObj[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (!controls.length) return null;

  // mapeia código e comprimento até o próximo
  const codes: string[] = [];
  const legs: (number | undefined)[] = [];

  for (let i = 0; i < controls.length; i++) {
    const node = controls[i] || {};
    const code =
      node?.ControlCode ??
      node?.Code ??
      node?.Control?.Code ??
      node?.Control?.ControlCode ??
      node?.Name ??
      '';
    codes.push(String(code || '').trim());

    // comprimento até o próximo (várias chaves possíveis)
    const L =
      toNum(node?.LegLength) ??
      toNum(node?.LengthToNext) ??
      toNum(node?.DistanceToNext) ??
      toNum(node?.DistToNext) ??
      toNum(node?.Length) ??
      undefined;

    // se for o último controle, não há "to next"
    if (i < controls.length - 1) {
      legs.push(L);
    }
  }

  return { orderCodes: codes, legM: legs };
}

/**
 * Dado o ev.courseData, encontra o course e cria um vetor de distância por perna
 * alinhado à ordem CANÔNICA dos códigos da classe.
 *
 * - codesClass: ordem canônica (sem "Chegada")
 * - retorna um vetor legM[] do mesmo tamanho de (codesClass.length - 1),
 *   onde legM[i] é a distância entre codesClass[i] → codesClass[i+1].
 * - Se não encontrar, usa 1 como fallback (larguras iguais).
 */
function getLegsAligned(ev: AnyObj, className: string, codesClass: string[]) {
  const course = findCourseNode(ev, className);
  const n = Math.max(0, codesClass.length - 1);
  // fallback todo-1 (larguras iguais)
  const fallback = Array.from({ length: n }, () => 1);

  if (!course || n === 0) return fallback;

  const parsed = extractLegsFromCourse(course);
  if (!parsed || !parsed.orderCodes?.length) return fallback;

  // cria índice do course por código → posição
  const pos: Record<string, number> = {};
  parsed.orderCodes.forEach((c, i) => {
    if (!pos[c]) pos[c] = i;
  });

  const legs: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = codesClass[i];
    const b = codesClass[i + 1];
    const ia = pos[a];
    const ib = pos[b];

    let L: number | undefined;

    // casado em sequência (a → b no course)
    if (Number.isFinite(ia) && Number.isFinite(ib) && ib === ia + 1) {
      L = parsed.legM[ia];
    }

    legs.push(
      typeof L === 'number' && L > 0 ? L : 1 // fallback 1 se faltar
    );
  }
  return legs;
}

/* ===================== Página / Gráfico ===================== */
export default function SplitsGraph() {
  const { eid, cls } = useParams();
  const ev = load().events[eid!];
  const className = decodeURIComponent(cls!);
  const clsData = ev?.classes?.[className];

  // Só atletas OK, ordenados por posição
  const competitors = (clsData?.competitors || [])
    .filter((c: any) => c.status === 'OK')
    .slice()
    .sort(
      (a: any, b: any) =>
        parseInt(a.pos || '9999', 10) - parseInt(b.pos || '9999', 10)
    );

  // ===== Ordem canônica dos controles (pela menor 'seq') + Chegada =====
  const codes = useMemo(() => {
    const order: Record<string, number> = {};
    competitors.forEach((c: any) => {
      (c.splits || []).forEach((s: any) => {
        const seq = typeof s.seq === 'number' ? s.seq : undefined;
        if (!seq) return;
        if (!(s.code in order) || seq < order[s.code]) order[s.code] = seq;
      });
    });
    const list = Object.keys(order).sort((a, b) => order[a] - order[b]);
    return [...list, 'Chegada']; // chegada sempre no fim
  }, [competitors]);

  // Códigos sem Chegada (para alinhar pernas)
  const codesNoFinish = useMemo(() => codes.slice(0, -1), [codes]);

  // ===== Distâncias por perna, alinhadas à ordem canônica =====
  const legs = useMemo(
    () => getLegsAligned(ev, className, codesNoFinish),
    [ev, className, codesNoFinish]
  );

  // ===== Alinhar cada atleta aos códigos canônicos, ignorando fora de ordem =====
  function alignCumInClassOrder(c: any, codeList: string[]): (number | undefined)[] {
    const res: (number | undefined)[] = new Array(codeList.length).fill(undefined);
    const splits = c.splits || [];
    let i = 0; // cursor nos splits do atleta
    for (let j = 0; j < codeList.length; j++) {
      const code = codeList[j];
      if (code === 'Chegada') {
        // acumulado final = tempo total
        res[j] = typeof c.timeS === 'number' ? c.timeS : undefined;
        continue;
      }
      // procura o 'code' a partir do cursor (ignora o que ficou pra trás)
      let found = -1;
      for (let k = i; k < splits.length; k++) {
        if (splits[k]?.code === code) { found = k; break; }
      }
      if (found >= 0) {
        const s = splits[found];
        res[j] = typeof s.cum === 'number' ? s.cum : undefined;
        i = found + 1; // avança cursor
      } else {
        res[j] = undefined; // não encontrado (faltou esse controle)
      }
    }
    return res;
  }

  // Seleção inicial: todos OK
  const [selected, setSelected] = useState<string[]>(competitors.map((c: any) => c.id));
  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ===== Distância acumulada para posicionar os pontos no eixo X =====
  // Posição de cada controle = soma das pernas anteriores (0 no primeiro).
  const distAccum = useMemo(() => {
    const arr: number[] = [0];
    let acc = 0;
    for (let i = 0; i < legs.length; i++) {
      acc += legs[i] || 1;
      arr.push(acc);
    }
    // agora arr.length === codesNoFinish.length + 1 (inclui “Chegada”)
    return arr;
  }, [legs, codesNoFinish.length]);

  // ===== Dados do gráfico =====
  // Guardamos como NEGATIVO para as curvas “descerem”.
  const data: Row[] = useMemo(() => {
    // pré-alinha acumulados por atleta
    const aligned: Record<string, (number | undefined)[]> = {};
    competitors.forEach((c: any) => {
      aligned[c.id] = alignCumInClassOrder(c, codes);
    });

    // monta pontos (um por code), usando distâncias acumuladas
    return codes.map((code, idx) => {
      const row: Row = { name: code, x: distAccum[idx] ?? idx };
      competitors.forEach((c: any) => {
        const arr = aligned[c.id];
        const v = arr[idx];
        row[c.id] = typeof v === 'number' ? -v : undefined; // negativo para inverter
      });
      return row;
    });
  }, [codes, competitors, distAccum]);

  // Paleta simples
  const palette = ['#2563eb','#dc2626','#16a34a','#9333ea','#059669','#ea580c','#0ea5e9','#e11d48','#84cc16','#a855f7'];

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2>Gráfico — Tempo acumulado (invertido) — {ev?.name}</h2>
          <div className="row">
            <Link className="btn" to="../splits" relative="path">⬅️ Tabela</Link>
            <Link className="btn" to=".." relative="path">⬅️ Voltar</Link>
          </div>
        </div>

        {/* Seleção de atletas */}
        <div className="panel" style={{marginTop:8}}>
          <div className="row" style={{gap:12, alignItems:'baseline', flexWrap:'wrap'}}>
            <strong>Atletas (OK):</strong>
            {competitors.map((c:any, idx:number)=>(
              <label key={c.id} className="chip" style={{display:'inline-flex',gap:6,alignItems:'center',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={()=> toggle(c.id)}
                  style={{verticalAlign:'middle'}}
                />
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <span style={{display:'inline-block',width:10,height:10,background:palette[idx%palette.length],borderRadius:2}} />
                  {c.pos? `${c.pos}. ` : ''}{c.name}
                </span>
              </label>
            ))}
          </div>
          <div className="small muted" style={{marginTop:6}}>
            A largura das colunas segue a distância entre controles (quando disponível no XML do percurso).
          </div>
        </div>

        {/* Gráfico */}
        <div style={{height:420, marginTop:12}}>
          <ResponsiveContainer width="100%" height="100%">
           <LineChart data={data} margin={{ top: 12, right: 24, left: 12, bottom: 12 }}>
    {/* Grid só horizontal; as colunas/legs virão das ReferenceLines */}
    <CartesianGrid strokeDasharray="3 3" vertical={false} />

    {/* Eixo X numérico pelas distâncias; pode ficar oculto */}
    <XAxis dataKey="x" type="number" hide domain={['dataMin', 'dataMax']} />

    <YAxis tickFormatter={(v:number)=> hms(-v)} domain={['auto','auto']} />
    <Tooltip
      formatter={(v:any)=> hms(-Number(v))}
      labelFormatter={(_, payload)=> {
        const p = payload && payload[0];
        return p && p.payload ? `Controle: ${p.payload.name}` : '';
      }}
    />
    <Legend />

    {/* === Colunas: uma linha vertical por leg (posições do eixo X) === */}
    {distAccum.map((x, i) => (
      i === 0 ? null : (   // pule a origem se quiser
        <ReferenceLine
          key={`leg-${i}`}
          x={x}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeDasharray="4 4"
        />
      )
    ))}

    {competitors.map((c:any, idx:number)=>(
      selected.includes(c.id) ? (
        <Line
          key={c.id}
          type="linear"
          dataKey={c.id}
          name={c.name}
          dot={false}
          stroke={palette[idx%palette.length]}
          isAnimationActive={false}
        />
      ) : null
    ))}
  </LineChart>



          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}