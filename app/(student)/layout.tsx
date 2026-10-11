import { StudentShell } from "@/components/student/StudentShell";

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return <StudentShell>{children}</StudentShell>;
}
