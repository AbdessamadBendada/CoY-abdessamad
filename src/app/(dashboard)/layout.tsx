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
    <div className="app-shell flex h-dvh overflow-hidden">
      <DashboardSidebar user={sidebarUser} />

      <div className="flex-1 flex flex-col min-w-0">
        {!hasDpa && <DpaPendingBanner />}

        {/* Barre supérieure mobile */}
        <div className="mobile-app-bar h-14 items-center px-4 md:hidden">
          <span className="ml-11 text-sm font-semibold">CoY · Intelligence client</span>
        </div>

        <main className="dashboard-content flex-1 overflow-auto">
          <ScrollReveal />
          {children}
        </main>
      </div>
    </div>
  );
}
