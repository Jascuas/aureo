import { formatCurrency, formatPercentage } from "@/lib/utils";

type ProgressVariantProps = {
  data: {
    name: string;
    value: number;
  }[];
};

export const ProgressVariant = ({ data }: ProgressVariantProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const max = data.reduce((m, item) => Math.max(m, item.value), 0);

  return (
    <ul className="flex flex-col gap-3 pt-2">
      {data.map((item, i) => {
        const barPct = max > 0 ? (item.value / max) * 100 : 0;
        const sharePct = total > 0 ? (item.value / total) * 100 : 0;

        return (
          <li key={`${item.name}-${i}`} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-muted-foreground shrink-0 text-right text-[10px] tabular-nums">
                  {i + 1}
                </span>
                <span className="line-clamp-1 min-w-0 flex-1 text-xs font-medium">
                  {item.name || "Unknown"}
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-xs tabular-nums">
                  {formatCurrency(item.value)}
                </span>
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {formatPercentage(sharePct)}
                </span>
              </div>
            </div>

            <div className="bg-muted-foreground relative h-0.5 w-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${i === 0 ? "bg-crt-accent" : "bg-foreground"}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
