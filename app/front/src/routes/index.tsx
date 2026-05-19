import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ActivityTable } from "@/components/ActivityTable";
import { useEmpresas } from "@/lib/api/hooks"; 
import { Building2, FileText, Wallet, ExternalLink } from "lucide-react";

// COLE O SEU LINK PÚBLICO DO METABASE AQUI:
const METABASE_PUBLIC_URL = "http://localhost:3000/public/dashboard/88bb52ea-3b82-4d49-a515-28debf905211"; 

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: empresasData, isLoading: empresasLoading } = useEmpresas();
  
  const empresas = (empresasData as any[]) || [];
  const totalEmpresas = empresas.length;

  const ativos = empresas.filter((e: any) => e.status?.toLowerCase() === "ativo" || e.status_contrato?.toLowerCase() === "ativo").length;
  
  const receitaTotal = empresas.reduce((acc: number, e: any) => {
    return acc + Number(e.valor_acordado || e.faturamento || 0);
  }, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // central command
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Painel de Inteligência
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da operação em tempo real conectada à API.
          </p>
        </div>

        {/* GRID DE METRIC CARDS */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Empresas"
            isLoading={empresasLoading}
            value={totalEmpresas.toString()}
            trend="up"
            helper="clientes ativos na base"
            icon={Building2}
          />
          <MetricCard
            label="Contratos Ativos"
            isLoading={empresasLoading}
            value={ativos > 0 ? ativos.toString() : totalEmpresas.toString()}
            trend="up"
            helper="total no portfólio"
            icon={FileText}
          />
          <MetricCard
            label="Receita Acordada"
            isLoading={empresasLoading}
            value={receitaTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            })}
            trend="up"
            helper="soma estimada"
            icon={Wallet}
          />
        </div>

        {/* SEÇÃO DO METABASE COM LINK PÚBLICO (NÃO EXPIRA) */}
        <section className="rounded-lg border border-border bg-card shadow-card overflow-hidden w-full mt-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Dashboard Analítico</h2>
              <p className="text-xs text-muted-foreground">
                BI integrado nativamente
              </p>
            </div>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-3 w-3" /> Abrir Metabase
            </a>
          </div>

          <div className="w-full min-h-[480px] bg-white">
            <iframe
              src={METABASE_PUBLIC_URL}
              className="w-full min-h-[480px] border-0"
              allowTransparency
            />
          </div>
        </section>

        {/* TABELA INFERIOR */}
        <div className="grid gap-6 md:grid-cols-1">
          <ActivityTable />
        </div>
      </div>
    </DashboardLayout>
  );
}