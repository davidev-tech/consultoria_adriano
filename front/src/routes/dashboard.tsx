import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardExecutivo } from "@/components/DashboardExecutivo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ title: "Dashboard Executivo - Gestão do Cuidado" }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardExecutivo />
    </DashboardLayout>
  );
}