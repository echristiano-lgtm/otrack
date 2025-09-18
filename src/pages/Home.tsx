// src/pages/Home.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listEvents } from "@/utils/api";

type EvIndexItem = {
  id: string;
  name?: string;
  date?: string;        // 'YYYY-MM-DD'
  organizer?: string;
  classesCount?: number;
};

const VIEW_KEY = "meos_view_mode"; // 'cards' | 'list'

export default function Home() {
  const [idx, setIdx] = useState<Record<string, EvIndexItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  // Busca + Ordenação
  const [q, setQ] = useState("");
  const [sortDesc, setSortDesc] = useState(true); // true = mais recentes primeiro

  // Toggle de visualização (Cards/Lista), preserva no localStorage
  const [view, setView] = useState<"cards" | "list">(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY) as "cards" | "list" | null;
      return v === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  });
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch {}
  }, [view]);

  // Carrega índice
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listEvents();
        setIdx(data || {});
        setErr("");
      } catch (e: any) {
        setErr(e?.message || "Falha ao carregar eventos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Lista filtrada + ordenada
  const filtered = useMemo(() => {
    const norm = (s: string = "") =>
      s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

    let out = Object.values(idx || {}) as EvIndexItem[];

    if (q.trim()) {
      const nq = norm(q);
      out = out.filter(ev => norm(ev.name || "").includes(nq));
    }

    out = out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (sortDesc) out = out.slice().reverse();

    return out;
  }, [idx, q, sortDesc]);

  // Estilos de botão ativo do cabeçalho (Cards/Lista)
  const activeBtn =
    { outline: "2px solid rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.04)" } as React.CSSProperties;

  return (
    <div className="grid">
      <div className="panel">
        {/* Cabeçalho principal (igual ao print: Cards | Lista | Importar XML) */}
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2>Eventos</h2>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
              style={view === "cards" ? activeBtn : undefined}
              title="Ver em cards"
            >
              📁 Cards
            </button>
            <button
              className="btn"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              style={view === "list" ? activeBtn : undefined}
              title="Ver em lista"
            >
              🗒️ Lista
            </button>
            <Link className="btn" to="/importar">⬆️ Importar XML</Link>
          </div>
        </div>

        {/* Linha auxiliar (discreta) para busca e ordenação por data */}
        <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Buscar por nome do evento…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: 8, minWidth: 280, border: "1px solid #dde3ea", borderRadius: 8 }}
          />
          <button className="btn" onClick={() => setSortDesc(s => !s)}>
            {sortDesc ? "⬇️ Ordenar por data (recente)" : "⬆️ Ordenar por data (antiga)"}
          </button>
          {q && <span className="chip">Resultados: {filtered.length}</span>}
        </div>

        {/* Estados */}
        {loading && <div className="card-sm" style={{ marginTop: 12 }}>Carregando…</div>}
        {err && !loading && (
          <div className="card-sm" style={{ marginTop: 12, color: "crimson" }}>
            Erro: {err}
          </div>
        )}

        {/* Conteúdo */}
        {!loading && !err && (
          <>
            {filtered.length === 0 ? (
              <div className="card-sm" style={{ marginTop: 12 }}>Nenhum evento encontrado.</div>
            ) : view === "cards" ? (
              // ===== Cards =====
              <div className="cards" style={{ marginTop: 12 }}>
                {filtered.map((ev) => (
                  <div key={ev.id} className="card-sm">
                    <h3 style={{ marginBottom: 6 }}>
                      <Link to={`/evento/${encodeURIComponent(ev.id)}`}>{ev.name || ev.id}</Link>
                    </h3>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6, color: "var(--muted)" }}>
                      {ev.date && <span className="chip">🗓️ {ev.date}</span>}
                      {!!ev.classesCount && <span className="chip">📚 {ev.classesCount} categorias</span>}
                      {ev.organizer && <span className="chip">🏷️ {ev.organizer}</span>}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Link className="btn" to={`/evento/${encodeURIComponent(ev.id)}`}>📄 Abrir</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // ===== Lista (tabela) =====
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e6edf3" }}>
                      <th style={{ padding: "10px 8px" }}>Evento</th>
                      <th style={{ padding: "10px 8px" }}>Data</th>
                      <th style={{ padding: "10px 8px" }}>Organizador</th>
                      <th style={{ padding: "10px 8px" }}>Categorias</th>
                      <th style={{ padding: "10px 8px" }}>Abrir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: "1px solid #f3f6f9" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <Link to={`/evento/${encodeURIComponent(ev.id)}`}>{ev.name || ev.id}</Link>
                        </td>
                        <td style={{ padding: "10px 8px" }}>{ev.date || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{ev.organizer || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{ev.classesCount ?? "-"}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <Link className="btn" to={`/evento/${encodeURIComponent(ev.id)}`}>📄 Abrir</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}