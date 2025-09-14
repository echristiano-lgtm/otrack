import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [light, setLight] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'light';
    return document.body.classList.contains('light');
  });

  useEffect(() => {
    document.body.classList.toggle('light', light);
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <button className="btn" onClick={() => setLight(v => !v)}>
      {light ? '🌙' : '☀️'}
    </button>
  );
}
