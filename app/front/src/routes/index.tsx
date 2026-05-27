import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ActivityTable } from "@/components/ActivityTable";
import { useEmpresas, useTodosContratos } from "@/lib/api/hooks"; 
import { Building2, FileText, Wallet, ExternalLink, BarChart3, PieChart, TrendingUp } from "lucide-react";

const DASHBOARDS = [
  {
    id: "geral",
    nome: "Visão Geral",
    icon: BarChart3,
    url: "http://localhost:3000/public/dashboard/174b6582-fbd5-4893-8dbc-7ec9324758a8",
  },
  {
    id: "financeiro",
    nome: "Métricas Financeiras",
    icon: PieChart,
    url: "http://localhost:3000/public/dashboard/76306c6a-b1a0-4d2a-8829-d553769e801a",
  },
  {
    id: "crescimento",
    nome: "Funil & Crescimento",
    icon: TrendingUp,
    url: "http://localhost:3000/public/dashboard/88bb52ea-3b82-4d49-a515-28debf905211",
  }
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: empresasData, isLoading: empresasLoading } = useEmpresas();
  const { data: todosContratos, isLoading: contratosLoading } = useTodosContratos();
  
  const [dashboardAtivo, setDashboardAtivo] = useState(DASHBOARDS[0]);
  
  const empresas = (empresasData as any[]) || [];
  const totalEmpresas = empresas.length;

  // ✅ CORRIGIDO: Filtra contratos ativos
  const contratosAtivos = todosContratos?.filter(
    (c: any) => {
      const status = (c.status_contrato || "").toString().trim().toLowerCase();
      return status === "ativo";
    }
  ) || [];

  const totalContratosAtivos = contratosAtivos.length;

  // ✅ CORRIGIDO: Calcula receita SOMENTE dos contratos ativos
  const receitaTotal = contratosAtivos.reduce((acc: number, contrato: any) => {
    // Converte o valor para número (tratando formato brasileiro)
    let valor = contrato.valor_acordado;
    
    if (typeof valor === 'string') {
      // Remove pontos de milhar e substitui vírgula por ponto
      valor = valor.replace(/\./g, '').replace(',', '.');
    }
    
    const valorNumerico = Number(valor);
    
    if (isNaN(valorNumerico)) {
      console.warn('Valor inválido encontrado:', contrato.valor_acordado);
      return acc;
    }
    
    return acc + valorNumerico;
  }, 0);

  // Debug: Verificar os contratos no console
  console.log('📊 DEBUG RECEITA:', {
    totalContratos: todosContratos?.length || 0,
    contratosAtivos: contratosAtivos.length,
    receitaCalculada: receitaTotal,
    amostra: contratosAtivos.slice(0, 2).map((c: any) => ({
      id: c.id_contrato,
      status: c.status_contrato,
      valor: c.valor_acordado
    }))
  });

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
            Visão geral da operação em tempo real.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total de Empresas"
            isLoading={empresasLoading}
            value={totalEmpresas.toString()}
            delta={`+${totalEmpresas}`}
            trend="up"
            helper="clientes ativos na base"
            icon={Building2}
          />
          <MetricCard
            label="Contratos Ativos"
            isLoading={contratosLoading}
            value={totalContratosAtivos.toString()}
            delta={`+${totalContratosAtivos}`}
            trend="up"
            helper="total no portfólio"
            icon={FileText}
          />
          <MetricCard
            label="Receita Acordada"
            isLoading={contratosLoading}
            value={receitaTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 2,
            })}
            delta="+12.5%"
            trend="up"
            helper="soma dos contratos ativos"
            icon={Wallet}
          />
        </div>


        {/* SEÇÃO DO METABASE */}
        <section className="rounded-lg border border-border bg-card shadow-card overflow-hidden w-full mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border px-5 py-4 gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Dashboard Analítico</h2>
              <p className="text-xs text-muted-foreground">
                Selecione a visão que deseja analisar
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

          <div className="bg-muted/30 px-5 py-3 border-b border-border flex flex-wrap gap-2">
            {DASHBOARDS.map((dash) => {
              const Icone = dash.icon;
              const isAtivo = dashboardAtivo.id === dash.id;
              
              return (
                <button
                  key={dash.id}
                  onClick={() => setDashboardAtivo(dash)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isAtivo 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <Icone className="h-4 w-4" />
                  {dash.nome}
                </button>
              );
            })}
          </div>

          <div className="w-full min-h-[500px] bg-white">
            <iframe
              key={dashboardAtivo.id}
              src={dashboardAtivo.url}
              className="w-full min-h-[500px] border-0"
              allowTransparency
            />
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-1">
          <ActivityTable />
        </div>
      </div>
    </DashboardLayout>
  );
}