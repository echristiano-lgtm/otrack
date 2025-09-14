import { Link } from 'react-router-dom';
import { slug } from '@/utils/slug';

export default function ClubLinkEvent({ eid, club, className }: { eid: string; club?: string; className?: string }) {
  const label = club || '-';
  return club
    ? <Link className={className ?? 'tag'} to={`/evento/${eid}/clube/${slug(label)}`}>{label}</Link>
    : <span className={className ?? 'tag'}>-</span>;
}