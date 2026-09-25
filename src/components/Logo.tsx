import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  variant?: "full" | "compact" | "icon-only";
  colorScheme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  href?: string;
};

const MASCOT_PX = { sm: 20, md: 32, lg: 80 };

const TEXT = {
  sm: { wordmark: "0.92rem", subtitle: "0.78rem", gap: "0.3rem" },
  md: { wordmark: "1.2rem",  subtitle: "0.88rem", gap: "0.35rem" },
  lg: { wordmark: "1.5rem",  subtitle: "0.95rem", gap: "0.4rem" },
};

// light = fond crème → texte #2B2523 (texte sombre sur fond clair)
// dark  = fond sombre → texte #F5F0E8 (texte clair sur fond sombre)
const COLOR = {
  light: { wordmark: "#2B2523",   sep: "rgba(43,37,35,0.4)",     subtitle: "rgba(43,37,35,0.6)" },
  dark:  { wordmark: "#F5F0E8",   sep: "rgba(245,240,232,0.45)", subtitle: "rgba(245,240,232,0.5)" },
};

export function Logo({
  variant = "full",
  colorScheme = "light",
  size = "md",
  href,
}: LogoProps) {
  const mascotPx = MASCOT_PX[size];
  const t = TEXT[size];
  const c = COLOR[colorScheme];

  const mascotteEl = (
    <Image
      src="/images/coy-mascot.png"
      alt="CoY"
      width={mascotPx}
      height={mascotPx}
      priority
      style={{ objectFit: "contain", flexShrink: 0 }}
    />
  );

  const wordmarkEl = (
    <span
      style={{
        fontFamily: "var(--font-heading)",
        fontStyle: "italic",
        fontWeight: 600,
        fontSize: t.wordmark,
        color: c.wordmark,
        letterSpacing: "-0.01em",
        lineHeight: 1,
      }}
    >
      CoY
    </span>
  );

  let inner: React.ReactNode;

  if (variant === "icon-only") {
    inner = mascotteEl;
  } else if (variant === "compact") {
    inner = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: t.gap }}>
        {mascotteEl}
        {wordmarkEl}
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 400,
            fontSize: t.subtitle,
            color: c.sep,
            lineHeight: 1,
          }}
        >
          ·
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            fontSize: t.subtitle,
            color: c.subtitle,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Winback Agent
        </span>
      </span>
    );
  } else {
    // full : mascotte + "CoY" — colonne si lg, ligne si sm/md
    inner = (
      <span
        style={{
          display: "inline-flex",
          flexDirection: size === "lg" ? "column" : "row",
          alignItems: "center",
          gap: size === "lg" ? "0.5rem" : t.gap,
        }}
      >
        {mascotteEl}
        {wordmarkEl}
      </span>
    );
  }

  if (href) {
    return (
      <Link href={href} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return <>{inner}</>;
}
