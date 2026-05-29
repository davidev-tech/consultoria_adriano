import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ClipboardList, Loader2, Pencil, Trash2, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCreateInteracao, 
  useInteracoesPorCliente, 
  useUpdateInteracao, 
  useEmpresas, 
  useDeleteInteracao 
} from "@/lib/api/hooks";
import type { StatusFinanceiro } from "@/lib/api/types";
import { toast } from "sonner";

// Utilitário para ajustar o fuso horário (UTC-3) no input datetime-local
const getLocalDatetimeString = (date = new Date()) => {
  const tzOffset = date.getTimezoneOffset() * 60000; 
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  return localISOTime;
};

// Formata valor para exibição
const formatarMoeda = (valor: number | null | undefined) => {
  if (!valor) return '';
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(valor);
};

export const Route = createFileRoute("/interacoes")({
  head: () => ({ meta: [{ title: "Registrar Interação — Gestão do Cuidado" }] }),
  component: InteracoesPage,
});

function InteracoesPage() {
  const empresas = useEmpresas();
  const create = useCreateInteracao();
  const update = useUpdateInteracao();
  const remove = useDeleteInteracao();
  
  const [grauUrgencia, setGrauUrgencia] = useState("Baixo");
  const [statusFinanceiro, setStatusFinanceiro] = useState<StatusFinanceiro>("Não Paga");
  const [valorCobrado, setValorCobrado] = useState<string>("");
  const [idCliente, setIdCliente] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipo, setTipo] = useState("Visita");
  const [dataHora, setDataHora] = useState(() => getLocalDatetimeString());
  const [feedback, setFeedback] = useState("");
  const [editStatusPagamento, setEditStatusPagamento] = useState("Pendente"); // 👈 NOVO
  
  const { data: listaInteracoes, isLoading: loadingInteracoes } = useInteracoesPorCliente(idCliente || undefined);

  // Limpa o valor cobrado quando status muda para "Não Paga"
  useEffect(() => {
    if (statusFinanceiro === "Não Paga") {
      setValorCobrado("");
    }
  }, [statusFinanceiro]);

  const cancelarEdicao = () => {
    setEditingId(null);
    setTipo("Visita");
    setFeedback("");
    setGrauUrgencia("Baixo");
    setStatusFinanceiro("Não Paga");
    setValorCobrado("");
    setEditStatusPagamento("Pendente"); // 👈 reseta também
    setDataHora(getLocalDatetimeString());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente) {
      toast.error("Selecione uma empresa");
      return;
    }

    // Validação: se Paga, valor é obrigatório
    if (statusFinanceiro === "Paga") {
      const valor = parseFloat(valorCobrado);
      if (!valorCobrado || isNaN(valor) || valor <= 0) {
        toast.error("Informe um valor cobrado válido para interações pagas");
        return;
      }
    }

    const payload = {
      id_cliente: idCliente,
      tipo_interacao: tipo,
      data_hora: dataHora,
      feedback_anotacoes: feedback,
      grau_urgencia: grauUrgencia,
      status_financeiro: statusFinanceiro,
      valor_cobrado: statusFinanceiro === "Paga" ? parseFloat(valorCobrado) : null,
      status_pagamento: editStatusPagamento, // 👈 NOVO CAMPO
    };

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: payload });
        toast.success("Interação atualizada com sucesso!");
        cancelarEdicao();
      } else {
        await create.mutateAsync(payload);
        toast.success("Interação registrada com sucesso!");
        setFeedback("");
        setGrauUrgencia("Baixo");
        setStatusFinanceiro("Não Paga");
        setValorCobrado("");
        setEditStatusPagamento("Pendente"); // 👈 reseta
      }
    } catch (err) {
      toast.error("Erro ao processar a requisição.");
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id_interacao);
    setTipo(item.tipo_interacao || "Visita");
    setFeedback(item.feedback_anotacoes || "");
    setGrauUrgencia(item.grau_urgencia || "Baixo");
    setStatusFinanceiro(item.status_financeiro || "Não Paga");
    setValorCobrado(item.valor_cobrado ? item.valor_cobrado.toString() : "");
    setEditStatusPagamento(item.status_pagamento || "Pendente"); // 👈 preenche
    if (item.data_hora) {
      setDataHora(getLocalDatetimeString(new Date(item.data_hora)));
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("Deseja excluir permanentemente esta interação do histórico de auditoria?")) {
      try {
        await remove.mutateAsync(id);
        toast.success("Interação removida.");
      } catch (err) {
        toast.error("Erro ao deletar.");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start">
        
        {/* COLUNA DO FORMULÁRIO */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // {editingId ? "modo edição / auditoria" : "consultor em campo"}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {editingId ? "Editar Interação" : "Registrar Interação"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editingId ? "Altere os dados salvos do histórico do cliente." : "Registre visitas, reuniões e feedbacks com cliente."}
            </p>
          </div>

          <form
            onSubmit={submit}
            className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{editingId ? "Modificar registro" : "Nova interação"}</p>
                  <p className="text-xs text-muted-foreground">{editingId ? "PUT /interacoes" : "POST /interacoes"}</p>
                </div>
              </div>
              {editingId && (
                <Button type="button" variant="ghost" size="icon" onClick={cancelarEdicao}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa cliente *</Label>
                <Select value={idCliente} onValueChange={setIdCliente} disabled={!!editingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.data?.map((e: any) => (
                      <SelectItem key={e.id_cliente} value={e.id_cliente}>
                        {e.nome_empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <label className="text-xs font-semibold text-muted-foreground">Grau de Urgência</label>
                <Select value={grauUrgencia} onValueChange={setGrauUrgencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* STATUS FINANCEIRO */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Status Financeiro</label>
                <Select value={statusFinanceiro} onValueChange={(value: StatusFinanceiro) => setStatusFinanceiro(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Paga">Não Paga</SelectItem>
                    <SelectItem value="Paga">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ✅ CAMPO VALOR COBRADO - CONDICIONAL */}
              {statusFinanceiro === "Paga" && (
                <>
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-xs">Valor Cobrado (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={valorCobrado}
                        onChange={(e) => setValorCobrado(e.target.value)}
                        placeholder="0,00"
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Valor efetivamente cobrado nesta interação
                    </p>
                  </div>
                  {/* 👇 NOVO: Status do Pagamento (só aparece se for Paga) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status do Pagamento</Label>
                    <Select value={editStatusPagamento} onValueChange={setEditStatusPagamento}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Feedback / Anotações</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Notas da visita, próximos passos, perceções..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelarEdicao}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={create.isPending || update.isPending} className="gap-2">
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Salvar Alterações" : "Registrar"}
              </Button>
            </div>
          </form>
        </div>

        {/* COLUNA DO HISTÓRICO */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Linha do Tempo de Atendimento</h2>
            <p className="text-sm text-muted-foreground">
              {idCliente ? "Registros de interações encontrados para este cliente." : "Selecione uma empresa para carregar os registos."}
            </p>
          </div>

          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {loadingInteracoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : listaInteracoes && listaInteracoes.length > 0 ? (
              listaInteracoes.map((item: any) => {
                const idInteracao = item.id_interacao;
                if (!idInteracao) return null;

                return (
                  <div 
                    key={idInteracao} 
                    className={`group rounded-lg border p-4 shadow-sm transition-all bg-card ${
                      editingId === idInteracao ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {item.tipo_interacao}
                          </span>
                          
                          {item.grau_urgencia && (
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              item.grau_urgencia === 'Alto' ? 'bg-red-100 text-red-700' : 
                              item.grau_urgencia === 'Médio' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              Urgência: {item.grau_urgencia}
                            </span>
                          )}

                          {/* ✅ TAG PAGA COM VALOR E STATUS PAGAMENTO */}
                          {item.status_financeiro === 'Paga' && (
                            <span className="rounded px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {item.valor_cobrado 
                                ? `Paga - ${formatarMoeda(item.valor_cobrado)}` 
                                : 'Paga'}
                              {item.status_pagamento === 'Pago' ? ' ✓ Pago' : ' (Pendente)'}
                            </span>
                          )}

                          <span className="text-xs text-muted-foreground">
                            {item.data_hora
                              ? new Date(item.data_hora).toLocaleString("pt-BR", {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                              : "Data não informada"}
                          </span>
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap pt-1 font-medium text-foreground">
                          {item.feedback_anotacoes || <span className="text-muted-foreground italic text-xs">Sem anotações registadas.</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          onClick={() => handleDeleteClick(idInteracao)}
                          title="Deletar permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : idCliente ? (
              <p className="text-sm text-muted-foreground italic py-4">Nenhuma interação encontrada para este cliente.</p>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aguardando a seleção do cliente no painel esquerdo...
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}