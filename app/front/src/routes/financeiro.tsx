import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useEmpresas,
  useTodosContratos,
  useFaturasPorContrato, // Substituindo a chamada antiga de pagamentos
  useCreateFatura,
  useUpdateFatura,
} from "@/lib/api/hooks"; 
import { toast } from "sonner";
export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Gestão do Cuidado" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [mesFiltro, setMesFiltro] = useState<string>(''); // Formato esperado: "YYYY-MM"
  const empresas = useEmpresas();
  const contratos = useTodosContratos();
  // fallback deletion using fetch when hook is not available
  const deleteFatura = async (id: string) => {
    const res = await fetch(`/api/faturas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    return await res.json();
  };
  const [idContrato, setIdContrato] = useState("");
  
  // Agora puxamos faturas diretamente da tabela nova!
  const faturasQuery = useFaturasPorContrato(idContrato || undefined);
  
  const [open, setOpen] = useState(false);
  const [editingFatura, setEditingFatura] = useState<any>(null);

  // Mapeia qual é o contrato que o usuário selecionou na tela
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

  // INTELIGÊNCIA FINANCEIRA: CÁLCULO DINÂMICO DE ATRAZOS E JUROS
  function calcularFaturamento(fatura: any) {
    if (fatura.status === "Pago" || fatura.data_pagamento) {
      return {
        status: "Pago",
        valorOriginal: Number(fatura.valor_original),
        valorAtualizado: Number(fatura.valor_pago || fatura.valor_original),
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

    // Regra de Juros Dinâmicos do Contrato Selecionado
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

  // PROCESSA E FILTRA AS FATURAS EM TEMPO REAL
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
      // Filtra pelo padrão do input type="month" (YYYY-MM)
      return fatura.data_vencimento.startsWith(mesFiltro);
    });
  }, [faturasQuery.data, mesFiltro, contratoSelecionado]);

  // AUTOMATIZAÇÃO DOS VALORES DOS CARDS (KPIs)
  const totals = useMemo(() => {
    const list = faturasQuery.data ?? [];
    
    // Soma o valor mestre de todas as parcelas geradas
    const receitaAcordada = list.reduce((a, f) => a + Number(f.valor_original), 0);
    
    // Soma o que já entrou em caixa líquido
    const pago = list
      .filter((f) => f.status === "Pago" || f.data_pagamento)
      .reduce((a, f) => a + Number(f.valor_pago || f.valor_original), 0);

    // Soma o valor total atualizado (com juros se houver) de tudo que está em aberto
    const falta = faturasProcessadas
      .filter((f) => f.statusCalculado !== "Pago")
      .reduce((a, f) => a + f.valorAtualizado, 0);

    return {
      receitaAcordada,
      pago,
      falta,
    };
  }, [faturasQuery.data, faturasProcessadas]);

  const handleEditClick = (fatura: any) => {
    setEditingFatura(fatura);
    setOpen(true);
  };

  const handleDeleteClick = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm("Deseja excluir permanentemente esta fatura?")) {
      try {
        await deleteFatura(id);
        toast.success("Fatura removida com sucesso.");
      } catch (err) {
        toast.error("Erro ao deletar a fatura.");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // financeiro
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Faturamento e Parcelas</h1>
            <p className="text-sm text-muted-foreground">Controle mensal do contrato ativo.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2" 
                disabled={!idContrato}
                onClick={() => setEditingFatura(null)}
              >
                <Plus className="h-4 w-4" /> Nova Fatura Manual
              </Button>
            </DialogTrigger>
            <FaturaDialog 
              key={editingFatura?.id_fatura || "novo"} 
              id_contrato={contratos} 
              fatura={editingFatura}
              onClose={() => setOpen(false)} 
            />
          </Dialog>
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
              <KpiCard label="Receita Total Contrato" value={totals.receitaAcordada} variant="info" />
              <KpiCard label="Total Arrecadado" value={totals.pago} variant="success" />
              <KpiCard label="Saldo Restante (A vencer/Atrasos)" value={totals.falta} variant="warning" />
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                    <th className="text-left px-4 py-3 font-medium">Data Recibo</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Valor Base</th>
                    <th className="text-right px-4 py-3 font-medium">Valor Atualizado / Pago</th>
                    <th className="w-[100px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {faturasProcessadas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        Nenhuma fatura encontrada para este período.
                      </td>
                    </tr>
                  ) : (
                    faturasProcessadas.map((f) => (
                      <tr key={f.id_fatura} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">
                          {new Date(f.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {f.data_pagamento ? new Date(f.data_pagamento).toLocaleDateString('pt-BR') : '—'}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// COMPONENTE KPI CARD
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

/// 1. Mudamos de idContrato para id_contrato aqui na declaração das props
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
      toast.error("Erro ao salvar a fatura.");
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
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status da Cobrança</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Data de Vencimento *</Label>
            <Input 
              type="date" 
              value={dataVencimento} 
              onChange={(e) => setDataVencimento(e.target.value)} 
              required 
            />
          </div>

          {status === "Pago" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-md border">
              <div className="space-y-1.5">
                <Label className="text-xs">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Pago (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  placeholder={valor}
                  required
                />
              </div>
            </div>
          )}

          {/* DIALOG FOOTER RESTAURADO AQUI! */}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar Cobrança"}
            </Button>
          </DialogFooter>
          
        </form>
      </DialogContent>
    </Dialog>
  );
}