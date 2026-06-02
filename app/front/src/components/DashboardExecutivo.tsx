import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Users, CheckCircle2, Activity, Target, Calendar,
  RefreshCw, AlertTriangle, Zap, Clock, Layers, BarChart3,
  PieChartIcon, Percent, ShieldAlert, TrendingUp, TrendingDown,
  Star, TrendingDown as TrendingDownIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line,
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEmpresas,
  useTodosContratos,
  useModelos,
  useTodasInteracoes,
} from "@/lib/api/hooks";
import { CustomTooltip, CustomPieTooltip } from "./AnalyticsCharts"; // ajuste o caminho conforme sua estrutura

// ==================== TEMA ====================
const THEME = {
  primary: "#0f4c81",
  secondary: "#00a8cc",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
};

// ==================== UTILITÁRIOS ====================
const fmtMoeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number) => `${Math.round(v)}%`;

const fmtNota = (v: number) => v.toFixed(1);

// ==================== COMPONENTE PRINCIPAL ====================
export function DashboardExecutivo() {
  const { data: empresas, isLoading: empLoading } = useEmpresas();
  const { data: contratos, isLoading: contLoading } = useTodosContratos();
  const { data: modelos, isLoading: modLoading } = useModelos();
  const { data: interacoes, isLoading: intLoading } = useTodasInteracoes();
  const queryClient = useQueryClient();

  const [periodoAtivo, setPeriodoAtivo] = useState<"6m" | "12m">("6m");
  const [abaAtiva, setAbaAtiva] = useState<"financeiro" | "operacional" | "relacionamento">("financeiro");

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-all"] });
      queryClient.invalidateQueries({ queryKey: ["interacoes"] });
    }, 60000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const metricas = useMemo(() => {
    if (!contratos || !empresas || !interacoes || !modelos) return null;

    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const hojeMs = hoje.getTime();

    const periodicidadeMap: Record<string, number> = {};
    modelos.forEach((m: any) => {
      const p = (m.periodicidade_cobranca || "").toLowerCase();
      if (p.includes("mensal")) periodicidadeMap[m.id_modelo] = 1;
      else if (p.includes("trimestral")) periodicidadeMap[m.id_modelo] = 3;
      else if (p.includes("semestral")) periodicidadeMap[m.id_modelo] = 6;
      else if (p.includes("anual")) periodicidadeMap[m.id_modelo] = 12;
      else periodicidadeMap[m.id_modelo] = 1;
    });

    const contratosAtivos = contratos.filter(
      (c: any) => (c.status_contrato || "").toLowerCase() === "ativo"
    );

    // MRR
    const mrr = contratosAtivos.reduce((acc, c: any) => {
      const valor = Number(c.valor_acordado) || 0;
      const divisor = periodicidadeMap[c.id_modelo] || 1;
      return acc + valor / divisor;
    }, 0);

    const clientesAtivos = new Set(contratosAtivos.map((c: any) => c.id_cliente)).size;
    const arpu = clientesAtivos > 0 ? mrr / clientesAtivos : 0;

    // LTV
    let duracaoTotal = 0;
    contratosAtivos.forEach((c: any) => {
      if (c.data_inicio && c.data_fim) {
        const inicio = new Date(c.data_inicio);
        const fim = new Date(c.data_fim);
        duracaoTotal += (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30);
      }
    });
    const duracaoMediaMeses = contratosAtivos.length > 0 ? duracaoTotal / contratosAtivos.length : 0;
    const ltv = arpu * duracaoMediaMeses;

    // Churn rate (últimos 90 dias)
    const limite90dias = new Date(agora.getFullYear(), agora.getMonth() - 3, agora.getDate());
    const encerradosRecentes = contratos.filter((c: any) =>
      (c.status_contrato || "").toLowerCase() === "encerrado" &&
      c.data_fim && new Date(c.data_fim) >= limite90dias
    ).length;
    const churnRate = (contratosAtivos.length + encerradosRecentes) > 0
      ? encerradosRecentes / (contratosAtivos.length + encerradosRecentes)
      : 0;

    // NRR
    const valorEncerradosRecentes = contratos
      .filter((c: any) =>
        (c.status_contrato || "").toLowerCase() === "encerrado" &&
        c.data_fim && new Date(c.data_fim) >= limite90dias
      )
      .reduce((acc: number, c: any) => acc + (Number(c.valor_acordado) / (periodicidadeMap[c.id_modelo] || 1)), 0);
    const nrr = (mrr + valorEncerradosRecentes) > 0 ? mrr / (mrr + valorEncerradosRecentes) : 1;

    // Receita realizada (últimos N meses)
    const mesesMap: Record<string, number> = {};
    const numMeses = periodoAtivo === "12m" ? 12 : 6;
    for (let i = numMeses - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mesesMap[key] = 0;
    }
    contratos.forEach((c: any) => {
      c.faturas?.forEach((f: any) => {
        if (f.data_pagamento && f.valor_pago) {
          const data = new Date(f.data_pagamento);
          const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
          if (mesesMap[key] !== undefined) mesesMap[key] += Number(f.valor_pago);
        }
      });
    });
    const receitaRealizada = Object.entries(mesesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({
        mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
        valor,
      }));

    // Fluxo de caixa projetado (próximos 3 meses)
    const projMap: Record<string, number> = {};
    for (let i = 1; i <= 3; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      projMap[key] = 0;
    }
    contratos.forEach((c: any) => {
      c.faturas?.forEach((f: any) => {
        if (f.status === "Pendente" || f.status === "Atrasado") {
          const venc = new Date(f.data_vencimento);
          const key = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}`;
          if (projMap[key] !== undefined) {
            projMap[key] += Number(f.valor_original || f.valor_pago || c.valor_acordado) || 0;
          }
        }
      });
    });
    const fluxoCaixa = Object.entries(projMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({
        mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
        valor,
      }));

    // Inadimplência (faixas de atraso)
    const faixasAtraso = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0, total: 0 };
    const valorInadimplencia = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0, total: 0 };
    contratos.forEach((c: any) => {
      c.faturas?.forEach((f: any) => {
        if (f.status === "Pendente" || f.status === "Atrasado") {
          const venc = new Date(f.data_vencimento).getTime();
          const dias = Math.floor((hojeMs - venc) / (1000 * 60 * 60 * 24));
          const valor = Number(f.valor_original || f.valor_pago || 0);
          if (dias > 0) {
            if (dias <= 30) { faixasAtraso["0-30"]++; valorInadimplencia["0-30"] += valor; }
            else if (dias <= 60) { faixasAtraso["31-60"]++; valorInadimplencia["31-60"] += valor; }
            else if (dias <= 90) { faixasAtraso["61-90"]++; valorInadimplencia["61-90"] += valor; }
            else { faixasAtraso[">90"]++; valorInadimplencia[">90"] += valor; }
            faixasAtraso.total++;
            valorInadimplencia.total += valor;
          }
        }
      });
    });

    // SLA entregas (últimos 30 dias)
    const entregasPeriodo = contratos.flatMap((c: any) =>
      (c.entregas || []).filter((e: any) => {
        if (!e.data_conclusao) return false;
        const diff = (hojeMs - new Date(e.data_conclusao).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      })
    );
    const totalEntregas = entregasPeriodo.length;
    const sla = totalEntregas
      ? Math.round((entregasPeriodo.filter((e: any) =>
          e.data_prazo_limite && new Date(e.data_conclusao) <= new Date(e.data_prazo_limite)
        ).length / totalEntregas) * 100)
      : 100;

    const pendEntregas = contratos.flatMap((c: any) =>
      (c.entregas || []).filter((e: any) => e.status_entrega !== "Concluído")
    ).length;

    const interPagasPend = interacoes.filter(
      (i: any) => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente"
    );
    const qtdInterPagasPend = interPagasPend.length;
    const valorInteracoesPend = interPagasPend.reduce((acc, i: any) => acc + Number(i.valor_cobrado || 0), 0);

    // Risco de churn (sem interação > 60d + pendências)
    const ultimaInteracao: Record<string, Date> = {};
    interacoes.forEach((i: any) => {
      if (!ultimaInteracao[i.id_cliente] || new Date(i.data_hora) > ultimaInteracao[i.id_cliente])
        ultimaInteracao[i.id_cliente] = new Date(i.data_hora);
    });
    const empresasRisco: any[] = [];
    empresas.forEach((e: any) => {
      const ultima = ultimaInteracao[e.id_cliente];
      const dias = ultima ? Math.floor((hojeMs - ultima.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      if (dias > 60) {
        const conts = contratos.filter((c: any) => c.id_cliente === e.id_cliente);
        const temPend = conts.some((c: any) =>
          c.faturas?.some((f: any) => f.status === "Pendente" || f.status === "Atrasado") ||
          c.entregas?.some((e: any) => e.status_entrega !== "Concluído")
        );
        if (temPend) empresasRisco.push({ nome: e.nome_empresa, dias });
      }
    });

    const diasUltima: number[] = [];
    empresas.forEach((e: any) => {
      const conts = contratos.filter((c: any) => c.id_cliente === e.id_cliente);
      if (conts.some((c: any) => (c.status_contrato || "").toLowerCase() === "ativo")) {
        const ult = ultimaInteracao[e.id_cliente];
        diasUltima.push(ult ? Math.floor((hojeMs - ult.getTime()) / (1000 * 60 * 60 * 24)) : 999);
      }
    });
    diasUltima.sort((a, b) => a - b);
    const medianaDias = diasUltima.length > 0 ? diasUltima[Math.floor(diasUltima.length / 2)] : 0;

    // Saúde dos clientes
    const saudeClientes: any[] = [];
    empresas.forEach((e: any) => {
      const conts = contratos.filter((c: any) => c.id_cliente === e.id_cliente);
      if (conts.length === 0) return;
      const ult = ultimaInteracao[e.id_cliente];
      const diasSem = ult ? Math.floor((hojeMs - ult.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const totalEntregasCont = conts.flatMap((c: any) => c.entregas || []);
      const entregasOk = totalEntregasCont.filter((e: any) => e.status_entrega === "Concluído").length;
      const percEntregas = totalEntregasCont.length > 0 ? entregasOk / totalEntregasCont.length : 1;
      const faturasVencidas = conts.flatMap((c: any) =>
        c.faturas?.filter((f: any) => f.status === "Atrasado") || []
      ).length;
      const totalFaturas = conts.flatMap((c: any) => c.faturas || []).length;
      const percFinanceiro = totalFaturas > 0 ? 1 - faturasVencidas / totalFaturas : 1;
      const scoreInter = Math.min(1, Math.max(0, 1 - diasSem / 90));
      const score = Math.round(percEntregas * 40 + percFinanceiro * 40 + scoreInter * 20);
      saudeClientes.push({ nome: e.nome_empresa.substring(0, 20), score });
    });

    // Concentração (top 3 clientes)
    const receitaPorCliente: Record<string, number> = {};
    contratosAtivos.forEach((c: any) => {
      const nome = empresas.find((e: any) => e.id_cliente === c.id_cliente)?.nome_empresa || "N/A";
      receitaPorCliente[nome] = (receitaPorCliente[nome] || 0) + Number(c.valor_acordado) / (periodicidadeMap[c.id_modelo] || 1);
    });
    const valoresOrd = Object.values(receitaPorCliente).sort((a, b) => b - a);
    const top3 = valoresOrd.slice(0, 3).reduce((a, b) => a + b, 0);
    const concentracao = mrr > 0 ? (top3 / mrr) * 100 : 0;
    const topClientes = Object.entries(receitaPorCliente)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome: nome.length > 18 ? nome.slice(0, 18) + "..." : nome, valor }));

    // Status dos contratos
    const statusData = Object.entries(
      contratos.reduce((acc: Record<string, number>, c: any) => {
        const st = (c.status_contrato || "Ativo").trim();
        acc[st] = (acc[st] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Ocupação e renovação
    const entregasPlanejadas30 = contratos.flatMap((c: any) =>
      (c.entregas || []).filter((e: any) => {
        if (!e.data_prazo_limite) return false;
        const diff = (hojeMs - new Date(e.data_prazo_limite).getTime()) / (1000 * 60 * 60 * 24);
        return diff >= -30 && diff <= 0;
      })
    ).length;
    const taxaOcupacao = entregasPlanejadas30 > 0 ? (totalEntregas / entregasPlanejadas30) * 100 : 100;

    const contratosRenovaveis = contratos.filter((c: any) =>
      c.data_fim && new Date(c.data_fim) < hoje && (c.status_contrato || "").toLowerCase() === "ativo"
    ).length;
    const totalEncerrados = contratos.filter((c: any) => (c.status_contrato || "").toLowerCase() === "encerrado").length;
    const indiceRenovacao = (contratosRenovaveis + totalEncerrados) > 0
      ? contratosRenovaveis / (contratosRenovaveis + totalEncerrados)
      : 0;

    // NOVAS MÉTRICAS:

    // Receita por segmento (usando segmento da empresa)
    const receitaPorSegmento: Record<string, number> = {};
    contratosAtivos.forEach((c: any) => {
      const empresa = empresas.find((e: any) => e.id_cliente === c.id_cliente);
      const seg = empresa?.segmento || "Não definido";
      const mrrContrato = Number(c.valor_acordado) / (periodicidadeMap[c.id_modelo] || 1);
      receitaPorSegmento[seg] = (receitaPorSegmento[seg] || 0) + mrrContrato;
    });
    const receitaSegmentoData = Object.entries(receitaPorSegmento).map(([segmento, valor]) => ({ segmento, valor }));

    // Contratos por porte
    const contratosPorPorte: Record<string, number> = {};
    contratosAtivos.forEach((c: any) => {
      const empresa = empresas.find((e: any) => e.id_cliente === c.id_cliente);
      const porte = empresa?.porte || "Não definido";
      contratosPorPorte[porte] = (contratosPorPorte[porte] || 0) + 1;
    });
    const porteData = Object.entries(contratosPorPorte).map(([porte, qtd]) => ({ porte, qtd }));

    // Evolução de novos contratos por mês (usando data_inicio)
    const contratosPorMes: Record<string, number> = {};
    const mesesParaGrafico = 12;
    for (let i = mesesParaGrafico - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      contratosPorMes[key] = 0;
    }
    contratos.forEach((c: any) => {
      if (c.data_inicio) {
        const data = new Date(c.data_inicio);
        const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
        if (contratosPorMes[key] !== undefined) contratosPorMes[key]++;
      }
    });
    const evolucaoContratos = Object.entries(contratosPorMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, qtd]) => ({
        mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
        qtd,
      }));

    // Churn por motivo
    const churnPorMotivo: Record<string, number> = {};
    contratos.forEach((c: any) => {
      if ((c.status_contrato || "").toLowerCase() === "encerrado" && c.motivo_arquivamento) {
        const motivo = c.motivo_arquivamento;
        churnPorMotivo[motivo] = (churnPorMotivo[motivo] || 0) + 1;
      }
    });
    const churnMotivosData = Object.entries(churnPorMotivo).map(([motivo, qtd]) => ({ motivo, qtd }));

    // NPS / Nota média
    const notasValidas = interacoes
      .filter((i: any) => i.nota !== null && i.nota !== undefined)
      .map((i: any) => Number(i.nota));
    const npsMedio = notasValidas.length > 0
      ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
      : null;

    return {
      mrr, arpu, ltv, churnRate, nrr,
      receitaRealizada, fluxoCaixa,
      valorInadimplencia, faixasAtraso,
      sla, pendEntregas,
      qtdInterPagasPend, valorInteracoesPend,
      empresasRisco, medianaDiasInteracao: medianaDias,
      saudeClientes, concentracao, topClientes,
      taxaOcupacao, indiceRenovacao, statusData,
      totalEmpresas: empresas.length,
      contratosAtivos: contratosAtivos.length,
      clientesAtivos,
      receitaSegmentoData,
      porteData,
      evolucaoContratos,
      churnMotivosData,
      npsMedio,
    };
  }, [contratos, empresas, interacoes, modelos, periodoAtivo]);

  if (!metricas) return <SkeletonDashboard />;

  const {
    mrr, arpu, ltv, churnRate, nrr,
    receitaRealizada, fluxoCaixa,
    valorInadimplencia,
    sla, pendEntregas,
    qtdInterPagasPend, valorInteracoesPend,
    empresasRisco, medianaDiasInteracao,
    saudeClientes, concentracao, topClientes,
    taxaOcupacao, indiceRenovacao, statusData,
    totalEmpresas, contratosAtivos, clientesAtivos,
    receitaSegmentoData,
    porteData,
    evolucaoContratos,
    churnMotivosData,
    npsMedio,
  } = metricas;

  const inadimplenciaData = [
    { faixa: "0-30", valor: valorInadimplencia["0-30"] },
    { faixa: "31-60", valor: valorInadimplencia["31-60"] },
    { faixa: "61-90", valor: valorInadimplencia["61-90"] },
    { faixa: ">90", valor: valorInadimplencia[">90"] },
  ];

  // ============ RENDER ============
  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Atualizado a cada 60 segundos</p>
        </div>
        <div className="flex gap-2">
          {(["6m", "12m"] as const).map((periodo) => (
            <button
              key={periodo}
              onClick={() => setPeriodoAtivo(periodo)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-300 ${
                periodoAtivo === periodo
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {periodo === "6m" ? "6 meses" : "12 meses"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: "MRR", value: fmtMoeda(mrr), icon: DollarSign, trend: { value: fmtPct(churnRate * 100), label: "churn", up: false }, color: THEME.secondary },
          { title: "Clientes Ativos", value: clientesAtivos, icon: Users, trend: { value: `${totalEmpresas} total`, label: "base", up: true }, color: THEME.primary },
          { title: "SLA (30d)", value: `${sla}%`, icon: CheckCircle2, trend: { value: `${pendEntregas} pend.`, label: "entregas", up: sla >= 80 }, color: sla >= 80 ? THEME.success : THEME.warning },
          { title: "Saúde Média", value: `${Math.round(saudeClientes.reduce((a, b) => a + b.score, 0) / (saudeClientes.length || 1))}%`, icon: Activity, trend: { value: `${empresasRisco.length} risco`, label: "churn", up: empresasRisco.length < 3 }, color: empresasRisco.length < 3 ? THEME.success : THEME.warning },
        ].map((kpi, i) => (
          <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
            <KpiCardPrincipal {...kpi} loading={empLoading || contLoading || intLoading} />
          </div>
        ))}
      </div>

      {/* Métricas secundárias */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "ARPU", value: fmtMoeda(arpu), icon: Target, color: THEME.secondary },
          { label: "LTV (est.)", value: fmtMoeda(ltv), icon: Calendar, color: THEME.primary },
          { label: "NRR", value: fmtPct(nrr * 100), icon: RefreshCw, color: nrr >= 0.9 ? THEME.success : THEME.warning },
          { label: "Inadimplência", value: fmtMoeda(valorInadimplencia.total), icon: AlertTriangle, color: valorInadimplencia.total > 0 ? THEME.danger : "#94a3b8" },
          { label: "Inter. Pagas Pend.", value: fmtMoeda(valorInteracoesPend), icon: Zap, color: qtdInterPagasPend > 0 ? THEME.warning : "#94a3b8" },
          { label: "Med. Dias Interação", value: `${medianaDiasInteracao}d`, icon: Clock, color: medianaDiasInteracao > 30 ? THEME.warning : THEME.success },
          { label: "Concentração", value: fmtPct(concentracao), icon: Layers, color: concentracao > 60 ? THEME.warning : THEME.success },
          { label: "Ocupação (30d)", value: fmtPct(taxaOcupacao), icon: BarChart3, color: taxaOcupacao >= 80 ? THEME.success : THEME.warning },
          { label: "Índ. Renovação", value: fmtPct(indiceRenovacao * 100), icon: Percent, color: indiceRenovacao >= 0.7 ? THEME.success : THEME.warning },
          npsMedio !== null ? { label: "NPS Médio", value: fmtNota(npsMedio), icon: Star, color: npsMedio >= 8 ? THEME.success : npsMedio >= 6 ? THEME.warning : THEME.danger } : null,
        ].filter(Boolean).map((badge: any, i) => (
          <div key={i} className="animate-zoom-in" style={{ animationDelay: `${i * 50}ms` }}>
            <MetricBadge {...badge} />
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border pb-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        {(["financeiro", "operacional", "relacionamento"] as const).map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            className={`text-sm capitalize px-4 py-1.5 rounded-t-md transition-all duration-300 ${
              abaAtiva === aba
                ? "bg-background border border-border border-b-0 text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {aba}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      <div key={abaAtiva} className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
        {abaAtiva === "financeiro" && (
          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="Receita Realizada" icon={DollarSign} color={THEME.success}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={receitaRealizada}>
                  <defs>
                    <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.success} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.success} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="mes" stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.015 210)" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => fmtMoeda(value)} content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="url(#receitaGrad)" barSize={30} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border/60 overflow-hidden group">
  <div className="h-1 w-full transition-all duration-500 group-hover:h-2" style={{ backgroundColor: THEME.purple }} />
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-base font-semibold flex items-center gap-2">
      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${THEME.purple}15`, color: THEME.purple }}>
        <Layers className="h-4 w-4" />
      </div>
      Receita por Segmento
    </CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    <div 
      className="overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-4 pb-4"
      style={{ maxHeight: receitaSegmentoData.length > 6 ? "320px" : "none" }}
    >
      <ResponsiveContainer width="100%" height={receitaSegmentoData.length > 6 ? receitaSegmentoData.length * 50 : 300}>
        <BarChart data={receitaSegmentoData} layout="vertical" margin={{ left: 20, top: 10, bottom: 10 }} barCategoryGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
          <XAxis type="number" stroke="oklch(0.7 0.015 210)" fontSize={12} tickFormatter={fmtMoeda} />
          <YAxis dataKey="segmento" type="category" stroke="oklch(0.7 0.015 210)" fontSize={12} width={100} tickMargin={8} />
          <Tooltip formatter={(value: number) => fmtMoeda(value)} content={<CustomTooltip />} />
          <Bar dataKey="valor" fill={THEME.purple} barSize={24} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>

            <ChartCard title="Fluxo de Caixa Projetado" icon={BarChart3} color={THEME.secondary}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="mes" stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.015 210)" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => fmtMoeda(value)} content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill={THEME.secondary} barSize={40} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Inadimplência por Faixa" icon={AlertTriangle} color={THEME.danger}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inadimplenciaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="faixa" stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.015 210)" fontSize={12} tickFormatter={fmtMoeda} />
                 <Tooltip formatter={(value: number) => fmtMoeda(value)} content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill={THEME.danger} barSize={50} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 5 Clientes (MRR)" icon={Target} color={THEME.primary}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientes} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis type="number" stroke="oklch(0.7 0.015 210)" fontSize={12} tickFormatter={fmtMoeda} />
                  <YAxis dataKey="nome" type="category" stroke="oklch(0.7 0.015 210)" fontSize={12} width={130} />
                  <Tooltip formatter={(value: number) => fmtMoeda(value)} content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill={THEME.primary} barSize={20} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Contratos por Porte" icon={Users} color={THEME.primary}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porteData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="porte" stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qtd" fill={THEME.secondary} barSize={40} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {abaAtiva === "operacional" && (
          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="SLA de Entregas (30d)" icon={CheckCircle2} color={THEME.success}>
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-7xl font-bold" style={{ color: sla >= 80 ? THEME.success : THEME.warning }}>
                  {sla}%
                </div>
                <div className="w-full max-w-xs bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${sla}%`, backgroundColor: sla >= 80 ? THEME.success : THEME.warning }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {sla >= 90 ? "Excelente" : sla >= 70 ? "Bom" : "Regular"} — {pendEntregas} pendentes
                </p>
              </div>
            </ChartCard>

            <ChartCard title="Evolução de Novos Contratos" icon={TrendingUp} color={THEME.secondary}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoContratos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="mes" stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="oklch(0.7 0.015 210)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="qtd" stroke={THEME.secondary} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status dos Contratos" icon={PieChartIcon} color={THEME.primary}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={[THEME.success, THEME.warning, "#94a3b8", THEME.danger][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Saúde dos Clientes" icon={Activity} color={THEME.success}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={saudeClientes.slice(0, 6)}>
                  <PolarGrid stroke="oklch(0.7 0.015 210 / 30%)" />
                  <PolarAngleAxis dataKey="nome" fontSize={9} stroke="oklch(0.7 0.015 210)" />
                  <PolarRadiusAxis domain={[0, 100]} stroke="oklch(0.7 0.015 210)" fontSize={10} />
                  <Radar dataKey="score" stroke={THEME.secondary} fill={THEME.secondary} fillOpacity={0.2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {abaAtiva === "relacionamento" && (
          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="Clientes em Risco" icon={ShieldAlert} color={THEME.danger}>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {empresasRisco.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente em risco.</p>
                ) : (
                  empresasRisco.map((e: any) => (
                    <div key={e.nome} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium text-sm">{e.nome}</span>
                      <Badge variant="destructive">{e.dias}d sem contato</Badge>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>

            <ChartCard title="Mediana de Dias sem Interação" icon={Clock} color={THEME.warning}>
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-7xl font-bold" style={{ color: medianaDiasInteracao > 30 ? THEME.danger : THEME.success }}>
                  {medianaDiasInteracao}
                </div>
                <p className="text-sm text-muted-foreground">dias mediana</p>
                <div className="w-full max-w-xs bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (medianaDiasInteracao / 90) * 100)}%`,
                      backgroundColor: medianaDiasInteracao > 30 ? THEME.danger : THEME.success,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Meta: ≤ 30 dias</p>
              </div>
            </ChartCard>

            <ChartCard title="Churn por Motivo" icon={TrendingDownIcon} color={THEME.danger}>
              {churnMotivosData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhum arquivamento registrado com motivo.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={churnMotivosData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="qtd" nameKey="motivo">
                      {churnMotivosData.map((_, i) => (
                        <Cell key={i} fill={[THEME.danger, THEME.warning, THEME.purple, THEME.secondary][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {npsMedio !== null && (
              <ChartCard title="NPS Médio (Nota 0-10)" icon={Star} color={THEME.success}>
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="text-7xl font-bold" style={{ color: npsMedio >= 8 ? THEME.success : npsMedio >= 6 ? THEME.warning : THEME.danger }}>
                    {fmtNota(npsMedio)}
                  </div>
                  <div className="w-full max-w-xs bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(npsMedio / 10) * 100}%`,
                        backgroundColor: npsMedio >= 8 ? THEME.success : npsMedio >= 6 ? THEME.warning : THEME.danger,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {npsMedio >= 8 ? "Excelente" : npsMedio >= 6 ? "Bom" : "Regular"}
                  </p>
                </div>
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============
const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid oklch(0.7 0.015 210 / 30%)",
  background: "oklch(0.15 0.02 240 / 95%)",
  color: "#fff",
  fontSize: "13px",
};

function ChartCard({ title, icon: Icon, color, children }: any) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border/60 overflow-hidden group">
      <div className="h-1 w-full transition-all duration-500 group-hover:h-2" style={{ backgroundColor: color }} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}15`, color }}>
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

function KpiCardPrincipal({ title, value, icon: Icon, trend, color, loading }: any) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border/60 overflow-hidden group">
      <div className="h-1 w-full transition-all duration-500 group-hover:h-2" style={{ backgroundColor: color }} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">
              {loading ? <span className="animate-pulse">...</span> : value}
            </p>
            {trend && (
              <div className="flex items-center gap-1.5 mt-1">
                {trend.up ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend.up ? "text-emerald-600" : "text-red-600"}`}>
                  {trend.value}
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBadge({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border/60 group">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="animate-pulse space-y-4"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-8 bg-muted rounded w-3/4" /></div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}