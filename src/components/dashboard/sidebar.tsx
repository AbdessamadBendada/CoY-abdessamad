"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  Users,
  Activity,
  Plug,
  CreditCard,
  Settings,
  Menu,
  X,
  ChevronRight,
  HeadphonesIcon,
} from "lucide-react";

type SidebarUser = {
  firstName: string | null;
  lastName: string | null;
  tenant: {
    name: string;
    plan: string;
    status: string;
  };
};

const NAV_ITEMS = [
  { href: "/overview",     label: "Vue d'ensemble",   icon: LayoutDashboard },
  { href: "/customers",    label: "Clients à risque",  icon: Users },
  { href: "/actions",      label: "Actions en cours",  icon: Activity },
  { href: "/integrations", label: "Intégrations",      icon: Plug },
  { href: "/billing",      label: "Facturation",       icon: CreditCard },
  { href: "/settings",     label: "Paramètres",        icon: Settings },
  { href: "/support",      label: "Support",           icon: HeadphonesIcon },
] as const;

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COY:        { bg: "rgba(217,119,87,0.15)", text: "#D97757", border: "rgba(217,119,87,0.3)" },
  ESSENTIEL:  { bg: "rgba(232,184,75,0.15)",  text: "#E8B84B", border: "rgba(232,184,75,0.3)" },
  STARTER:    { bg: "rgba(232,184,75,0.2)",   text: "#E8B84B", border: "rgba(232,184,75,0.35)" },
  CROISSANCE: { bg: "rgba(232,184,75,0.2)",   text: "#E8B84B", border: "rgba(232,184,75,0.35)" },
  EXPERT:     { bg: "rgba(217,119,87,0.15)", text: "#D97757", border: "rgba(217,119,87,0.3)" },
};

const PLAN_LABELS: Record<string, string> = {
  COY: "CoY",
  ESSENTIEL: "Essentiel",
  STARTER: "Starter",
  CROISSANCE: "Croissance",
  EXPERT: "Expert",
};

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  open,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  open: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={!open ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: open ? "flex-start" : "center",
        gap: "0.65rem",
        padding: open ? "0.55rem 0.75rem" : "0.55rem",
        borderRadius: "0.5rem",
        transition: "background 0.15s, color 0.15s",
        position: "relative",
        color: active ? "#F5F0E8" : "rgba(245,240,232,0.7)",
        background: active ? "#D97757" : "transparent",
        borderLeft: "none",
        textDecoration: "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(245,240,232,0.06)";
          (e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.9)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.7)";
        }
      }}
    >
      <Icon style={{ width: 17, height: 17, flexShrink: 0, color: active ? "#F5F0E8" : "currentColor" }} />
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 500, overflow: "hidden" }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─── SidebarContent (desktop) ─────────────────────────────────────────────────

function SidebarContent({
  user,
  open,
  setOpen,
  onClose,
}: {
  user: SidebarUser;
  open: boolean;
  setOpen: (v: boolean) => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const planColors = PLAN_COLORS[user.tenant.plan] ?? PLAN_COLORS["ESSENTIEL"];
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase() || "?";

  function isActive(href: string) {
    if (href === "/overview") return pathname === "/overview";
    return pathname.startsWith(href);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#2B2523" }}>

      {/* ─── Logo + toggle ────────────────────────────────────────── */}
      <div
        style={{
          padding: "1rem 0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          gap: "0.5rem",
          minHeight: 60,
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: "0.45rem", overflow: "hidden" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3"  fill="none" stroke="#E8B84B" strokeWidth="1.2"/>
                <circle cx="12" cy="12" r="6"  fill="none" stroke="#D97757" strokeWidth="0.8"/>
                <circle cx="12" cy="12" r="10" fill="none" stroke="#E8B84B" strokeWidth="0.6" opacity="0.6"/>
                <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="rgba(217,119,87,0.2)"/>
                <circle cx="12" cy="12" r="1.5" fill="#D97757"/>
              </svg>
              <Logo variant="full" colorScheme="dark" size="md" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Réduire le menu" : "Agrandir le menu"}
          style={{
            width: 28,
            height: 28,
            borderRadius: "0.4rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(148,163,192,0.7)",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(217,119,87,0.15)"; (e.currentTarget as HTMLElement).style.color = "#E8B84B"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(245,240,232,0.6)"; }}
        >
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </motion.div>
        </button>
      </div>

      {/* ─── Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          padding: "0.75rem 0.5rem",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "0.1rem",
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                color: "rgba(245,240,232,0.5)",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.25rem 0.75rem 0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              Navigation
            </motion.p>
          )}
        </AnimatePresence>
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
            open={open}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* ─── User section ────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "0.75rem 0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            gap: "0.6rem",
            padding: "0.6rem 0.5rem",
            borderRadius: "0.5rem",
            background: "rgba(255,255,255,0.03)",
            marginBottom: open ? "0.5rem" : "0.25rem",
            overflow: "hidden",
            transition: "margin 0.2s, justify-content 0.2s",
          }}
        >
          {/* Avatar */}
          <div
            title={!open ? `${user.tenant.name} · ${PLAN_LABELS[user.tenant.plan] ?? user.tenant.plan}` : undefined}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(232,184,75,0.15)",
              border: "1px solid rgba(232,184,75,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#E8B84B",
            }}
          >
            {initials}
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
              >
                <p style={{ color: "rgba(203,213,225,0.9)", fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.tenant.name}
                </p>
                <span
                  style={{
                    display: "inline-block",
                    background: planColors.bg,
                    color: planColors.text,
                    border: `1px solid ${planColors.border}`,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    padding: "0 0.4rem",
                    borderRadius: "9999px",
                    lineHeight: "1.5",
                  }}
                >
                  {PLAN_LABELS[user.tenant.plan] ?? user.tenant.plan}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <LogoutButton collapsed={!open} />
      </div>
    </div>
  );
}

// ─── DashboardSidebar ─────────────────────────────────────────────────────────

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ouvert si épinglé OU survolé (quand fermé)
  const effectiveOpen = desktopOpen || hovered;

  return (
    <>
      {/* ─── Hamburger mobile ───────────────────────────────────── */}
      <button
        style={{
          position: "fixed",
          top: "0.75rem",
          left: "0.75rem",
          zIndex: 50,
          width: 36,
          height: 36,
          borderRadius: "0.4rem",
          background: "rgba(43,37,35,0.92)",
          border: "1px solid rgba(217,119,87,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(148,163,192,0.8)",
        }}
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      {/* ─── Backdrop mobile ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Drawer mobile ──────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : "-100%" }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          zIndex: 50,
          width: 256,
        }}
        className="md:hidden"
      >
        <button
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            zIndex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: "0.35rem",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(148,163,192,0.7)",
          }}
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
        <SidebarContent
          user={user}
          open={true}
          setOpen={() => {}}
          onClose={() => setMobileOpen(false)}
        />
      </motion.aside>

      {/* ─── Sidebar desktop — collapsible + hover expand ───────── */}
      <motion.aside
        className="hidden md:block"
        animate={{ width: effectiveOpen ? 256 : 64 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        onMouseEnter={() => { if (!desktopOpen) setHovered(true); }}
        onMouseLeave={() => setHovered(false)}
        style={{
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "sticky", top: 0, height: "100vh", width: "100%" }}>
          <SidebarContent
            user={user}
            open={effectiveOpen}
            setOpen={setDesktopOpen}
          />
        </div>
      </motion.aside>
    </>
  );
}
