import { redirect } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function DashboardPage() {
  // This page should never be directly accessed. Redirect to org or project dashboard.
  // You may want to fetch the user's org/project id from context or session.
  // For now, just redirect to /dashboard/org (could be improved to use actual org id)
  redirect("/dashboard/org");
}
