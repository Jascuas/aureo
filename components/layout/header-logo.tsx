import Link from "next/link";

export const HeaderLogo = () => {
  return (
    <Link href="/" className="hidden items-center lg:flex">
      <span className="font-mono text-2xl leading-none font-bold tracking-tight uppercase select-none">
        <span className="text-muted-foreground">&gt;&nbsp;</span>
        <span className="glow-sm text-foreground">AUREO</span>
        <span className="animate-blink glow-acc text-crt-accent">_</span>
      </span>
    </Link>
  );
};
