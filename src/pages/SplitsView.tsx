import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { load } from '@/utils/storage';
import SplitTable from '@/components/SplitTable';

export default function SplitsView() {
  const { eid, cls } = useParams();
  const ev = load().events[eid!];
  const className = decodeURIComponent(cls!);
  const clsData = ev?.classes?.[className];

  // apenas atletas OK, ordenados por posição
  const competitors = (clsData?.competitors || [])
    .filter((c: any) => c.status === 'OK')
    .slice()
    .sort((a: any, b: any) => parseInt(a.pos || '9999', 10) - parseInt(b.pos || '9999', 10));

  // ordem canônica: menor seq observado por código
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
    return [...list, 'Chegada'];
  }, [competitors]);

  return (
    <div className="grid">
      <div className="panel panel--splits">
        <div className="panel-head">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              Splits — {ev?.name} <span className="pill">Apenas OK</span>
            </h2>
            <div className="row" style={{ gap: 8 }}>
              <Link className="btn" to=".." relative="path">⬅️ Voltar</Link>
              <Link className="btn" to="../splits-graph" relative="path">📈 Gráfico</Link>
            </div>
          </div>
        </div>

        <div className="panel-legend">
          <div className="legend">
            <span className="chip"><span className="swatch split"></span> Melhor split</span>
            <span className="chip"><span className="swatch cum"></span> Melhor acumulado</span>
          </div>
        </div>

        <div className="splits-wrap">
          <SplitTable codes={codes} rows={competitors} />
        </div>
      </div>
    </div>
  );
}