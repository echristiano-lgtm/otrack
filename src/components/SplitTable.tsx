import AthleteLink from '@/components/AthleteLink';
import { hms } from '@/utils/time';

type Props = {
  /** Ordem canônica dos códigos; último item pode ser 'Chegada' */
  codes: string[];
  /** Competidores da classe */
  rows: any[];
};

export default function SplitTable({ codes, rows }: Props) {
  const hasFinish = codes[codes.length - 1] === 'Chegada';
  const splitCodes = hasFinish ? codes.slice(0, -1) : codes;

  // melhores por controle
  const minSplit: Record<string, number> = {};
  const minCum:   Record<string, number> = {};
  splitCodes.forEach(c => { minSplit[c] = Infinity; minCum[c] = Infinity; });

  rows.forEach((c) => {
    const map = Object.fromEntries((c.splits || []).map((s: any) => [s.code, s]));
    splitCodes.forEach(code => {
      const s = map[code];
      if (!s) return;
      if (typeof s.split === 'number' && isFinite(s.split) && s.split < minSplit[code]) minSplit[code] = s.split;
      if (typeof s.cum   === 'number' && isFinite(s.cum)   && s.cum   < minCum[code])   minCum[code]   = s.cum;
    });
  });

  // melhor total (chegada) e melhor "parcial da chegada"
  let bestTotal = Infinity;
  let bestFinishSplit = Infinity;
  rows.forEach((c) => {
    if (typeof c.timeS === 'number' && isFinite(c.timeS)) {
      if (c.timeS < bestTotal) bestTotal = c.timeS;
      // parcial da chegada = timeS - último acumulado conhecido
      const lastCum = lastCumFrom(c, splitCodes);
      if (typeof lastCum === 'number') {
        const finishSplit = c.timeS - lastCum;
        if (isFinite(finishSplit) && finishSplit < bestFinishSplit) bestFinishSplit = finishSplit;
      }
    }
  });

  return (
    <div className="splits-wrap">
      <table className="table-wide">
        <thead>
          <tr className="sticky-head">
            <th>#</th>
            <th>Atleta</th>
            <th>Clube</th>
            {splitCodes.map(code => (
              <th key={code} className="split-col">{code}<br/><span className="small muted">Split / Acum.</span></th>
            ))}
            {hasFinish && <th>Chegada<br/><span className="small muted">Parcial / Total</span></th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((c, index) => {
            const smap = Object.fromEntries((c.splits || []).map((s: any) => [s.code, s]));
            const posCell = c.status === 'OK'
    ? (Number.isFinite(parseInt(String(c.pos), 10)) ? String(c.pos) : String(index + 1))
    : '-';
            const isBad = c.status !== 'OK';

            return (
              <tr key={c.id || index}>
                <td>{posCell}</td>
                <td><AthleteLink name={c.name} /></td>
                <td>{c.club || '-'}</td>

                {splitCodes.map(code => {
                  const s = smap[code];
                  const split = (s && typeof s.split === 'number') ? s.split : undefined;
                  const cum   = (s && typeof s.cum   === 'number') ? s.cum   : undefined;

                  const isBestSplit = typeof split === 'number' && split === minSplit[code];
                  const isBestCum   = typeof cum   === 'number' && cum   === minCum[code];

                  const cls = [
                    isBad ? 'cell-bad' : '',
                    isBestSplit ? 'best-split' : '',
                    isBestCum ? 'best-cum' : '',
                    'cell-lines'
                  ].filter(Boolean).join(' ');

                  return (
                    <td key={code} className={cls}>
                      <span className="l1">{typeof split === 'number' ? hms(split) : '-'}</span>
                      <span className="l2">{typeof cum   === 'number' ? hms(cum)   : '-'}</span>
                    </td>
                  );
                })}

                {hasFinish && (
                  <td className={['cell-lines', isBad ? 'cell-bad' : '', (c.timeS === bestTotal ? 'best-cum' : ''), (finishSplitOf(c, splitCodes) === bestFinishSplit ? 'best-split' : '')].filter(Boolean).join(' ')}>
                    <span className="l1">{hms(finishSplitOf(c, splitCodes))}</span>
                    <span className="l2">{typeof c.timeS === 'number' ? hms(c.timeS) : '-'}</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** último acumulado válido do atleta segundo a ordem de splitCodes */
function lastCumFrom(c: any, splitCodes: string[]): number|undefined {
  const smap = Object.fromEntries((c.splits || []).map((s: any) => [s.code, s]));
  let last: number|undefined;
  for (const code of splitCodes) {
    const s = smap[code];
    if (s && typeof s.cum === 'number' && isFinite(s.cum)) last = s.cum;
  }
  return last;
}

/** parcial da chegada = timeS - último acumulado; se não der, retorna '-' */
function finishSplitOf(c: any, splitCodes: string[]): number|undefined {
  if (!(typeof c.timeS === 'number' && isFinite(c.timeS))) return undefined;
  const last = lastCumFrom(c, splitCodes);
  if (typeof last !== 'number' || !isFinite(last)) return undefined;
  const v = c.timeS - last;
  return isFinite(v) ? v : undefined;
}