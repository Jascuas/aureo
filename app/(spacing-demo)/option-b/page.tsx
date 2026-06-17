import Link from "next/link";

const NAV = [
  { href: "/option-a", label: "A · EDGE BLEED", active: false },
  { href: "/option-b", label: "B · COMPACT", active: true },
  { href: "/option-c", label: "C · GHOST", active: false },
];

const STATS = [
  { label: "BALANCE", value: "$12,450.00", change: "+8.2%", pos: true },
  { label: "INCOME", value: "$4,200.00", change: "+12.4%", pos: true },
  { label: "EXPENSES", value: "$1,850.00", change: "-3.1%", pos: false },
];

const TXS = [
  {
    name: "Stripe Inc.",
    cat: "Income",
    date: "May 28",
    amount: "+$4,200.00",
    pos: true,
  },
  { name: "AWS", cat: "Infra", date: "May 27", amount: "-$320.00", pos: false },
  {
    name: "Figma",
    cat: "Tools",
    date: "May 26",
    amount: "-$45.00",
    pos: false,
  },
  {
    name: "Vercel",
    cat: "Infra",
    date: "May 25",
    amount: "-$20.00",
    pos: false,
  },
  { name: "OpenAI", cat: "AI", date: "May 24", amount: "-$85.00", pos: false },
];

export default function OptionB() {
  return (
    <>
      {/* Sticky topbar */}
      <header className="bg-background/92 border-border sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-sm">
        <span className="text-muted-foreground text-2xs tracking-widest uppercase">
          &gt; AUREO_
        </span>
        <span className="text-crt-accent text-2xs tracking-widest uppercase">
          ☰
        </span>
      </header>

      {/* Option label */}
      <div className="border-border border-b px-4 py-2">
        <p className="text-success text-2xs tracking-widest uppercase">
          Option B — Compact Canvas
        </p>
        <p className="text-muted-foreground text-3xs mt-0.5">
          px-3 on wrapper · p-3 cards · canvas visible on all sides · 24px from
          edge
        </p>
      </div>

      {/* ─── CONTENT: small outer padding + smaller card padding ─── */}
      <main className="px-3 py-4">
        {/* Stats grid */}
        <div className="mb-3 grid grid-cols-1 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-card border-border border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-3xs tracking-widest uppercase">
                  {s.label}
                </span>
                <span
                  className={`text-3xs border px-2 py-0.5 ${s.pos ? "text-crt-pos border-crt-pos" : "text-crt-neg border-crt-neg"}`}
                >
                  {s.change}
                </span>
              </div>
              <p className="mt-2 text-base font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Transactions card */}
        <div className="bg-card border-border border">
          <div className="border-border border-b px-3 py-3">
            <span className="text-muted-foreground text-2xs tracking-widest uppercase">
              Recent Transactions
            </span>
          </div>
          {TXS.map((tx, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-3 ${i < TXS.length - 1 ? "border-border border-b" : ""}`}
            >
              <div>
                <p className="text-2xs font-bold">{tx.name}</p>
                <p className="text-muted-foreground text-3xs mt-0.5">
                  {tx.cat} · {tx.date}
                </p>
              </div>
              <span
                className={`text-2xs font-bold ${tx.pos ? "text-crt-pos" : "text-crt-neg"}`}
              >
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Nav switcher */}
      <nav className="border-border fixed right-0 bottom-0 left-0 flex border-t">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`text-3xs flex-1 py-3 text-center tracking-wider uppercase transition-colors ${
              n.active
                ? "bg-card text-success"
                : "bg-background text-muted-foreground"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="h-12" />
    </>
  );
}
