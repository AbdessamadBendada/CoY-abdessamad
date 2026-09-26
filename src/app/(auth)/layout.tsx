import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f7f4ef] lg:grid lg:grid-cols-[minmax(360px,44%)_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#211725] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -right-48 top-1/2 size-[620px] -translate-y-1/2 rounded-full border border-[#f1b84b]/18 shadow-[0_0_0_80px_rgba(241,184,75,.025),0_0_0_160px_rgba(241,184,75,.018)]" aria-hidden="true" />
        <div className="relative z-10"><Logo variant="full" colorScheme="dark" size="md" /></div>
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-[0.66rem] font-semibold uppercase tracking-[.16em] text-[#ff7966]">Intelligence de rétention</p>
          <p className="font-display text-5xl leading-[.98] tracking-[-.035em] xl:text-6xl">Chaque signal mérite d&apos;être vu avant de devenir un silence.</p>
          <div className="mt-8 flex items-center gap-3 text-xs text-white/45"><span className="size-2 rounded-full bg-[#f1b84b]" /> Scoring explicable · Actions contrôlables · Résultats mesurables</div>
        </div>
        <p className="relative z-10 text-[0.65rem] uppercase tracking-[.14em] text-white/28">CoY · Smart Tech, Human Touch</p>
      </aside>

      <section className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <Link href="/" className="absolute left-5 top-5 text-xs font-medium text-[#746974] hover:text-[#eb624f] sm:left-8 sm:top-8">← Retour à l&apos;accueil</Link>
        <div className="w-full max-w-[440px]">{children}</div>
      </section>
    </div>
  );
}
