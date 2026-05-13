import { createFileRoute } from "@tanstack/react-router";
import { Building2, FileText, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { MetabasePlaceholder } from "@/components/MetabasePlaceholder";
import { ActivityTable } from "@/components/ActivityTable";
import { SupabaseActivities } from "@/components/SupabaseActivities";
import { useEmpresas, useTodosContratos } from "@/lib/api/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestão do Cuidado" },
      {
        name: "description",
        content:
          "Plataforma de consultoria em gestão de saúde: empresas, contratos, pacientes, interações e financeiro em tempo real.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const empresas = useEmpresas();
  const contratos = useTodosContratos();

  const totalEmpresas = empresas.data?.length ?? 0;
  const ativos = (contratos.data ?? []).filter(
    (c) => (c.status_contrato ?? "").toLowerCase() === "ativo",
  ).length;
  const receitaTotal = (contratos.data ?? []).reduce(
    (acc, c) => acc + Number(c.valor_acordado ?? 0),
    0,
  );

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // central command
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Painel de Inteligência</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da operação em tempo real conectada à API.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Empresas"
            value={empresas.isLoading ? "…" : String(totalEmpresas)}
            delta={`${totalEmpresas}`}
            trend="up"
            helper="clientes ativos na base"
            icon={Building2}
          />
          <MetricCard
            label="Contratos Ativos"
            value={contratos.isLoading ? "…" : String(ativos)}
            delta={`${contratos.data?.length ?? 0}`}
            trend="up"
            helper="total no portfólio"
            icon={FileText}
          />
          <MetricCard
            label="Receita Acordada"
            value={
              contratos.isLoading
                ? "…"
                : receitaTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })
            }
            delta="ROI"
            trend="up"
            helper="soma dos contratos"
            icon={Wallet}
          />
        </div>

        <MetabasePlaceholder />

        <ActivityTable />

        <SupabaseActivities />
      </div>
    </DashboardLayout>
  );
}
