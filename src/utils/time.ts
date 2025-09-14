export const hms = (s?: number) => {
  if (typeof s !== 'number' || !isFinite(s)) return '-';
  const sign = s < 0 ? '-' : '';
  s = Math.abs(Math.round(s));
  const hh = Math.floor(s / 3600),
        mm = Math.floor((s % 3600) / 60),
        ss = s % 60;
  return hh > 0
    ? `${sign}${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
    : `${sign}${mm}:${String(ss).padStart(2,'0')}`;
};

export const slug = (t: string) =>
  t.toLowerCase()
   .normalize('NFD')
   .replace(/\p{Diacritic}/gu,'')
   .replace(/[^a-z0-9]+/g,'-')
   .replace(/^-|-$|--+/g,'');
