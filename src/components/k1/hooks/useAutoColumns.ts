import { useEffect, useRef, useState } from "react";

/**
 * Auto-compute how many columns we need so content fits without vertical scroll.
 * We assume each section header = 1 row, each item = 1 row (Phase-A density).
 */
export function useAutoColumns<T extends HTMLElement>({
  totalRows,
  rowPx = 32,
  minCols = 1,
  maxCols = 4,
}: {
  totalRows: number;
  rowPx?: number;
  minCols?: number;
  maxCols?: number;
}) {
  const ref = useRef<T | null>(null);
  const [cols, setCols] = useState(minCols);
  const [tooTallEvenAtMax, setTooTall] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current as unknown as HTMLElement;

    const compute = () => {
      const H = el.clientHeight || el.getBoundingClientRect().height || 0;
      if (H <= 0) return;
      let chosen = minCols;
      let overflowAtMax = false;
      for (let n = minCols; n <= maxCols; n++) {
        const rowsPerCol = Math.ceil(totalRows / n);
        const required = rowsPerCol * rowPx + 8;
        if (required <= H) {
          chosen = n;
          overflowAtMax = false;
          break;
        }
        if (n === maxCols) {
          overflowAtMax = true;
          chosen = maxCols;
        }
      }
      setCols(chosen);
      setTooTall(overflowAtMax);
    };

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    compute();
    return () => ro.disconnect();
  }, [totalRows, rowPx, minCols, maxCols]);

  return { ref, cols, tooTallEvenAtMax };
}

