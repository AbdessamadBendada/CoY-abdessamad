export const dynamic = "force-dynamic";


import { requireAuth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DpaPendingBanner } from "@/components/dashboard/dpa-pending-banner";
import { ScrollReveal } from "@/components/dashboard/scroll-reveal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const hasDpa = !!user.tenant.dpaSignedAt;

  const sidebarUser = {
    firstName: user.firstName,
    lastName: user.lastName,
    tenant: {
      name: user.tenant.name,
      plan: user.tenant.plan,
      status: user.tenant.status,
    },
  };

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "#F8F7F4" }}>
      <DashboardSidebar user={sidebarUser} />

      <div className="flex-1 flex flex-col min-w-0">
        {!hasDpa && <DpaPendingBanner />}

        {/* Barre supérieure mobile */}
        <div
          className="h-12 flex items-center px-4 md:hidden"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fff" }}
        >
          <span className="ml-10 font-semibold text-sm" style={{ color: "#2B2523" }}>CoY</span>
        </div>

        <main className="dashboard-content flex-1 p-5 overflow-auto">
          <ScrollReveal />
          {children}
        </main>
      </div>
    </div>
  );
}
