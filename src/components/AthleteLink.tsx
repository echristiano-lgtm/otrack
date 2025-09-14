import { Link } from 'react-router-dom';
import { slug } from '@/utils/slug';

export default function AthleteLink({ name, className }: { name?: string; className?: string }) {
  const label = name || '(sem nome)';
  return (
    <Link className={className ?? 'tag'} to={`/atleta/${slug(label)}`}>
      {label}
    </Link>
  );
}