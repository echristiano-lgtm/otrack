import React from "react";

type Props = { url: string; title?: string; children?: React.ReactNode };

export default function ShareButton({ url, title = "Evento", children }: Props) {
  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Link copiado para a área de transferência!");
      } else {
        // fallback
        const ok = window.confirm(`Copiar link?\n\n${url}`);
        if (ok) {
          // tenta copiar via prompt selection
        }
      }
    } catch (e) {
      console.warn("Share canceled/failed:", e);
    }
  }

  return (
    <button className="btn" onClick={onShare} title="Compartilhar">
      {children ?? "🔗 Compartilhar"}
    </button>
  );
}