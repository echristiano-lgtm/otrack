import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';

// helpers
function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export default function AthleteProfile(){
  const { nameSlug } = useParams();
  const navigate = useNavigate();

  const targetName = (nameSlug || '').replace(/-/g,' '); // exibição
  const targetKey  = norm(targetName);                    // comparação

  const store = load(); // { events: Record<id, EventData> }
  const participations = useMemo(() => {
    const rows: Array<{
      eid: string;
      eventName: string;
      date?: string;
      className: string;
      athleteId: string;
      athleteName: string;
      club?: string;
      pos?: string;
      timeS?: number;
      status?: string;
    }> = [];

    Object.entries(store.events || {}).forEach(([eid, ev]: any) => {
      Object.entries(ev.classes || {}).forEach(([clsName, cls]: any) => {
        (cls.competitors || []).forEach((c: any) => {
          if (norm(c.name) === targetKey) {
            rows.push({
              eid,
              eventName: ev.name,
              date: ev.date,
              className: clsName,
              athleteId: c.id,
              athleteName: c.name,
              club: c.club,
              pos: c.pos,
              timeS: c.timeS,
              status: c.status,
            });
          }
        });
      });
    });

    // mais recente primeiro (se tiver date), depois por nome de evento
    rows.sort((a,b) => {
      const da = Date.parse(a.date || ''), db = Date.parse(b.date || '');
      if (!isNaN(db - da) && db !== da) return db - da;
      return a.eventName.localeCompare(b.eventName);
    });
    return rows;
  }, [store, targetKey]);

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2>Atleta — {targetName}</h2>
          <div className="row" style={{gap:8}}>
            {/* Volta para a última página visitada */}
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>

        {participations.length === 0 ? (
          <div className="card-sm" style={{marginTop:12}}>
            Nenhuma participação encontrada para <strong>{targetName}</strong> nos eventos carregados.
            <div className="small muted">Dica: os dados agregam apenas os eventos já importados/sincronizados neste navegador.</div>
          </div>
        ) : (
          <div className="cards" style={{marginTop:12}}>
            {participations.map((p, i) => (
              <div key={p.eid + p.athleteId + i} className="card-sm">
                <h3 style={{marginBottom:4}}>
                  {/* AGORA aponta para a CLASSE do evento (não mais para atleta local) */}
                  <Link to={`/evento/${p.eid}/classe/${encodeURIComponent(p.className)}`}>
                    {p.eventName}
                  </Link>
                </h3>
                <div className="meta">
                  {p.date ? `${p.date} · ` : ''}Classe: {p.className}
                </div>
                <div style={{marginTop:8}}>
                  <div><strong>Pos:</strong> {p.status === 'OK' ? (p.pos || '-') : p.status}</div>
                  <div><strong>Tempo:</strong> {typeof p.timeS === 'number' ? fmt(p.timeS) : '-'}</div>
                  {p.club ? <div><strong>Clube:</strong> {p.club}</div> : null}
                </div>
                <div className="row" style={{marginTop:10}}>
                  <Link className="btn" to={`/evento/${p.eid}/classe/${encodeURIComponent(p.className)}`}>📄 Resultados da classe</Link>
                  <Link className="btn" to={`/evento/${p.eid}`}>🏁 Evento</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(s?: number){
  if (typeof s !== 'number' || !isFinite(s)) return '-';
  s = Math.round(s);
  const hh = Math.floor(s/3600), mm = Math.floor((s%3600)/60), ss = s%60;
  return hh>0 ? `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${mm}:${String(ss).padStart(2,'0')}`;
}