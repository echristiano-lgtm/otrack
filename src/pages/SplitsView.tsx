import React from 'react';
import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';
import { getEventBlob as fetchEventBlob } from '@/utils/api';
import SplitTable from '@/components/SplitTable';

export default function SplitsView() {
  const { eid, cls } = useParams();
  const navigate = useNavigate();
  const className = decodeURIComponent(cls || '');

  // tenta do storage
  const evLocal = load().events?.[eid!];
  const [ev, setEv] = React.useState<any | null>(evLocal || null);
  const [loading, setLoading] = React.useState<boolean>(!evLocal);
  const [error, setError] = React.useState<string>('');
    // monta URL do gráfico com encode seguro
  const eidSafe = encodeURIComponent(eid!);
  const clsSafe = encodeURIComponent(className);
  const graphHref = `/evento/${eidSafe}/classe/${clsSafe}/grafico`;

  // fallback: busca do backend e grava no storage
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (evLocal || !eid) return;
      try {
        setLoading(true);
        const blob = await fetchEventBlob(eid);
        if (!cancelled) {
          setEv(blob);
          setError('');
          try {
            const store = load();
            const next = { ...(store || {}) };
            next.events = { ...(store?.events || {}), [eid!]: blob };
            localStorage.setItem('meos.events', JSON.stringify(next));
          } catch {}
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar splits');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eid]);

  if (loading) {
    return <div className="grid"><div className="panel"><h2>Carregando splits…</h2></div></div>;
  }
  if (error || !ev) {
    return (
      <div className="grid">
        <div className="panel">
          <h2>Splits indisponíveis</h2>
          <div className="card-sm" style={{ marginTop: 8 }}>{error || 'Evento não encontrado'}</div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>
      </div>
    );
  }

  const clsData = ev?.classes?.[className];
  const competitors = (clsData?.competitors || [])
    .filter((c: any) => c.status === 'OK')
    .slice()
    .sort((a: any, b: any) => parseInt(a.pos || '9999', 10) - parseInt(b.pos || '9999', 10));

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
            <div className="row" style={{ gap: 8, alignItems: 'center', flex: '0 0 auto' }}>
              <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
              <Link className="btn" to={graphHref}>📈 Gráfico</Link>
            </div>
            <h2 style={{ margin: 0, flex: '1 1 auto', textAlign: 'right', whiteSpace: 'nowrap'}}>Splits — {className}</h2>
          </div>
        </div>

        <div className="panel-legend">
          <div className="legend">
            {/* Ajuste as classes .swatch.split e .swatch.cum no CSS para cores distintas */}
            <span className="chip"><span className="swatch split"></span> Melhor split</span>
            <span className="chip"><span className="swatch cum"></span> Melhor acumulado</span>
          </div>
        </div>

        <div className="splits-wrap">
          {competitors.length === 0 ? (
            <div className="card-sm">Nenhum atleta OK nesta categoria.</div>
          ) : (
            <SplitTable codes={codes} rows={competitors} />
          )}
        </div>
      </div>
    </div>
  );
}