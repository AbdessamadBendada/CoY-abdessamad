import Link from "next/link";
import { ArrowRight, Check, MessagesSquare, Radar, Sparkles, Store } from "lucide-react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

const STEPS = [
  { n: "01", title: "Connecter", text: "Reliez votre boutique et votre support client. CoY rassemble commandes, profils et signaux de satisfaction." },
  { n: "02", title: "Comprendre", text: "Chaque client reçoit un score explicable. Les risques élevés remontent avant que le silence ne devienne un départ." },
  { n: "03", title: "Agir", text: "Préparez une action personnalisée, relisez-la, programmez-la et suivez le revenu réellement récupéré." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ef] text-[#241d25]">
      <Navbar />

      <section className="relative mx-auto grid min-h-[820px] max-w-[1440px] items-center gap-12 px-5 pb-20 pt-28 lg:grid-cols-[1.02fr_.98fr] lg:px-12">
        <div className="relative z-10 max-w-3xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfd4d1] bg-white/70 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#9a453a] shadow-sm">
            <span className="size-1.5 rounded-full bg-[#eb624f]" /> Intelligence de rétention
          </p>
          <h1 className="font-display text-[clamp(3.6rem,7.5vw,7.6rem)] leading-[0.88] tracking-[-0.055em] text-[#211725]">
            Voyez le départ<br />
            <em className="font-normal text-[#eb624f]">avant l&apos;absence.</em>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[#716672] sm:text-lg">
            CoY transforme les signaux faibles de votre commerce en décisions claires : qui risque de partir, pourquoi, et quelle action mérite votre attention aujourd&apos;hui.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#211725] px-6 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(33,23,37,.18)] hover:-translate-y-0.5 hover:bg-[#342438]">
              Commencer l&apos;essai <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d9cdca] bg-white/70 px-6 text-sm font-semibold text-[#342438] hover:border-[#bcaeB8] hover:bg-white">
              Ouvrir mon espace
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#80747e]">
            {["21 jours d'essai", "Validation humaine possible", "Opt-out intégré"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-3.5 text-[#47775f]" />{item}</span>)}
          </div>
        </div>

        <div className="relative lg:pl-6">
          <div className="absolute -inset-20 rounded-full bg-[#f1b84b]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#211725] p-5 text-white shadow-[0_32px_80px_rgba(33,23,37,.24)] sm:p-7">
            <div className="flex items-center justify-between border-b border-white/8 pb-5">
              <div><p className="text-[0.62rem] uppercase tracking-[0.15em] text-white/45">Vue d&apos;ensemble</p><p className="mt-1 font-display text-2xl">Bonjour, Léa.</p></div>
              <span className="rounded-full border border-[#f1b84b]/25 bg-[#f1b84b]/10 px-3 py-1 text-[0.62rem] uppercase tracking-wider text-[#f5c866]">Plan CoY</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4 sm:col-span-2"><p className="text-[0.62rem] uppercase tracking-[.12em] text-white/45">CA récupéré</p><p className="mt-2 font-display text-5xl text-[#f6be54]">12 480 €</p><p className="mt-2 text-xs text-[#95c8ad]">↗ 18,4 % ce mois</p></div>
              <div className="rounded-2xl bg-[#eb624f] p-4"><p className="text-[0.62rem] uppercase tracking-[.12em] text-white/70">À risque</p><p className="mt-2 font-display text-5xl">24</p><p className="mt-2 text-xs text-white/70">6 profils aujourd&apos;hui</p></div>
            </div>
            <div className="mt-3 rounded-2xl bg-[#fffdf9] p-5 text-[#241d25]">
              <div className="flex items-center justify-between"><div><p className="font-display text-2xl">Priorités du jour</p><p className="text-xs text-[#938890]">3 signaux demandent une décision</p></div><Radar className="size-5 text-[#eb624f]" /></div>
              <div className="mt-5 space-y-3">
                {["6 clients passent en risque critique", "Une baisse de fréquence sur le segment Fidèles", "4 actions prêtes pour validation"].map((item, index) => <div key={item} className="flex items-center gap-3 border-t border-[#eee6e2] pt-3 first:border-0 first:pt-0"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${index === 0 ? "bg-[#fbe4df] text-[#b8473f]" : "bg-[#f8edd4] text-[#a27018]"}`}>{index + 1}</span><p className="text-xs font-semibold leading-5">{item}</p></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="methode" className="border-y border-[#e6ddda] bg-[#fffdf9] px-5 py-24 lg:px-12">
        <div className="mx-auto max-w-[1340px]">
          <p className="app-page-kicker">Une méthode, pas une boîte noire</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-2"><h2 className="max-w-2xl font-display text-5xl leading-[.98] tracking-[-.035em] text-[#211725] sm:text-6xl">Du signal faible à l&apos;action juste.</h2><p className="max-w-xl self-end leading-7 text-[#716672]">CoY organise votre travail de rétention en trois temps lisibles. Chaque étape reste vérifiable par votre équipe.</p></div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[#e6ddda] bg-[#e6ddda] md:grid-cols-3">
            {STEPS.map((step) => <article key={step.n} className="bg-[#fffdf9] p-7 sm:p-9"><p className="font-display text-4xl text-[#eb624f]">{step.n}</p><h3 className="mt-8 font-display text-3xl text-[#211725]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[#756a73]">{step.text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="integrations" className="px-5 py-24 lg:px-12">
        <div className="mx-auto max-w-[1340px] rounded-[2rem] bg-[#211725] px-6 py-14 text-white sm:px-12 lg:grid lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div><p className="text-[0.65rem] font-semibold uppercase tracking-[.15em] text-[#ff7966]">Écosystème</p><h2 className="mt-4 font-display text-5xl leading-none">Vos outils parlent enfin le même langage.</h2><p className="mt-5 max-w-md text-sm leading-6 text-white/55">Commerce, support, paiement et messagerie restent dans leurs services dédiés. CoY orchestre les signaux et conserve une trace claire des décisions.</p></div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-0">
            {[{ icon: Store, title: "Shopify, WooCommerce, PrestaShop", text: "Commandes et profils clients." }, { icon: MessagesSquare, title: "Gorgias & Crisp", text: "Conversations et signaux d'insatisfaction." }, { icon: Sparkles, title: "Mistral AI", text: "Scoring et génération contextualisée." }, { icon: Radar, title: "Brevo & Trigger.dev", text: "Envois, suivi et traitements planifiés." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-white/9 bg-white/5 p-5"><Icon className="size-5 text-[#f1b84b]" /><p className="mt-6 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-white/45">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 text-center lg:px-12"><div className="mx-auto max-w-3xl"><p className="app-page-kicker">Prêt à regarder au bon endroit ?</p><h2 className="mt-3 font-display text-5xl leading-none tracking-[-.035em] text-[#211725] sm:text-6xl">Transformez le prochain risque en relation sauvée.</h2><Link href="/register" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#eb624f] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(235,98,79,.22)] hover:-translate-y-0.5 hover:bg-[#ce4f3f]">Créer mon espace <ArrowRight className="size-4" /></Link></div></section>
      <Footer />
    </main>
  );
}
