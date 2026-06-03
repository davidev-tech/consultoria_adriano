import { Breadcrumb } from "@/components/Breadcrumb";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Calendar, PackageCheck, AlertTriangle, DollarSign,
  MessageSquare, FileText, Loader2, ArrowLeft, ExternalLink
} from "lucide-react";
import {
  useEmpresas,
  useInteracoesPorCliente,
  useContratosPorEmpresa,
  useModelos,
} from "@/lib/api/hooks";

export const Route = createFileRoute("/empresas/$id")({
  component: EmpresaDetalhesPage,
});

const formatarMoeda = (valor: number | null | undefined) => {
  if (!valor) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
};

const formatarData = (data: string | null | undefined, comHora = false) => {
  if (!data) return "—";
  const opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (comHora) { opcoes.hour = "2-digit"; opcoes.minute = "2-digit"; }
  return new Date(data).toLocaleDateString("pt-BR", opcoes);
};

function EmpresaDetalhesPage() {
  const { id } = Route.useParams();
  const { data: empresas } = useEmpresas();
  const empresa = (empresas as any[])?.find((e) => e.id_cliente === id);
  const { data: interacoes, isLoading: loadingInteracoes } = useInteracoesPorCliente(id);
  const { data: contratos, isLoading: loadingContratos } = useContratosPorEmpresa(id);
  const { data: modelos } = useModelos();

  const [abaAtiva, setAbaAtiva] = useState("interacoes");

  if (!empresa) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const interacoesOrdenadas = [...(interacoes || [])].sort(
    (a: any, b: any) => new Date(b.data_hora || 0).getTime() - new Date(a.data_hora || 0).getTime()
  );
  const ultimaVisita = interacoesOrdenadas.find((i: any) => i.tipo_interacao?.toLowerCase().includes("visita"));
  const contratosAtivos = (contratos || []).filter((c: any) => c.status_contrato?.toLowerCase() === "ativo");
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const proximaEntrega = contratosAtivos
    .filter((c: any) => c.data_fim && new Date(c.data_fim) > hoje)
    .sort((a: any, b: any) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())[0];

  const pendenciasContrato = contratosAtivos.reduce((acc: number, c: any) => {
    if (!Array.isArray(c.entregas)) return acc;
    return acc + c.entregas.filter((e: any) => e.status_entrega !== "Concluído").length;
  }, 0);
  const faturasPendentes = contratosAtivos.reduce((acc: number, c: any) => {
    if (!Array.isArray(c.faturas)) return acc;
    return acc + c.faturas.filter((f: any) => f.status === "Pendente" || f.status === "Atrasado").length;
  }, 0);
  const interacoesFinanceirasPendentes = interacoesOrdenadas.filter(
    (i: any) => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente"
  ).length;
  const totalPendencias = pendenciasContrato + faturasPendentes + interacoesFinanceirasPendentes;

  const modeloMap = useMemo(() => {
    if (!modelos) return {};
    const map: Record<string, string> = {};
    modelos.forEach((m: any) => (map[m.id_modelo] = m.nome_modelo));
    return map;
  }, [modelos]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl flex flex-col gap-6 p-4 animate-fade-in-up">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Empresas", to: "/empresas" },
            { label: empresa.nome_empresa },
          ]}
        />

        {/* Link para voltar (opcional, pode remover se preferir apenas o breadcrumb) */}
        <Link to="/empresas" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" />
          Voltar para diretório
        </Link>

        {/* Cabeçalho */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">// cliente</span>
            <h1 className="text-2xl font-bold">{empresa.nome_empresa}</h1>
            <p className="text-sm text-muted-foreground">
              {empresa.cnpj || "CNPJ não informado"} • {empresa.localizacao_cidade || "—"}/{empresa.localizacao_estado || "—"}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Última Visita" value={ultimaVisita ? formatarData(ultimaVisita.data_hora) : "—"} icon={Calendar} />
          <KpiCard label="Próxima Entrega" value={proximaEntrega ? formatarData(proximaEntrega.data_fim) : "—"} icon={PackageCheck} />
          <KpiCard label="Pendências" value={`${totalPendencias}`} icon={AlertTriangle} variant="warning" />
          <KpiCard label="Contratos Ativos" value={`${contratosAtivos.length}`} icon={FileText} />
        </div>

        {/* Tabs */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interacoes"><MessageSquare className="h-4 w-4 mr-2" />Interações</TabsTrigger>
            <TabsTrigger value="contratos"><FileText className="h-4 w-4 mr-2" />Contratos</TabsTrigger>
            <TabsTrigger value="pendencias"><AlertTriangle className="h-4 w-4 mr-2" />Pendências</TabsTrigger>
          </TabsList>

          <TabsContent value="interacoes" className="mt-6 tab-content-enter">
            {loadingInteracoes ? <SkeletonList /> : interacoesOrdenadas.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {interacoesOrdenadas.map((i: any) => (
                  <div key={i.id_interacao} className="rounded-lg border border-border bg-card p-4 hover-row">
                    <div className="flex justify-between">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{i.tipo_interacao}</span>
                      <span className="text-xs text-muted-foreground">{formatarData(i.data_hora, true)}</span>
                    </div>
                    <p className="text-sm mt-2">{i.feedback_anotacoes || <span className="text-muted-foreground italic">Sem anotações</span>}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground italic">Nenhuma interação.</p>}
          </TabsContent>

          <TabsContent value="contratos" className="mt-6 tab-content-enter">
            {loadingContratos ? <SkeletonList /> : contratos && contratos.length > 0 ? (
              <div className="space-y-3">
                {contratos.map((c: any) => (
                  <div key={c.id_contrato} className="rounded-lg border border-border bg-card p-4 hover-row flex justify-between">
                    <div>
                      <p className="font-medium">{modeloMap[c.id_modelo] || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.data_inicio} → {c.data_fim || "indeterminado"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatarMoeda(c.valor_acordado)}</p>
                      <p className="text-xs text-muted-foreground">{c.status_contrato}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground italic">Nenhum contrato.</p>}
          </TabsContent>

          <TabsContent value="pendencias" className="mt-6 tab-content-enter">
            {totalPendencias === 0 ? <p className="text-sm text-muted-foreground italic">Nenhuma pendência.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Contratuais</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {contratosAtivos.flatMap((c: any) => (c.entregas || []).filter((e: any) => e.status_entrega !== "Concluído")).map((e: any) => (
                        <li key={e.id_entrega} className="flex justify-between"><span>{e.descricao_entrega}</span><span className="text-red-500">{e.status_entrega}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Financeiras</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {contratosAtivos.flatMap((c: any) => (c.faturas || []).filter((f: any) => f.status === "Pendente" || f.status === "Atrasado")).map((f: any) => (
                        <li key={f.id_fatura} className="flex justify-between"><span>Fatura {new Date(f.data_vencimento).toLocaleDateString("pt-BR")}</span><span className="text-red-500">{f.status}</span></li>
                      ))}
                      {interacoesOrdenadas.filter((i: any) => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente").map((i: any) => (
                        <li key={i.id_interacao} className="flex justify-between"><span>Interação {i.tipo_interacao}</span><span className="text-yellow-500">Pag. Pendente</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4">
          <Link to="/interacoes"><Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-2" />Nova Interação</Button></Link>
          <Link to="/contratos"><Button size="sm"><FileText className="h-4 w-4 mr-2" />Novo Contrato</Button></Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon: Icon, variant = "default" }: any) {
  const bg = variant === "warning" ? "bg-yellow-500/10 text-yellow-600 ring-yellow-500/20" : "bg-primary/15 text-primary ring-primary/30";
  return (
    <Card className="card-hover hover:scale-[1.03] hover:shadow-xl cursor-pointer transition-all">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${bg}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded skeleton-shimmer" />
      ))}
    </div>
  );
}