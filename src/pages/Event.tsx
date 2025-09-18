// src/pages/Event.tsx
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { load } from '@/utils/storage';
import { deleteEvent, getEventBlob as fetchEventBlob } from '@/utils/api';
import { isAdminEnabled, getAdminToken } from '@/utils/admin';

type AnyObj = Record<string, any>;
type CourseInfo = { lengthM?: number; climbM?: number };

const EVENT_VIEW_KEY = 'ui.view.event'; // 'cards' | 'list'

/** normaliza: minúsculas, sem acentos, trim */
function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

/** reduz "B - Feminino" → "B" ; "H21E" mantém; ajusta espaços/traços */
function baseCourseFromClass(clsName: string) {
  const s = (clsName || '').trim();
  const parts = s.split(' - ');
  return parts[0].trim();
}

/** números: "4,5" → 4.5, "4500" → 4500 */
function toNumber(x: any): number | undefined {
  if (x == null) return undefined;
  const s = String(x).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function fmtLength(m?: number): string {
  if (m == null || !Number.isFinite(m)) return '-';
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1).replace('.', ',')} km`;
  return `${Math.round(m)} m`;
}
function fmtClimb(m?: number): string {
  if (m == null || !Number.isFinite(m)) return '-';
  return `${Math.round(m)} m`;
}

/**
 * 1ª tentativa: usar ev.courseMetrics + heurística da classe → curso
 * 2ª tentativa (fallback): vasculhar courseData bruto (Name≈curso-base)
 */
function getCourseInfo(ev: AnyObj, className: string): CourseInfo {
  const cn = baseCourseFromClass(className);
  const key = norm(cn);

  // (A) ev.courseMetrics
  const cm = ev?.courseMetrics as AnyObj | undefined;
  if (cm && typeof cm === 'object') {
    for (const k of Object.keys(cm)) {
      if (norm(k) === key) {
        const v = cm[k] || {};
        return { lengthM: v.lengthM, climbM: v.climbM };
      }
    }
  }

  // (B) fallback direto no courseData (Purple Pen / variantes simples)
  const cd: AnyObj | undefined = ev?.courseData;
  const root = (cd?.CourseData ?? cd) as AnyObj;
  const courseArr = root?.RaceCourseData?.Course || root?.Course || [];
  const list = Array.isArray(courseArr) ? courseArr : [courseArr];

  for (const c of list) {
    const name = (c?.Name ?? c?.CourseName ?? '').toString().trim();
    if (norm(name) === key) {
      const len =
        toNumber(c?.Length) ??
        toNumber(c?.LengthInMeter) ??
        (toNumber(c?.LengthInKm) ? Number(toNumber(c?.LengthInKm))! * 1000 : undefined);
      const climb = toNumber(c?.Climb) ?? toNumber(c?.ClimbInMeter);
      return { lengthM: len, climbM: climb };
    }
  }

  return {};
}

export default function Event() {
  const { eid } = useParams();
  const navigate = useNavigate();

  // carrega do storage…
  const evLocal = load().events?.[eid!];
  const [ev, setEv] = useState<any | null>(evLocal || null);

  // …e se não tiver (deep-link/refresh), busca no backend
  const [loading, setLoading] = useState<boolean>(!evLocal);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (evLocal || !eid) return;
      try {
        setLoading(true);
        const blob = await fetchEventBlob(eid);
        if (!cancelled) {
          setEv(blob);
          setError('');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar evento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eid]);

  const [view, setView] = useState<'cards' | 'list'>(
    (localStorage.getItem(EVENT_VIEW_KEY) as 'cards' | 'list') || 'cards'
  );
  function setViewPersist(v: 'cards' | 'list') {
    setView(v);
    localStorage.setItem(EVENT_VIEW_KEY, v);
  }

  if (loading) {
    return (
      <div className="grid">
        <div className="panel">
          <h2>Carregando evento…</h2>
        </div>
      </div>
    );
  }

  if (error || !ev) {
    return (
      <div className="grid">
        <div className="panel">
          <h2>Ops — algo quebrou na tela</h2>
          <div className="card-sm" style={{ marginTop: 8 }}>
            {error || 'Evento não encontrado'}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>
      </div>
    );
  }

  const classes = Object.keys(ev.classes || {}).sort((a, b) => a.localeCompare(b));
  const showDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{ev.name}</h2>
          <div className="row" style={{ gap: 8 }}>
            <div className="row chip" style={{ gap: 6 }}>
              <button className="btn" onClick={() => setViewPersist('cards')} aria-pressed={view === 'cards'}>
                🗂️ Cards
              </button>
              <button className="btn" onClick={() => setViewPersist('list')} aria-pressed={view === 'list'}>
                📋 Lista
              </button>
            </div>
            <button className="btn" onClick={() => navigate(-1)}>⬅️ Voltar</button>
            <Link className="btn" to="/">🏠 Início</Link>

            {/* ===== Excluir evento (oculto por padrão) =====
                Só aparece quando isAdminEnabled() === true */}
            {isAdminEnabled() && (
              <button
                className="btn"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
                onClick={async () => {
                  const sure = confirm('Excluir este evento? Esta ação não pode ser desfeita.');
                  if (!sure) return;
                  try {
                    await deleteEvent(eid!, getAdminToken());

                    // limpar cache local (mantém sua lógica atual)
                    try {
                      const store = load();
                      if (store.events && store.events[eid!]) {
                        delete store.events[eid!];
                        // dependendo da sua storage, ajuste a chave abaixo:
                        localStorage.setItem('meos.events', JSON.stringify(store));
                      }
                    } catch {}

                    navigate('/');
                  } catch (e: any) {
                    alert(e?.message || 'Falha ao excluir');
                  }
                }}
              >
                🗑️ Excluir evento
              </button>
            )}
          </div>
        </div>

        <div className="meta" style={{ color: 'var(--muted)', marginTop: 4 }}>
          {[ev.date, ev.organizer].filter(Boolean).join(' · ')}
        </div>

        {classes.length === 0 ? (
          <div className="card-sm" style={{ marginTop: 12 }}>Nenhuma categoria neste evento.</div>
        ) : (
          <>
            {/* === Cards === */}
            {view === 'cards' && (
              <div className="cards" style={{ marginTop: 12 }}>
                {classes.map((clsName) => {
                  const cls = ev.classes[clsName];
                  const comp = (cls?.competitors || []) as any[];
                  const okCount = comp.filter((c) => c.status === 'OK').length;

                  const ci = getCourseInfo(ev, clsName);
                  const hasLen = Number.isFinite(ci.lengthM!);
                  const hasClimb = Number.isFinite(ci.climbM!);

                  return (
                    <div key={clsName} className="card-sm">
                      <h3 style={{ marginBottom: 6 }}>
                        <Link to={`/evento/${ev.id}/classe/${encodeURIComponent(clsName)}`}>
                          {clsName}
                        </Link>
                      </h3>

                      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {hasLen && <span className="chip" title="Distância do percurso">📏 {fmtLength(ci.lengthM)}</span>}
                        {hasClimb && <span className="chip" title="Desnível (climb)">⛰️ {fmtClimb(ci.climbM)}</span>}
                        <span className="chip" title="Atletas na classe">👥 {comp.length}</span>
                        <span className="chip" title="Concluíram OK">✅ {okCount} OK</span>
                      </div>

                      <div className="row" style={{ gap: 8 }}>
                        <Link className="btn" to={`/evento/${ev.id}/classe/${encodeURIComponent(clsName)}`}>📄 Resultados</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === Lista === */}
            {view === 'list' && (
              <div className="scrollx" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Distância</th>
                      <th>Climb</th>
                      <th>Atletas</th>
                      <th>OK</th>
                      <th>Abrir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((clsName) => {
                      const cls = ev.classes[clsName];
                      const comp = (cls?.competitors || []) as any[];
                      const okCount = comp.filter((c) => c.status === 'OK').length;
                      const ci = getCourseInfo(ev, clsName);
                      return (
                        <tr key={clsName}>
                          <td>
                            <Link to={`/evento/${ev.id}/classe/${encodeURIComponent(clsName)}`}>
                              {clsName}
                            </Link>
                          </td>
                          <td>{fmtLength(ci.lengthM)}</td>
                          <td>{fmtClimb(ci.climbM)}</td>
                          <td>{comp.length}</td>
                          <td>{okCount}</td>
                          <td>
                            <Link className="btn" to={`/evento/${ev.id}/classe/${encodeURIComponent(clsName)}`}>
                              📄 Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {showDebug && (
          <details className="card-sm" style={{ marginTop: 12 }}>
            <summary>Debug courseData / courseMetrics</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(
                {
                  courseMetrics: ev.courseMetrics,
                  courseDataKeys: ev.courseData ? Object.keys(ev.courseData) : [],
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}