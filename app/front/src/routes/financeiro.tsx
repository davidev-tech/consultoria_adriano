import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Loader2, Plus, Pencil, Trash2, DollarSign, Receipt, TrendingUp, Search, FilterX } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useEmpresas,
  useTodosContratos,
  useFaturasPorContrato,
  useCreateFatura,
  useUpdateFatura,
  useInteracoesPagas,
  useTotalInteracoesPagas,
} 
from "@/lib/api/hooks"; 
import { toast } from "sonner";
import type { UUID } from "@/lib/api/types";
import { useUpdateInteracao, useDeleteInteracao } from "@/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import type { StatusFinanceiro } from "@/lib/api/types";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Gestão do Cuidado" }] }),
  component: FinanceiroPage,
});

// ==========================================
// UTILITÁRIOS
// ==========================================
const formatarMoeda = (valor: number | null | undefined) => {
  if (!valor) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(valor);
};

const formatarData = (data: string | null | undefined) => {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-BR", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatarDataCurta = (data: string | null | undefined) => {
  if (!data) return "—";
  return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function FinanceiroPage() {
  const [abaAtiva, setAbaAtiva] = useState("faturas");
  
  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // financeiro
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Controle de faturas, pagamentos e interações cobradas.</p>
        </div>

        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="faturas" className="gap-2">
              <Receipt className="h-4 w-4" />
              Faturas e Parcelas
            </TabsTrigger>
            <TabsTrigger value="interacoes-pagas" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Interações Pagas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faturas" className="mt-6 tab-content-enter">
            <FaturasTab />
          </TabsContent>

          <TabsContent value="interacoes-pagas" className="mt-6 tab-content-enter">
            <InteracoesPagasTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ==========================================
// ABA 1: FATURAS E PARCELAS
// ==========================================
function FaturasTab() {
  const [mesFiltro, setMesFiltro] = useState<string>('');
  const empresas = useEmpresas();
  const contratos = useTodosContratos();
  
  const [idContrato, setIdContrato] = useState("");
  const faturasQuery = useFaturasPorContrato(idContrato || undefined);
  const [open, setOpen] = useState(false);
  const [editingFatura, setEditingFatura] = useState<any>(null);

  // Diálogo de confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const deleteFatura = async (id: string) => {
    const res = await fetch(`/api/faturas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    return await res.json();
  };

  const contratoSelecionado = useMemo(() => {
    return contratos.data?.find((c) => c.id_contrato === idContrato);
  }, [contratos.data, idContrato]);

  const empresaNome = (id: string) =>
    empresas.data?.find((e) => e.id_cliente === id)?.nome_empresa ?? "—";

  const contratoLabel = (c: { id_contrato: string; id_cliente: string; valor_acordado: number }) =>
    `${empresaNome(c.id_cliente)} · ${Number(c.valor_acordado).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`;

  function calcularFaturamento(fatura: any) {
    if (fatura.status === "Pago" || fatura.data_pagamento) {
      return {
        ...fatura,
        status: "Pago",
        valorOriginal: Number(fatura.valor_original),
        valorAtualizado: Number(fatura.valor_original) + Number(fatura.valor_juros_pago || 0),
        cor: "text-emerald-600 font-medium"
      };
    }

    const hoje = new Date();
    const vencimento = new Date(fatura.data_vencimento);
    hoje.setHours(0, 0, 0, 0);
    vencimento.setHours(0, 0, 0, 0);

    if (hoje <= vencimento) {
      return {
        status: "Pendente",
        valorOriginal: Number(fatura.valor_original),
        valorAtualizado: Number(fatura.valor_original),
        cor: "text-amber-500 font-medium"
      };
    }

    const cobraJuros = contratoSelecionado?.cobra_juros === true || contratoSelecionado?.cobra_juros === "true";
    const taxaJuros = Number(contratoSelecionado?.taxa_juros || 0);
    
    let valorTotal = Number(fatura.valor_original);
    const diffTime = Math.abs(hoje.getTime() - vencimento.getTime());
    const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (cobraJuros && taxaJuros > 0 && diasAtraso > 0) {
      const jurosAcumulado = valorTotal * (taxaJuros / 100) * diasAtraso;
      valorTotal += jurosAcumulado;
    }

    return {
      status: "Atrasado",
      valorOriginal: Number(fatura.valor_original),
      valorAtualizado: valorTotal,
      cor: "text-destructive font-bold animate-pulse"
    };
  }

  const faturasProcessadas = useMemo(() => {
    const list = faturasQuery.data ?? [];
    
    return list.map((fatura) => {
      const calculo = calcularFaturamento(fatura);
      return {
        ...fatura,
        statusCalculado: calculo.status,
        valorAtualizado: calculo.valorAtualizado,
        cor: calculo.cor
      };
    }).filter((fatura) => {
      if (!mesFiltro) return true;
      return fatura.data_vencimento.startsWith(mesFiltro);
    });
  }, [faturasQuery.data, mesFiltro, contratoSelecionado]);

  const totals = useMemo(() => {
    const list = faturasQuery.data ?? [];
    const receitaAcordada = list.reduce((a, f) => a + Number(f.valor_original), 0);
    const pago = list
      .filter((f) => f.status === "Pago" || f.data_pagamento)
      .reduce((a, f) => a + Number(f.valor_pago || f.valor_original), 0);
    const falta = faturasProcessadas
      .filter((f) => f.statusCalculado !== "Pago")
      .reduce((a, f) => a + f.valorAtualizado, 0);

    return { receitaAcordada, pago, falta };
  }, [faturasQuery.data, faturasProcessadas]);

  const handleEditClick = (fatura: any) => {
    setEditingFatura(fatura);
    setOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div />
        <Button 
          className="gap-2" 
          onClick={() => {
            setEditingFatura({ id_fatura: "novo" });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova Fatura Manual
        </Button>

        {open && (
          <FaturaDialog 
            key={editingFatura?.id_fatura || "novo"} 
            id_contrato={idContrato} 
            fatura={editingFatura?.id_fatura === "novo" ? null : editingFatura} 
            onClose={() => {
              setOpen(false);
              setEditingFatura(null);
            }} 
          />
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <Label className="text-xs">Selecione um contrato</Label>
        <Select value={idContrato} onValueChange={setIdContrato}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Escolha o contrato..." />
          </SelectTrigger>
          <SelectContent>
            {contratos.data?.map((c) => (
              <SelectItem key={c.id_contrato} value={c.id_contrato}>
                {contratoLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {idContrato && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="animate-fade-in-up">
              <KpiCard label="Receita Total Contrato" value={totals.receitaAcordada} variant="info" />
            </div>
            <div className="animate-fade-in-up">
              <KpiCard label="Total Arrecadado" value={totals.pago} variant="success" />
            </div>
            <div className="animate-fade-in-up">
              <KpiCard label="Saldo Restante" value={totals.falta} variant="warning" />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Filtrar por Mês de Vencimento:</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="month" 
                  className="border bg-background rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
                {mesFiltro && (
                  <Button onClick={() => setMesFiltro('')} variant="ghost" size="sm" className="text-xs underline">
                    Limpar Filtro
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            {faturasQuery.isLoading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 rounded skeleton-shimmer" />
                ))}
              </div>
            ) : faturasProcessadas.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Nenhuma fatura encontrada para este período.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                    <th className="text-left px-4 py-3 font-medium">Data Recibo</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Valor Base</th>
                    <th className="text-right px-4 py-3 font-medium">Valor Atualizado</th>
                    <th className="w-[100px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {faturasProcessadas.map((f) => (
                    <tr key={f.id_fatura} className="border-b last:border-0 hover-row transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">
                        {formatarDataCurta(f.data_vencimento)}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {f.data_pagamento ? formatarDataCurta(f.data_pagamento) : '—'}
                      </td>
                      <td className={`px-4 py-3 ${f.cor}`}>
                        {f.statusCalculado}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {Number(f.valor_original).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {Number(f.valorAtualizado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => handleEditClick(f)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(f.id_fatura)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO DE FATURA */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir fatura?"
        description="Esta ação não pode ser desfeita. A fatura será removida permanentemente."
        onConfirm={async () => {
          if (itemToDelete) {
            setDeleteLoading(true);
            try {
              await deleteFatura(itemToDelete);
              toast.success("Fatura removida com sucesso.");
            } catch {
              toast.error("Erro ao deletar a fatura.");
            } finally {
              setDeleteLoading(false);
            }
          }
          setDeleteOpen(false);
        }}
        loading={deleteLoading}
      />
    </div>
  );
}

// ==========================================
// ABA 2: INTERAÇÕES PAGAS
// ==========================================
function InteracoesPagasTab() {
  const empresas = useEmpresas();
  const [idClienteSelecionado, setIdClienteSelecionado] = useState<string>("todas");
  const [buscaLocal, setBuscaLocal] = useState("");
  const queryClient = useQueryClient();
  
  const update = useUpdateInteracao();
  const remove = useDeleteInteracao();

  const clienteFiltro = idClienteSelecionado === "todas" ? undefined : idClienteSelecionado;
  const { data: interacoesPagas, isLoading } = useInteracoesPagas(clienteFiltro);
  const { data: resumo } = useTotalInteracoesPagas(clienteFiltro);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTipo, setEditTipo] = useState("Visita");
  const [editDataHora, setEditDataHora] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [editGrau, setEditGrau] = useState("Baixo");
  const [editStatus, setEditStatus] = useState<StatusFinanceiro>("Não Paga");
  const [editValor, setEditValor] = useState("");
  const [editStatusPagamento, setEditStatusPagamento] = useState("Pendente");

  // Diálogo de confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const interacoesFiltradas = interacoesPagas?.filter(item => {
    if (!buscaLocal) return true;
    const termo = buscaLocal.toLowerCase();
    return (
      item.feedback_anotacoes?.toLowerCase().includes(termo) ||
      item.tipo_interacao?.toLowerCase().includes(termo) ||
      item.grau_urgencia?.toLowerCase().includes(termo)
    );
  }) ?? [];

  const limparFiltros = () => {
    setIdClienteSelecionado("todas");
    setBuscaLocal("");
  };

  const empresaSelecionada = empresas.data?.find(e => e.id_cliente === idClienteSelecionado);

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditTipo(item.tipo_interacao || "Visita");
    setEditDataHora(item.data_hora ? new Date(item.data_hora).toISOString().slice(0, 16) : "");
    setEditFeedback(item.feedback_anotacoes || "");
    setEditGrau(item.grau_urgencia || "Baixo");
    setEditStatus(item.status_financeiro || "Não Paga");
    setEditValor(item.valor_cobrado ? String(item.valor_cobrado) : "");
    setEditStatusPagamento(item.status_pagamento || "Pendente");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await update.mutateAsync({
        id: editingItem.id_interacao,
        data: {
          id_cliente: editingItem.id_cliente,
          tipo_interacao: editTipo,
          data_hora: editDataHora,
          feedback_anotacoes: editFeedback,
          grau_urgencia: editGrau,
          status_financeiro: editStatus,
          valor_cobrado: editStatus === "Paga" ? parseFloat(editValor) : null,
          status_pagamento: editStatusPagamento,
        },
      });
      toast.success("Interação atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["interacoes-pagas"] });
      queryClient.invalidateQueries({ queryKey: ["interacoes-pagas-total"] });
      setEditingItem(null);
    } catch (err) {
      toast.error("Erro ao atualizar interação.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="animate-fade-in-up">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Interações</CardTitle>
              <Receipt className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {resumo?.total_interacoes ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">interações cobradas</p>
            </CardContent>
          </Card>
        </div>
        <div className="animate-fade-in-up">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Cobrado</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatarMoeda(resumo?.total_valor)}
              </div>
              <p className="text-xs text-muted-foreground">
                {empresaSelecionada ? `Empresa: ${empresaSelecionada.nome_empresa}` : 'Todas as empresas'}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="animate-fade-in-up">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {resumo && resumo.total_interacoes > 0
                  ? formatarMoeda(resumo.total_valor / resumo.total_interacoes)
                  : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground">por interação</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={idClienteSelecionado} onValueChange={setIdClienteSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por empresa..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.data?.map((e: any) => (
                <SelectItem key={e.id_cliente} value={e.id_cliente}>
                  {e.nome_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por palavra-chave..."
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={limparFiltros} className="gap-2">
          <FilterX className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      {/* TABELA COM AÇÕES */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 rounded skeleton-shimmer" />
            ))}
          </div>
        ) : interacoesFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Pagamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feedback</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interacoesFiltradas.map((item: any) => {
                  const empresa = empresas.data?.find(e => e.id_cliente === item.id_cliente);
                  
                  return (
                    <tr key={item.id_interacao} className="hover-row transition-colors">
                      <td className="px-4 py-3 text-sm">{empresa?.nome_empresa || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {item.tipo_interacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatarData(item.data_hora)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          item.grau_urgencia === 'Alto' ? 'bg-red-100 text-red-700' : 
                          item.grau_urgencia === 'Médio' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {item.grau_urgencia}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatarMoeda(item.valor_cobrado)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          item.status_pagamento === 'Pago' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status_pagamento || 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[250px] truncate">
                        {item.feedback_anotacoes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditClick(item)}
                            title="Editar interação"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(item.id_interacao)}
                            title="Excluir interação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {idClienteSelecionado && idClienteSelecionado !== "todas"
                ? "Nenhuma interação paga encontrada para esta empresa." 
                : "Nenhuma interação paga registrada até o momento."}
            </p>
          </div>
        )}
      </div>

      {/* DIÁLOGO DE EDIÇÃO */}
      {editingItem && (
        <Dialog open onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Interação Paga</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={editTipo} onValueChange={setEditTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visita">Visita</SelectItem>
                      <SelectItem value="Reunião">Reunião</SelectItem>
                      <SelectItem value="Mensagem">Mensagem</SelectItem>
                      <SelectItem value="Ligação">Ligação</SelectItem>
                      <SelectItem value="e-mail">E-mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Grau de Urgência</Label>
                  <Select value={editGrau} onValueChange={setEditGrau}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status Financeiro</Label>
                <Select value={editStatus} onValueChange={(value: StatusFinanceiro) => setEditStatus(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Paga">Não Paga</SelectItem>
                    <SelectItem value="Paga">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editStatus === "Paga" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Cobrado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status do Pagamento</Label>
                    <Select value={editStatusPagamento} onValueChange={setEditStatusPagamento}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={editDataHora}
                  onChange={(e) => setEditDataHora(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Feedback / Anotações</Label>
                <Textarea
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={update.isPending}>
                {update.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir interação paga?"
        description="Esta ação não pode ser desfeita. A interação será removida permanentemente."
        onConfirm={async () => {
          if (itemToDelete) {
            try {
              await remove.mutateAsync(itemToDelete);
              toast.success("Interação removida.");
              queryClient.invalidateQueries({ queryKey: ["interacoes-pagas"] });
              queryClient.invalidateQueries({ queryKey: ["interacoes-pagas-total"] });
            } catch {
              toast.error("Erro ao excluir interação.");
            }
          }
          setDeleteOpen(false);
        }}
        loading={remove.isPending}
      />

      {interacoesFiltradas.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Mostrando {interacoesFiltradas.length} de {interacoesPagas?.length ?? 0} interações pagas
        </p>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTES COMPARTILHADOS
// ==========================================
function KpiCard({ label, value, variant }: { label: string; value: number; variant: "success" | "warning" | "info" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg ring-1",
            variant === "success" && "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30",
            variant === "warning" && "bg-amber-500/15 text-amber-600 ring-amber-500/30",
            variant === "info" && "bg-primary/15 text-primary ring-primary/30",
          )}
        >
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">
            {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function FaturaDialog({ id_contrato, fatura, onClose }: { id_contrato: string; fatura?: any; onClose: () => void }) {
  const create = useCreateFatura();
  const update = useUpdateFatura();
  const isEditing = !!fatura;

  const [dataVencimento, setDataVencimento] = useState(
    fatura?.data_vencimento ? fatura.data_vencimento.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [valor, setValor] = useState(fatura ? String(fatura.valor_original) : "");
  const [status, setStatus] = useState(fatura?.status || "Pendente");
  const [dataPagamento, setDataPagamento] = useState(fatura?.data_pagamento ? fatura.data_pagamento.slice(0, 10) : "");
  const [valorPago, setValorPago] = useState(fatura?.valor_pago ? String(fatura.valor_pago) : "");

  const isLoading = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || !dataVencimento) {
      toast.error("Preencha o valor e a data de vencimento.");
      return;
    }

    const payload = {
      id_contrato: id_contrato,
      valor_original: Number(valor),
      data_vencimento: dataVencimento,
      status: status,
      data_pagamento: status === "Pago" && dataPagamento ? dataPagamento : null,
      valor_pago: status === "Pago" ? Number(valorPago || valor) : null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: fatura.id_fatura, data: payload });
        toast.success("Fatura atualizada com sucesso!");
      } else {
        await create.mutateAsync(payload);
        toast.success("Fatura criada com sucesso!");
      }
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar a faturar.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Fatura" : "Nova Fatura Manual"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Base (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status da Cobrança</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Data de Vencimento</Label>
            <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
          </div>

          {status === "Pago" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs">Data do Pagamento</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Pago (R$)</Label>
                <Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar Cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}