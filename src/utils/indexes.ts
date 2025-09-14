// frontend/src/utils/indexes.ts
// Gera índices por evento/classe para evitar recomputos em tela.

export type ClassIndex = {
  /** Ordem canônica dos controles da classe (pela menor 'seq' observada nos atletas OK) + 'Chegada' */
  codesCanon: string[];
  /** Fallback de posição por atleta OK (1..n) calculado por timeS, caso <Position> não venha no XML */
  posFallback: Record<string /*competitorId*/, number>;
};

export type EventIndex = Record<string /*className*/, ClassIndex>;

/**
 * Constrói índices para todas as classes do evento.
 * - codesCanon: ordem canônica de controles
 * - posFallback: ranking por tempo para atletas OK
 */
export function buildEventIndex(ev: {
  classes?: Record<string, { competitors?: any[] }>;
}): EventIndex {
  const idx: EventIndex = {};
  if (!ev?.classes) return idx;

  Object.entries(ev.classes).forEach(([className, cls]) => {
    const comps: any[] = cls?.competitors || [];

    // ===== Ordem canônica dos controles =====
    // Menor 'seq' observado para cada code, considerando apenas atletas OK.
    const order: Record<string, number> = {};
    comps
      .filter(c => c?.status === 'OK' && Array.isArray(c.splits))
      .forEach(c => {
        (c.splits || []).forEach((s: any) => {
          const seq = typeof s?.seq === 'number' ? s.seq : undefined;
          const code = s?.code;
          if (!code || seq == null) return;
          if (!(code in order) || seq < order[code]) order[code] = seq;
        });
      });

    const codesCanon = Object.keys(order).sort((a, b) => order[a] - order[b]);
    // garante chegada no final (mesmo se não houver splits)
    if (!codesCanon.includes('Chegada')) codesCanon.push('Chegada');

    // ===== Fallback de posição por tempo (classe inteira) =====
    const okSorted = comps
      .filter(c => c?.status === 'OK' && typeof c?.timeS === 'number' && isFinite(c.timeS))
      .slice()
      .sort((a, b) => a.timeS - b.timeS);

    const posFallback: Record<string, number> = {};
    okSorted.forEach((c, i) => {
      if (c?.id != null) posFallback[c.id] = i + 1;
    });

    idx[className] = { codesCanon, posFallback };
  });

  return idx;
}