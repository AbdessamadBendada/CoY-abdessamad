import { CoyIllustration } from "@/components/coy-illustration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="auth-theme"
      style={{
        minHeight: "100dvh",
        background: "#F5F0E8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ─── Radar Solaire SVG — décoration fond atténuée ─── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <svg
          className="radar-bg"
          width="640"
          height="640"
          viewBox="0 0 640 640"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="320" cy="320" r="64"  fill="none" stroke="#E8B84B" strokeWidth="1"   opacity="0.7"/>
          <circle cx="320" cy="320" r="128" fill="none" stroke="#D97757" strokeWidth="1"   opacity="0.55"/>
          <circle cx="320" cy="320" r="192" fill="none" stroke="#E8B84B" strokeWidth="0.8" opacity="0.45"/>
          <circle cx="320" cy="320" r="256" fill="none" stroke="#D97757" strokeWidth="0.8" opacity="0.35"/>
          <circle cx="320" cy="320" r="308" fill="none" stroke="#E8B84B" strokeWidth="0.6" opacity="0.25"/>
          <line x1="320" y1="12"  x2="320" y2="628" stroke="#E8B84B" strokeWidth="0.5" opacity="0.2"/>
          <line x1="12"  y1="320" x2="628" y2="320" stroke="#E8B84B" strokeWidth="0.5" opacity="0.2"/>
          <line x1="94"  y1="94"  x2="546" y2="546" stroke="#E8B84B" strokeWidth="0.4" opacity="0.15"/>
          <line x1="546" y1="94"  x2="94"  y2="546" stroke="#E8B84B" strokeWidth="0.4" opacity="0.15"/>
          <path d="M320 320 L320 12 A308 308 0 0 1 628 320 Z" fill="rgba(217,119,87,0.06)"/>
        </svg>
      </div>

      {/* ─── Contenu formulaire centré ─────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2rem 1.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* ─── CoY mascotte — desktop uniquement ─────────────── */}
      <div
        className="coy-bee"
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          opacity: 0.85,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <CoyIllustration size={90} />
      </div>

      <style>{`
        .radar-bg {
          opacity: 0.045;
          animation: radar-spin 20s linear infinite;
          transform-origin: center;
        }
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .coy-bee { display: none; }
        @media (min-width: 768px) {
          .coy-bee {
            display: block;
            transition: opacity 300ms ease;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-bg { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
