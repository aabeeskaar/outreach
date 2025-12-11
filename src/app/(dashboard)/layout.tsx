import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { AccountStatusCheck } from "@/components/account-status-check";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AccountStatusCheck>
            <AnnouncementBanner />
            {children}
          </AccountStatusCheck>
        </main>
      </div>
    </div>
  );
}
