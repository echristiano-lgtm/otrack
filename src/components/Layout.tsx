// Layout.tsx
import { Outlet, Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Layout() {
  return (
    <div className="app-root" style={{ minHeight: '100dvh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      {/* ===== Header ===== */}
      <header>
        <div className="container row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <Link to="/" className="btn">🏁 OTrack - Resultados on-line 🚩​🧭🏃</Link>
          </div>
          <div className="row">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="container">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ===== Footer ===== */}
     <footer>
  <div className="footer-wrap">
    <div>
      <h4>Sobre</h4>
      <p>
        Contato e pix para contribuições: <a href="mailto:echristiano@gmail.com">echristiano@gmail.com</a><br />
      
      </p>
    </div>
    <div>
      <h4>Ajuda</h4>
      <ul>
        <li><p>Sugerimos o <a href="https://www.melin.nu/meos/" target="_blank">MEOS</a> para apuração eletrônica</p></li>
        <li><p>Sugerimos o <a href="http://purplepen.golde.org/" target="_blank">Purple Pen</a> para realizar o traçado dos percursos</p></li>
        <li>Suporta IOF XML (.xml, .iof, .html, .htm)</li>
      </ul>
    </div>
  </div>
</footer>
    </div>
  );
}