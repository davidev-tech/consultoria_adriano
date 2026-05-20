import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useCreatePagamento,
  useEmpresas,
  usePagamentosPorContrato,
  useTodosContratos,
  useUpdatePagamento,
  useDeletePagamento,
} from "@/lib/api/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Gestão do Cuidado" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const empresas = useEmpresas();
  const contratos = useTodosContratos();
  const remove = useDeletePagamento();
  
  const [idContrato, setIdContrato] = useState("");
  const pagamentos = usePagamentosPorContrato(idContrato || undefined);
  const [open, setOpen] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<any>(null);

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

  // AUTOMAÇÃO FINANCEIRA MATEMÁTICA
  const totals = useMemo(() => {
    const list = pagamentos.data ?? [];
    const valorMestreContrato = contratoSelecionado ? Number(contratoSelecionado.valor_acordado) : 0;
    
    // Soma apenas o que já está com status de "Pago"
    const pago = list
      .filter((p) => (p.status_pagamento ?? "").toLowerCase() === "pago")
      .reduce((a, p) => a + Number(p.valor), 0);

    // O que falta é a subtração exata da Receita Acordada pelo que já foi quitado
    const falta = Math.max(0, valorMestreContrato - pago);

    return {
      receitaAcordada: valorMestreContrato,
      pago,
      falta,
    };
  }, [pagamentos.data, contratoSelecionado]);

  const handleEditClick = (pagamento: any) => {
    setEditingPagamento(pagamento);
    setOpen(true);
  };

  const handleDeleteClick = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm("Deseja excluir permanentemente este registro de pagamento?")) {
      try {
        await remove.mutateAsync(id);
        toast.success("Pagamento removido com sucesso.");
      } catch (err) {
        toast.error("Erro ao deletar o pagamento.");
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
            <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Por contrato.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2" 
                disabled={!idContrato}
                onClick={() => setEditingPagamento(null)}
              >
                <Plus className="h-4 w-4" /> Novo pagamento
              </Button>
            </DialogTrigger>
            <PagamentoDialog 
              key={editingPagamento?.id_pagamento || "novo"} 
              idContrato={idContrato} 
              pagamento={editingPagamento}
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
            {/* GRID ATUALIZADO PARA 3 COLUNAS AUTOMÁTICAS */}
            <div className="grid gap-3 md:grid-cols-3">
              <KpiCard label="Receita Acordada" value={totals.receitaAcordada} variant="info" />
              <KpiCard label="Total Pago" value={totals.pago} variant="success" />
              <KpiCard label="Falta Pagar (Saldo)" value={totals.falta} variant="warning" />
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagamentos.isLoading && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto opacity-50" />
                      </td>
                    </tr>
                  )}
                  {pagamentos.data?.map((p, i) => {
                    const status = (p.status_pagamento ?? "Pendente").toLowerCase();
                    const isPago = status === "pago";
                    return (
                      <tr key={p.id_pagamento ?? i} className="group hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.data_pagamento
                            ? new Date(p.data_pagamento).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.forma_pagamento ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              isPago
                                ? "bg-success/15 text-success"
                                : "bg-warning/15 text-warning",
                            )}
                          >
                            {p.status_pagamento ?? "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {Number(p.valor).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditClick(p)}
                              title="Editar pagamento"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(p.id_pagamento)}
                              title="Deletar pagamento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!pagamentos.isLoading && (pagamentos.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                        Nenhum pagamento registrado neste contrato.
                      </td>
                    </tr>
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

function KpiCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "info";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg ring-1",
            variant === "success" && "bg-success/15 text-success ring-success/30",
            variant === "warning" && "bg-warning/15 text-warning ring-warning/30",
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

function PagamentoDialog({
  idContrato,
  pagamento,
  onClose,
}: {
  idContrato: string;
  pagamento?: any;
  onClose: () => void;
}) {
  const create = useCreatePagamento();
  const update = useUpdatePagamento();
  const isEditing = !!pagamento;

  const [valor, setValor] = useState(pagamento ? String(pagamento.valor) : "");
  const [forma, setForma] = useState(pagamento?.forma_pagamento || "PIX");
  const [status, setStatus] = useState(pagamento?.status_pagamento || "Pago");
  const [data, setData] = useState(() => {
    if (pagamento?.data_pagamento) {
      return new Date(pagamento.data_pagamento).toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });

  const isLoading = create.isPending || update.isPending;
  const currentError = create.error || update.error;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor) return;

    const payload = {
      id_contrato: idContrato,
      valor: Number(valor),
      forma_pagamento: forma,
      status_pagamento: status,
      data_pagamento: new Date(data).toISOString(),
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: pagamento.id_pagamento, data: payload });
        toast.success("Pagamento atualizado com sucesso!");
      } else {
        await create.mutateAsync(payload);
        toast.success("Pagamento registrado com sucesso!");
      }
      onClose();
    } catch (error) {
      toast.error("Ocorreu um erro ao processar o pagamento.");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar pagamento" : "Novo pagamento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data</Label>
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {currentError && (
          <p className="text-xs text-destructive">{(currentError as Error).message}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}