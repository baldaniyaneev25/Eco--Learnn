import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = { title: { default: "Admin", template: "%s · EcoLearn Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
