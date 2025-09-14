import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';
import { hms } from '@/utils/time';
import AthleteLink from '@/components/AthleteLink';
import { slug } from '@/utils/slug';

type Row = {
  id: string;
  name?: string;
  club?: string;
  className: string;
  status?: string;
  pos?: string | number;
  timeS?: number;
};

export default function ClubEvent() {
  const { eid, clubSlug } = useParams();
  const navigate = useNavigate();

  const ev = load().events[eid!];

  // chave do clube em slug (casa com a URL)
  const clubKey = (clubSlug || '').toLowerCase();

  // 1) Linhas do clube (somente display)
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (!ev) return out;

    Object.entries(ev.classes || {}).forEach(([clsName, cls]: any) => {
      (cls.competitors || []).forEach((c: any) => {
        if (c?.club && slug(c.club).toLowerCase() === clubKey) {
          out.push({
            id: c.id,
            name: c.name,
            club: c.club,
            className: clsName,
            status: c.status,
            pos: c.pos,
            timeS: c.timeS,
          });
        }
      });
    });

    return out;
  }, [ev, clubKey]);

  // 2) Mapa de posições por classe considerando a CLASSE INTEIRA (não só o clube)
  //    Para cada classe do evento: entre os OK com timeS válido, ordena por tempo e atribui 1..n
  const derivedPosByClass = useMemo<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    if (!ev) return map;

    Object.entries(ev.classes || {}).forEach(([clsName, cls]: any) => {
      const okSorted = (cls.competitors || [])
        .filter((r: any) => r.status === 'OK' && typeof r.timeS === 'number')
        .slice()
        .sort((a: any, b: any) => a.timeS - b.timeS);
      const posMap: Record<string, number> = {};
      okSorted.forEach((r: any, i: number) => { posMap[r.id] = i + 1; });
      map[clsName] = posMap;
    });

    return map;
  }, [ev]);

  // 3) Ordenação: Classe (A→Z) e, dentro dela, OK por posição (XML ou fallback da classe inteira); depois não-OK por status
  const sorted = useMemo<Row[]>(() => {
    return rows.slice().sort((a, b) => {
      const byClass = a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' });
      if (byClass !== 0) return byClass;

      const aOK = a.status === 'OK', bOK = b.status === 'OK';
      if (aOK && bOK) {
        const aPos = a.pos != null && String(a.pos).trim() !== ''
          ? parseInt(String(a.pos), 10)
          : (derivedPosByClass[a.className]?.[a.id] ?? 9999);
        const bPos = b.pos != null && String(b.pos).trim() !== ''
          ? parseInt(String(b.pos), 10)
          : (derivedPosByClass[b.className]?.[b.id] ?? 9999);
        return aPos - bPos;
      }
      if (aOK) return -1;
      if (bOK) return 1;
      return String(a.status || '').localeCompare(String(b.status || ''));
    });
  }, [rows, derivedPosByClass]);

  // 4) Nome “bonito” do clube para título
  const clubDisplay =
    sorted[0]?.club ||
    (clubSlug ? decodeURIComponent(clubSlug).replace(/-/g, ' ') : '(Clube)');

  const count = sorted.length;

  // 5) Exibição da colocação (#) — sempre na CLASSE
  const displayPos = (r: Row) => {
    if (r.status !== 'OK') return '-';
    const hasPos = r.pos != null && String(r.pos).trim() !== '';
    if (hasPos) return r.pos;
    const fallback = derivedPosByClass[r.className]?.[r.id];
    return fallback ?? '-';
    // ^ fallback calculado na classe inteira
  };

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <h2>{clubDisplay} — {ev?.name || ''}</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to={`/evento/${eid}`}>🏁 Evento</Link>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>

        <div className="card-sm" style={{ marginTop: 8 }}>
          <strong>Participantes do clube neste evento:</strong> {count}
        </div>

        {count === 0 ? (
          <div className="card-sm" style={{ marginTop: 12 }}>
            Nenhum atleta deste clube foi encontrado neste evento.
          </div>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Atleta</th>
                <th>Classe</th>
                <th>Tempo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id + r.className + i}>
                  <td>{displayPos(r)}</td>
                  <td><AthleteLink name={r.name} /></td>
                  <td>
                    <Link className="tag" to={`/evento/${eid}/classe/${encodeURIComponent(r.className)}`}>
                      {r.className}
                    </Link>
                  </td>
                  <td>{typeof r.timeS === 'number' ? hms(r.timeS) : '-'}</td>
                  <td>{r.status || 'OK'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
          <Link className="btn" to={`/clube/${clubKey}`}>
            📚 Ver todos os eventos do clube
          </Link>
        </div>
      </div>
    </div>
  );
}