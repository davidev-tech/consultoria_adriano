import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"; // <-- Importamos o useState
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ActivityTable } from "@/components/ActivityTable";
import { useEmpresas } from "@/lib/api/hooks"; 
import { Building2, FileText, Wallet, ExternalLink, BarChart3, PieChart, TrendingUp } from "lucide-react";

// 📋 LISTA DE DASHBOARDS (COLE SEUS LINKS AQUI)
// Você pode adicionar quantas opções quiser copiando e colando os blocos abaixo.
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
  
  // Controle de estado para saber qual aba está selecionada (Começa com a primeira da lista)
  const [dashboardAtivo, setDashboardAtivo] = useState(DASHBOARDS[0]);
  
  const empresas = (empresasData as any[]) || [];
  console.log("CONTRATOS DA PRIMEIRA EMPRESA:", empresas[0]?.contratos);
  const totalEmpresas = empresas.length;

 
// 1. CÁLCULO DE CONTRATOS ATIVOS (Com trim() para limpar espaços invisíveis)
  const totalContratosAtivos = empresas.reduce((acc: number, empresa: any) => {
    if (empresa.contratos && Array.isArray(empresa.contratos)) {
      const ativosNaEmpresa = empresa.contratos.filter(
        (c: any) => c.status_contrato?.trim().toLowerCase() === "ativo"
      ).length;
      return acc + ativosNaEmpresa;
    }
    return acc;
  }, 0);

  // 2. CÁLCULO DE RECEITA ACORDADA (Com conversor inteligente de números)
  const receitaTotal = empresas.reduce((acc: number, empresa: any) => {
    let somaContratos = 0;
    
    if (empresa.contratos && Array.isArray(empresa.contratos)) {
      somaContratos = empresa.contratos.reduce((soma: number, contrato: any) => {
        // Verifica se é ativo, removendo espaços em branco acidentais do banco
        if (contrato.status_contrato?.trim().toLowerCase() === "ativo") {
          
          // Tenta converter o valor. Se vier "1500,00", ele troca por "1500.00" para o JS conseguir somar
          let valorConvertido = Number(contrato.valor_acordado);
          if (isNaN(valorConvertido)) {
            valorConvertido = Number(String(contrato.valor_acordado || 0).replace(",", "."));
          }
          
          return soma + (valorConvertido || 0);
        }
        return soma;
      }, 0);
    }
    
    return acc + somaContratos;
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
            value={totalContratosAtivos.toString()} 
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

        {/* SEÇÃO DO METABASE COM ABAS DE NAVEGAÇÃO */}
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

          {/* BOTÕES DAS ABAS */}
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

          {/* IFRAME DINÂMICO */}
          <div className="w-full min-h-[500px] bg-white">
            <iframe
              key={dashboardAtivo.id} // Isso força o React a recarregar o iframe bonitinho ao trocar de aba
              src={dashboardAtivo.url}
              className="w-full min-h-[500px] border-0"
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