// src/pages/SplitsView.tsx
import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { load } from "@/utils/storage";
import SplitTable from "@/components/SplitTable";

export default function SplitsView() {
  const navigate = useNavigate();
  const { eid, cls } = useParams();

  const ev = load().events[eid!];
  const className = decodeURIComponent(cls!);
  const clsData = ev?.classes?.[className];

  // apenas atletas OK, ordenados por posição
  const competitors = (clsData?.competitors || [])
    .filter((c: any) => c.status === "OK")
    .slice()
    .sort(
      (a: any, b: any) =>
        parseInt(a.pos || "9999", 10) - parseInt(b.pos || "9999", 10)
    );

  // ordem canônica: menor seq observado por código
  const codes = useMemo(() => {
    const order: Record<string, number> = {};
    competitors.forEach((c: any) => {
      (c.splits || []).forEach((s: any) => {
        const seq = typeof s.seq === "number" ? s.seq : undefined;
        if (!seq) return;
        if (!(s.code in order) || seq < order[s.code]) order[s.code] = seq;
      });
    });
    const list = Object.keys(order).sort((a, b) => order[a] - order[b]);
    return [...list, "Chegada"];
  }, [competitors]);

  // link do gráfico (ajuste se sua rota for diferente)
  const graphHref = `/evento/${encodeURIComponent(
    eid || ""
  )}/classe/${encodeURIComponent(className)}/grafico`;

  // —— Estilos: cores unificadas para destaque e legenda ——
  const legendStyles = (
    <style>{`
      :root{
        --best-split-bg: rgba(46, 204, 113, 0.22);
        --best-split-bdr: rgba(46, 204, 113, 0.55);
        --best-cum-bg:   rgba(52, 152, 219, 0.20);
        --best-cum-bdr:  rgba(52, 152, 219, 0.55);
      }
      /* swatches da legenda */
      .panel-legend .legend .swatch{
        display:inline-block;width:14px;height:14px;border-radius:3px;
        border:1px solid transparent;vertical-align:middle;
      }
      .panel-legend .legend .swatch.split{
        background: var(--best-split-bg); border-color: var(--best-split-bdr);
      }
      .panel-legend .legend .swatch.cum{
        background: var(--best-cum-bg); border-color: var(--best-cum-bdr);
      }
      /* suporta diferentes nomes de classe usados na tabela */
      .splits-wrap td.best-split, .splits-wrap td.bestSplit{
        background: var(--best-split-bg);
        outline: 1px solid var(--best-split-bdr);
        box-shadow: inset 0 0 0 9999px var(--best-split-bg);
      }
      .splits-wrap td.best-cum, .splits-wrap td.bestCum{
        background: var(--best-cum-bg);
        outline: 1px solid var(--best-cum-bdr);
        box-shadow: inset 0 0 0 9999px var(--best-cum-bg);
      }
    `}</style>
  );

  return (
    <div className="grid">
      <div className="panel panel--splits">
        <div className="panel-head">
          {/* —— Cabeçalho: botões à ESQUERDA —— */}
          <div
            className="row"
            style={{ gap: 8, alignItems: "center", justifyContent: "flex-start" }}
          >
            <h2 style={{ marginRight: 8 }}>Splits</h2>
		<button className="btn" onClick={() => navigate(-1)}>
              ⬅️ Voltar
            </button>
            <Link className="btn" to={graphHref}>
              📈 Gráfico
            </Link>
            
          </div>
        </div>

        {/* —— Legenda com cores reais dos destaques —— */}
        <div className="panel-legend">
          <div className="legend" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="chip">
              <span className="swatch split" /> Melhor split
            </span>
            <span className="chip">
              <span className="swatch cum" /> Melhor acumulado
            </span>
          </div>
        </div>

        {/* estilos injetados (cores e mapeamento de classes) */}
        {legendStyles}

        <div className="splits-wrap">
          <SplitTable codes={codes} rows={competitors} />
        </div>
      </div>
    </div>
  );
}