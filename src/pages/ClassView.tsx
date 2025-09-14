import { Link, useParams, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';
import AthleteLink from '@/components/AthleteLink';
import { hms } from '@/utils/time';
import ClubLinkEvent from '@/components/ClubLinkEvent';

export default function ClassView() {
  const { eid, cls } = useParams();
  const navigate = useNavigate();

  const ev = load().events[eid!];
  const clsName = decodeURIComponent(cls!);
  const clsData = ev?.classes?.[clsName];
  const competitors: any[] = clsData?.competitors || [];

  // Fallback: calcula posição a partir do tempo entre status OK
  const okSorted = competitors
    .filter(c => c.status === 'OK' && typeof c.timeS === 'number')
    .slice()
    .sort((a, b) => a.timeS - b.timeS);

  const derivedPos: Record<string, number> = {};
  okSorted.forEach((c, i) => { derivedPos[c.id] = i + 1; });

  const displayPos = (c: any) => {
    if (c.status !== 'OK') return '-';
    // usa c.pos se vier do XML; se não, usa fallback calculado
    const hasPos = c.pos !== undefined && c.pos !== null && String(c.pos).trim() !== '';
    return hasPos ? c.pos : (derivedPos[c.id] ?? '-');
  };

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Classe — {clsName}</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to={`./splits`}>🧮 Splits (tabela)</Link>
            <Link className="btn" to={`/evento/${eid}`}>🏁 Evento</Link>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Atleta</th>
              <th>Clube</th>
              <th>Tempo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
  {competitors.map((c: any, i: number) => (
    <tr key={c.id}>
      <td>{displayPos(c)}</td>
      <td><AthleteLink name={c.name} /></td>
      <td><ClubLinkEvent eid={eid!} club={c.club} /></td>
      <td>{typeof c.timeS === 'number' ? hms(c.timeS) : '-'}</td>
      <td>{c.status || 'OK'}</td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>
  );
}