// src/pages/Home.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEvents, getEventBlob } from '@/utils/api';
import { load, upsertEvent, save } from '@/utils/storage';

type EvIndexItem = {
  id: string;
  name?: string;
  date?: string;
  organizer?: string;
  classesCount?: number;
};
type EvIndex = Record<string, EvIndexItem>;

const HOME_VIEW_KEY = 'ui.view.home'; // 'cards' | 'list'

export default function Home() {
  const [idx, setIdx] = useState<EvIndex>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string>('');
  const [view, setView] = useState<'cards' | 'list'>(
    (localStorage.getItem(HOME_VIEW_KEY) as 'cards' | 'list') || 'cards'
  );

  // Buscar índice do backend e sincronizar cache local
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const backendIdx = await listEvents(); // { [id]: { id, name, date, organizer, classesCount? } }
        if (cancelled) return;
        setIdx(backendIdx || {});
        setLoading(false);

        // --- Sincronização de cache local ---
        setSyncing(true);
        const local = load();

        // a) Baixar blobs que ainda não temos
        const missing = Object.keys(backendIdx).filter(id => !local.events[id]);
        for (const id of missing) {
          try {
            const ev = await getEventBlob(id);
            upsertEvent(ev);
          } catch (e) {
            console.warn('Falha ao baixar blob', id, e);
          }
        }

        // b) Remover do cache o que não existe no backend
        const backendIds = new Set(Object.keys(backendIdx));
        const store = load();
        let changed = false;
        for (const id of Object.keys(store.events)) {
          if (!backendIds.has(id)) {
            delete store.events[id];
            changed = true;
          }
        }
        if (changed) save(store);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Falha ao carregar eventos');
          setLoading(false);
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => {
    return Object.values(idx).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [idx]);

  function setViewPersist(v: 'cards' | 'list') {
    setView(v);
    localStorage.setItem(HOME_VIEW_KEY, v);
  }

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <h2>Eventos</h2>
          <div className="row" style={{ gap:8 }}>
            <div className="row chip" style={{ gap:6 }}>
              <button className="btn" onClick={() => setViewPersist('cards')} aria-pressed={view==='cards'}>
                🗂️ Cards
              </button>
              <button className="btn" onClick={() => setViewPersist('list')} aria-pressed={view==='list'}>
                📋 Lista
              </button>
            </div>
            <Link className="btn" to="/importar">⬆️ Importar XML</Link>
          </div>
        </div>

        {loading && <div className="small muted" style={{ marginTop:8 }}>Carregando…</div>}
        {err && (
          <div className="card-sm" style={{ marginTop:8, borderColor:'#dc2626', color:'#dc2626' }}>
            <strong>Erro:</strong> {err}
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="card-sm" style={{ marginTop:12 }}>
            Nenhum evento por aqui ainda. Use <strong>Importar IOF</strong> para começar.
          </div>
        )}

        {/* === Cards === */}
        {view === 'cards' && !!items.length && (
          <div className="cards" style={{ marginTop:12 }}>
            {items.map(ev => (
              <div key={ev.id} className="card-sm">
                <h3 style={{ marginBottom:4 }}>
                  <Link to={`/evento/${ev.id}`}>{ev.name || '(sem nome)'}</Link>
                </h3>
                <div className="meta">
                  {[ev.date, ev.organizer].filter(Boolean).join(' · ')}
                </div>
                <div className="row" style={{ gap:8, marginTop:8 }}>
                  {typeof ev.classesCount === 'number' && (
                    <span className="chip" title="Número de categorias">🏷️ {ev.classesCount}</span>
                  )}
                  <Link className="btn" to={`/evento/${ev.id}`}>📄 Abrir</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === Lista === */}
        {view === 'list' && !!items.length && (
          <div className="scrollx" style={{ marginTop:12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Data</th>
                  <th>Organizador</th>
                  <th>Categorias</th>
                  <th>Abrir</th>
                </tr>
              </thead>
              <tbody>
                {items.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <Link to={`/evento/${ev.id}`}>{ev.name || '(sem nome)'}</Link>
                    </td>
                    <td>{ev.date || '-'}</td>
                    <td>{ev.organizer || '-'}</td>
                    <td>{typeof ev.classesCount === 'number' ? ev.classesCount : '-'}</td>
                    <td>
                      <Link className="btn" to={`/evento/${ev.id}`}>📄 Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {syncing && !loading ? (
          <div className="small muted" style={{ marginTop:8 }}>
            Sincronizando cache local…
          </div>
        ) : null}
      </div>
    </div>
  );
}