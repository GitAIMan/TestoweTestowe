import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PanelContent } from "@/components/layout/panel-content";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <PanelContent userRole={session.user.role}>{children}</PanelContent>;
}
