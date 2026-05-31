import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { AcoesSugeridas } from "@/components/AcoesSugeridas";
import { ActivityTable } from "@/components/ActivityTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmpresas, useTodosContratos,useModelos } from "@/lib/api/hooks";
import { Building2, FileText, Wallet, BarChart3, PieChart, TrendingUp, FilterX } from "lucide-react";
import {
  ScoreCard,
  InteracoesPorEmpresa,
  StatusPagamentoRosca,
  FinanceiroBarras,
  StatusContratoColumnChart,
  PivotTable,
} from "@/components/AnalyticsCharts";



const DASHBOARDS = [
  { id: "geral", nome: "Visão Geral", icon: BarChart3 },
  { id: "financeiro", nome: "Métricas Financeiras", icon: PieChart },
  { id: "crescimento", nome: "Funil & Crescimento", icon: TrendingUp },
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: empresasData, isLoading: empresasLoading } = useEmpresas();
  const { data: todosContratos, isLoading: contratosLoading } = useTodosContratos();
  const { data: modelos } = useModelos();
  const [dashboardAtivo, setDashboardAtivo] = useState(DASHBOARDS[0]);

  // Filtros globais
  const [filtroNome, setFiltroNome] = useState<string[]>([]);
  const [filtroCnpj, setFiltroCnpj] = useState<string[]>([]);
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroServico, setFiltroServico] = useState<string[]>([]);

  const empresas = (empresasData as any[]) || [];
  const contratos = todosContratos || [];
  
  // Aplicar filtros nas empresas
  
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((e) => {
      if (filtroNome.length && !filtroNome.includes(e.nome_empresa)) return false;
      if (filtroCnpj.length && !filtroCnpj.includes(e.cnpj)) return false;
      if (filtroCidade && !e.localizacao_cidade?.toLowerCase().includes(filtroCidade.toLowerCase())) return false;
      if (filtroServico.length) {
        const servicos = e.servicos_contratados?.map((s: any) => s.tipo_servico) || [];
        if (!filtroServico.some((fs: string) => servicos.includes(fs))) return false;
      }
      return true;
    });
  }, [empresas, filtroNome, filtroCnpj, filtroCidade, filtroServico]);

  // Métricas superiores (consideram filtro)
  const totalEmpresas = empresasFiltradas.length;

  // Contratos ativos filtrados pelas empresas filtradas
  const idsEmpresasFiltradas = new Set(empresasFiltradas.map(e => e.id_cliente));
  const contratosAtivos = contratos.filter(
    (c: any) =>
      idsEmpresasFiltradas.has(c.id_cliente) &&
      (c.status_contrato || "").toString().trim().toLowerCase() === "ativo"
  );

  const totalContratosAtivos = contratosAtivos.length;
  const modeloMap = useMemo(() => {
  const map: Record<string, string> = {};
  if (modelos) {
    modelos.forEach((m: any) => {
      map[m.id_modelo] = m.nome_modelo;
    });
  }
  return map;
}, [modelos]);
  const todosContratosFiltrados = useMemo(
    () => empresasFiltradas.flatMap(e => e.contratos || []),
    [empresasFiltradas]
  );
  const receitaTotal = contratosAtivos.reduce((acc: number, contrato: any) => {
    let valor = contrato.valor_acordado;
    if (typeof valor === "string") valor = valor.replace(/\./g, "").replace(",", ".");
    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico)) return acc;
    return acc + valorNumerico;
  }, 0);

  // ==================== DADOS PARA GRÁFICOS ====================
  // Visão Geral
  const todasInteracoes = useMemo(
    () => empresasFiltradas.flatMap((e: any) => e.interacoes || []),
    [empresasFiltradas]
  );
  const totalInteracoes = todasInteracoes.length;
  const ultimos30dias = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    return todasInteracoes.filter((i: any) => i.data_hora && new Date(i.data_hora) >= limite).length;
  }, [todasInteracoes]);

  const interacoesPorEmpresa = useMemo(() => {
    const map: Record<string, number> = {};
    empresasFiltradas.forEach((e: any) => {
      map[e.nome_empresa] = (e.interacoes || []).length;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [empresasFiltradas]);

  // Financeiro
  const todosPagamentos = useMemo(
    () =>
      contratosAtivos.flatMap((c: any) => c.pagamentos || []),
    [contratosAtivos]
  );
  const totalPagamentos = todosPagamentos.length;
  const pagamentosPendentes = todosPagamentos.filter((p: any) => p.status_pagamento === "Pendente").length;
  const statusPagamentoData = [
    { name: "Pago", value: totalPagamentos - pagamentosPendentes },
    { name: "Pendente", value: pagamentosPendentes },
  ];

  const financeiroBarrasData = useMemo(() => {
    const agrupado: Record<string, { soma: number; count: number }> = {};
    contratosAtivos.forEach((c: any) => {
      const status = c.status_contrato || "Desconhecido";
      if (!agrupado[status]) agrupado[status] = { soma: 0, count: 0 };
      agrupado[status].soma += Number(c.valor_acordado) || 0;
      agrupado[status].count += 1;
    });
    return Object.entries(agrupado).map(([status, { soma, count }]) => ({
      status,
      soma,
      media: count ? soma / count : 0,
    }));
  }, [contratosAtivos]);

  // Lista de opções únicas para os filtros
  const nomesEmpresas = useMemo(() => [...new Set(empresas.map((e: any) => e.nome_empresa))], [empresas]);
  const cnpjs = useMemo(() => [...new Set(empresas.map((e: any) => e.cnpj).filter(Boolean))], [empresas]);
  const servicosUnicos = useMemo(
    () => [...new Set(empresas.flatMap((e: any) => e.servicos_contratados?.map((s: any) => s.tipo_servico) || []))],
    [empresas]
  );
  // Total de contratos (scorecard)
const totalContratos = todosContratosFiltrados.length;

// Contagem por status
const contratosPorStatus = useMemo(() => {
  const contagem: Record<string, number> = { Arquivado: 0, Ativo: 0, Encerrado: 0 };
  todosContratosFiltrados.forEach((c: any) => {
    const status = c.status_contrato || "Desconhecido";
    contagem[status] = (contagem[status] || 0) + 1;
  });
  return Object.entries(contagem).map(([status, count]) => ({ status, count }));
}, [todosContratosFiltrados]);

// Dados financeiros por status (soma e média)
const financeiroPorStatus = useMemo(() => {
  const agrupado: Record<string, { soma: number; count: number }> = {};
  todosContratosFiltrados.forEach((c: any) => {
    const status = c.status_contrato || "Desconhecido";
    if (!agrupado[status]) agrupado[status] = { soma: 0, count: 0 };
    agrupado[status].soma += Number(c.valor_acordado) || 0;
    agrupado[status].count += 1;
  });
  return Object.entries(agrupado).map(([status, { soma, count }]) => ({
    status,
    soma,
    media: count ? soma / count : 0,
  }));
}, [todosContratosFiltrados]);

// Tabela "Responsáveis do Contrato" (por empresa)
const dadosPorEmpresa = useMemo(() => {
  const map: Record<string, Record<string, number>> = {};
  const linhas = empresasFiltradas.map(e => {
    const id = e.id_cliente;
    map[id] = { Arquivado: 0, Ativo: 0, Encerrado: 0 };
    (e.contratos || []).forEach((c: any) => {
      const status = c.status_contrato || "Desconhecido";
      if (map[id][status] !== undefined) map[id][status]++;
    });
    return { id, nome: e.nome_empresa };
  });
  return { linhas, dados: map };
}, [empresasFiltradas]);

// Tabela "Clientes do Contrato" (por modelo)
const dadosPorModelo = useMemo(() => {
  const map: Record<string, Record<string, number>> = {};
  const idsModelos = [...new Set(todosContratosFiltrados.map((c: any) => c.id_modelo).filter(Boolean))];
  const linhas = idsModelos.map(id => {
    map[id] = { Arquivado: 0, Ativo: 0, Encerrado: 0 };
    todosContratosFiltrados.forEach((c: any) => {
      if (c.id_modelo === id) {
        const status = c.status_contrato || "Desconhecido";
        if (map[id][status] !== undefined) map[id][status]++;
      }
    });
    return { id, nome: modeloMap[id] || "Modelo desconhecido" };
  });
  return { linhas, dados: map };
}, [todosContratosFiltrados, modeloMap]);

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

        {/* METRIC CARDS */}
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

        {/* 🎯 AÇÕES SUGERIDAS – MANTIDO EXATAMENTE COMO ESTÁ */}
        <AcoesSugeridas />

        {/* 🔥 NOVA SEÇÃO: GRÁFICOS REACT */}
        <section className="rounded-lg border border-border bg-card shadow-card overflow-hidden w-full mt-2 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border px-5 py-4 gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Dashboard Analítico</h2>
              <p className="text-xs text-muted-foreground">
                Selecione a visão que deseja analisar
              </p>
            </div>
            {/* Filtros globais colocados aqui para afetar os gráficos */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={filtroNome.join(",")}
                onValueChange={(v) => setFiltroNome(v ? v.split(",") : [])}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {nomesEmpresas.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroCnpj.join(",")}
                onValueChange={(v) => setFiltroCnpj(v ? v.split(",") : [])}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="CNPJ" />
                </SelectTrigger>
                <SelectContent>
                  {cnpjs.map((cnpj) => (
                    <SelectItem key={cnpj} value={cnpj}>
                      {cnpj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Cidade"
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                className="w-[120px] h-8 text-xs"
              />

              <Select
                value={filtroServico.join(",")}
                onValueChange={(v) => setFiltroServico(v ? v.split(",") : [])}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicosUnicos.map((serv) => (
                    <SelectItem key={serv} value={serv}>
                      {serv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  setFiltroNome([]);
                  setFiltroCnpj([]);
                  setFiltroCidade("");
                  setFiltroServico([]);
                }}
              >
                <FilterX className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          {/* ABAS */}
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

          {/* CONTEÚDO DAS ABAS */}
          <div className="p-4 space-y-6">
            {dashboardAtivo.id === "geral" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ScoreCard title="Total de Interações" value={totalInteracoes} />
                  <ScoreCard title="Interações (últ. 30 dias)" value={ultimos30dias} />
                </div>
                <InteracoesPorEmpresa data={interacoesPorEmpresa} />
              </>
            )}

            {dashboardAtivo.id === "financeiro" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ScoreCard title="Quantidade de Pagamentos" value={totalPagamentos} />
                  <ScoreCard title="Quantos faltam?" value={pagamentosPendentes} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <StatusPagamentoRosca data={statusPagamentoData} />
                  <FinanceiroBarras data={financeiroBarrasData} />
                </div>
              </>
            )}

            {dashboardAtivo.id === "crescimento" && (
  <>
    {/* Scorecard + Gráfico de Status */}
    <div className="grid md:grid-cols-2 gap-6">
      <ScoreCard title="Quantidade" value={totalContratos} />
      <StatusContratoColumnChart data={contratosPorStatus} />
    </div>

    {/* Gráfico financeiro */}
    <FinanceiroBarras data={financeiroPorStatus} />

    {/* Tabelas pivot */}
    <div className="grid md:grid-cols-2 gap-6">
      <PivotTable
        titulo="Responsáveis do Contrato"
        linhas={dadosPorEmpresa.linhas}
        colunas={["Arquivado", "Ativo", "Encerrado"]}
        dados={dadosPorEmpresa.dados}
        renderNome={(item) => item.nome}
      />
      <PivotTable
        titulo="Modelos de Contrato"
        linhas={dadosPorModelo.linhas}
        colunas={["Arquivado", "Ativo", "Encerrado"]}
        dados={dadosPorModelo.dados}
        renderNome={(item) => item.nome}
      />
    </div>
  </>
)}
          </div>
        </section>

        {/* ATIVIDADE RECENTE */}
        <div className="grid gap-6 md:grid-cols-1">
          <ActivityTable />
        </div>
      </div>
    </DashboardLayout>
  );
}