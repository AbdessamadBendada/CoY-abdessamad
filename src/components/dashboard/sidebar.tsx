"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronLeft, CreditCard, HeadphonesIcon, LayoutDashboard, Menu, Plug, Settings, Users, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/auth/logout-button";

type SidebarUser = {
  firstName: string | null;
  lastName: string | null;
  tenant: { name: string; plan: string; status: string };
};

const NAV_GROUPS = [
  { label: "Pilotage", items: [
    { href: "/overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { href: "/customers", label: "Clients à risque", icon: Users },
    { href: "/actions", label: "Actions en cours", icon: Activity },
  ]},
  { label: "Configuration", items: [
    { href: "/integrations", label: "Intégrations", icon: Plug },
    { href: "/billing", label: "Facturation", icon: CreditCard },
    { href: "/settings", label: "Paramètres", icon: Settings },
    { href: "/support", label: "Support", icon: HeadphonesIcon },
  ]},
] as const;

const PLAN_LABELS: Record<string, string> = {
  COY: "CoY", ESSENTIEL: "Essentiel", STARTER: "Starter", CROISSANCE: "Croissance", EXPERT: "Expert",
};

function SidebarContent({ user, expanded, onToggle, onNavigate }: {
  user: SidebarUser;
  expanded: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const initials = [user.firstName, user.lastName].filter(Boolean).map((name) => name![0]).join("").toUpperCase() || "?";
  const active = (href: string) => href === "/overview" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-[#211725] text-[#f8f0ec]">
      <div className="flex min-h-20 items-center justify-between border-b border-white/8 px-4">
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="flex items-center gap-2 overflow-hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#f1b84b]/30 bg-[#f1b84b]/10">
                <span className="size-2 rounded-full bg-[#eb624f] shadow-[0_0_0_5px_rgba(235,98,79,0.13)]" />
              </span>
              <Logo variant="full" colorScheme="dark" size="md" />
            </motion.div>
          )}
        </AnimatePresence>
        {onToggle && (
          <button type="button" onClick={onToggle} aria-label={expanded ? "Réduire le menu" : "Agrandir le menu"} className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white">
            <motion.span animate={{ rotate: expanded ? 0 : 180 }}><ChevronLeft className="size-4" /></motion.span>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5" aria-label="Navigation principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {expanded && <p className="mb-2 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = active(href);
                return (
                  <Link key={href} href={href} onClick={onNavigate} title={expanded ? undefined : label} aria-current={isActive ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center rounded-xl transition-colors ${expanded ? "gap-3 px-3" : "justify-center px-2"} ${isActive ? "bg-[#eb624f]/15 text-white" : "text-white/62 hover:bg-white/6 hover:text-white"}`}>
                    {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#eb624f]" />}
                    <Icon className={`size-[18px] shrink-0 ${isActive ? "text-[#ff7966]" : "text-white/50 group-hover:text-white/80"}`} />
                    {expanded && <span className="truncate text-[0.82rem] font-medium">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className={`mb-2 flex items-center rounded-xl bg-white/5 p-2 ${expanded ? "gap-2.5" : "justify-center"}`}>
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-[#f1b84b]/25 bg-[#f1b84b]/10 text-[0.68rem] font-bold text-[#f1c369]">{initials}</div>
          {expanded && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white/90">{user.tenant.name}</p><p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-[#f1c369]">{PLAN_LABELS[user.tenant.plan] ?? user.tenant.plan}</p></div>}
        </div>
        <LogoutButton collapsed={!expanded} />
      </div>
    </div>
  );
}

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="fixed left-3 top-3 z-50 grid size-9 place-items-center rounded-xl border border-white/10 bg-[#211725] text-white shadow-lg md:hidden"><Menu className="size-[18px]" /></button>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button type="button" aria-label="Fermer le menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[#160f18]/65 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 320 }} className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl md:hidden">
              <button type="button" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 z-10 grid size-8 place-items-center rounded-lg bg-white/8 text-white/70"><X className="size-4" /></button>
              <SidebarContent user={user} expanded onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <motion.aside animate={{ width: expanded ? 244 : 72 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="hidden shrink-0 overflow-hidden border-r border-black/10 md:block">
        <SidebarContent user={user} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
      </motion.aside>
    </>
  );
}
