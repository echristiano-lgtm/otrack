import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';
import { slug } from '@/utils/slug';

export default function ClubProfile() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  // chave em slug (exatamente como veio na URL)
  const clubKey = (clubSlug || '').toLowerCase();

  const store = load();

  // eventos em que o clube apareceu (contando atletas por evento)
  const events = useMemo(() => {
    const list: Array<{ eid: string; eventName: string; date?: string; count: number; displayName?: string }> = [];

    Object.entries(store.events || {}).forEach(([eid, ev]: any) => {
      let cnt = 0;
      let displayName: string | undefined;

      Object.values(ev.classes || {}).forEach((cls: any) => {
        (cls.competitors || []).forEach((c: any) => {
          if (!c?.club) return;
          if (slug(c.club).toLowerCase() === clubKey) {
            cnt++;
            // captura um nome “bonito” do clube para o topo
            if (!displayName) displayName = c.club;
          }
        });
      });

      if (cnt > 0) {
        list.push({ eid, eventName: ev.name, date: ev.date, count: cnt, displayName });
      }
    });

    // ordenar por data desc; depois por nome
    list.sort((a, b) => {
      const da = Date.parse(a.date || ''), db = Date.parse(b.date || '');
      if (!isNaN(db - da) && db !== da) return db - da;
      return a.eventName.localeCompare(b.eventName);
    });

    return list;
  }, [store, clubKey]);

  // nome “bonito” para o título
  const clubDisplay =
    events[0]?.displayName ||
    (clubSlug ? decodeURIComponent(clubSlug).replace(/-/g, ' ') : '(Clube)');

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <h2>Clube — {clubDisplay}</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="card-sm" style={{ marginTop: 12 }}>
            Nenhum evento encontrado para <strong>{clubDisplay}</strong> nos dados carregados.
            <div className="small muted" style={{ marginTop: 6 }}>
              Dica: esta lista só considera os eventos já importados/sincronizados neste navegador.
            </div>
          </div>
        ) : (
          <div className="cards" style={{ marginTop: 12 }}>
            {events.map((e) => (
              <div key={e.eid} className="card-sm">
                <h3 style={{ marginBottom: 4 }}>
                  <Link to={`/evento/${e.eid}`}>{e.eventName}</Link>
                </h3>
                <div className="meta">
                  {e.date ? `${e.date} · ` : ''}{e.count} atleta(s) do clube
                </div>
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <Link className="btn" to={`/evento/${e.eid}`}>🏁 Evento</Link>
                  <Link className="btn" to={`/evento/${e.eid}/clube/${clubKey}`}>📄 Clube neste evento</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}