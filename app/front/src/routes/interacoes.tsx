import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ClipboardList, Loader2, Pencil, Trash2, Search, FilterX } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useCreateInteracao,
  useInteracoesPorCliente,
  useUpdateInteracao,
  useEmpresas,
  useDeleteInteracao,
  useTodasInteracoes,
} from "@/lib/api/hooks";
import type { StatusFinanceiro } from "@/lib/api/types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

// Utilitários
const getLocalDatetimeString = (date = new Date()) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  return localISOTime;
};

const formatarMoeda = (valor: number | null | undefined) => {
  if (!valor) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
};

export const Route = createFileRoute("/interacoes")({
  head: () => ({ meta: [{ title: "Interações — Gestão do Cuidado" }] }),
  component: InteracoesPage,
});

function InteracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState("registrar");

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // crm
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Interações</h1>
          <p className="text-sm text-muted-foreground">
            Registre e acompanhe o histórico de contatos com clientes.
          </p>
        </div>

        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registrar" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Registrar Interação
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <Search className="h-4 w-4" />
              Linha do Tempo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrar" className="mt-6 tab-content-enter">
            <RegistrarTab />
          </TabsContent>

          <TabsContent value="historico" className="mt-6 tab-content-enter">
            <HistoricoTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ==========================================
// ABA 1: REGISTRAR INTERAÇÃO
// ==========================================
function RegistrarTab() {
  const empresas = useEmpresas();
  const create = useCreateInteracao();
  const navigate = useNavigate();

  const [idCliente, setIdCliente] = useState<string>(""); // ✅ Corrigido: vazio para obrigar seleção
  const [tipo, setTipo] = useState("Visita");
  const [dataHora, setDataHora] = useState(() => getLocalDatetimeString());
  const [feedback, setFeedback] = useState("");
  const [grauUrgencia, setGrauUrgencia] = useState("Baixo");
  const [statusFinanceiro, setStatusFinanceiro] = useState<StatusFinanceiro>("Não Paga");
  const [valorCobrado, setValorCobrado] = useState<string>("");
  const [criacaoStatusPagamento, setCriacaoStatusPagamento] = useState("Pendente");
  const [nota, setNota] = useState<string>("");

  useEffect(() => {
    if (statusFinanceiro === "Não Paga") {
      setValorCobrado("");
    }
  }, [statusFinanceiro]);

  const resetForm = () => {
    setTipo("Visita");
    setFeedback("");
    setGrauUrgencia("Baixo");
    setStatusFinanceiro("Não Paga");
    setValorCobrado("");
    setCriacaoStatusPagamento("Pendente");
    setNota("");
    setDataHora(getLocalDatetimeString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente) {
      toast.error("Selecione uma empresa");
      return;
    }
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
      status_pagamento: criacaoStatusPagamento,
      nota: nota ? Number(nota) : null,
    };

    try {
      await create.mutateAsync(payload);
      toast.success("Interação registrada com sucesso!", {
        action: {
          label: "Ver",
          onClick: () => navigate({ to: "/empresas/$id", params: { id: idCliente } }),
        },
      });
      resetForm();
    } catch {
      toast.error("Erro ao registrar interação.");
    }
  };

  return (
    <div className="animate-fade-in-up">
      <Card className="w-full border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Nova Interação</CardTitle>
              <p className="text-sm text-muted-foreground">Preencha os dados do contato com o cliente</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Empresa cliente *</Label>
                  <Select value={idCliente} onValueChange={setIdCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Para qual cliente estamos olhando hoje?" />
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
                  <Label className="text-xs">Tipo de interação</Label>
                  <Select value={tipo} onValueChange={setTipo}>
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
                  <Select value={grauUrgencia} onValueChange={setGrauUrgencia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status Financeiro</Label>
                  <Select
                    value={statusFinanceiro}
                    onValueChange={(value: StatusFinanceiro) => setStatusFinanceiro(value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não Paga">Não Paga</SelectItem>
                      <SelectItem value="Paga">Paga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {statusFinanceiro === "Paga" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor Cobrado (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={valorCobrado}
                        onChange={(e) => setValorCobrado(e.target.value)}
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status do Pagamento</Label>
                      <Select value={criacaoStatusPagamento} onValueChange={setCriacaoStatusPagamento}>
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
                  <Label className="text-xs">Data e hora</Label>
                  <Input
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nota (0-10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={nota}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || (Number(val) >= 0 && Number(val) <= 10)) {
                        setNota(val);
                      }
                    }}
                    placeholder="0 a 10"
                  />
                </div>
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

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={create.isPending} className="gap-2">
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// ABA 2: LINHA DO TEMPO (HISTÓRICO)
// ==========================================
function HistoricoTab() {
  const empresas = useEmpresas();
  const update = useUpdateInteracao();
  const remove = useDeleteInteracao();
  const navigate = useNavigate();

  const [idCliente, setIdCliente] = useState<string>("todas");
  const [buscaLocal, setBuscaLocal] = useState("");

  const { data: interacoesEspecificas, isLoading: loadingEspecifico } = useInteracoesPorCliente(
    idCliente && idCliente !== "todas" ? idCliente : undefined
  );
  const { data: todasInteracoes, isLoading: loadingTodas } = useTodasInteracoes();

  const listaInteracoes = idCliente === "todas" ? todasInteracoes : interacoesEspecificas;
  const isLoading = idCliente === "todas" ? loadingTodas : loadingEspecifico;

  // Diálogo de edição
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTipo, setEditTipo] = useState("Visita");
  const [editDataHora, setEditDataHora] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [editGrau, setEditGrau] = useState("Baixo");
  const [editStatusFinanceiro, setEditStatusFinanceiro] = useState<StatusFinanceiro>("Não Paga");
  const [editValorCobrado, setEditValorCobrado] = useState("");
  const [editStatusPagamento, setEditStatusPagamento] = useState("Pendente");
  const [editNota, setEditNota] = useState<string>("");

  // Diálogo de confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const interacoesFiltradas = listaInteracoes?.filter((item: any) => {
    if (!buscaLocal) return true;
    const termo = buscaLocal.toLowerCase();
    return (
      item.feedback_anotacoes?.toLowerCase().includes(termo) ||
      item.tipo_interacao?.toLowerCase().includes(termo) ||
      item.grau_urgencia?.toLowerCase().includes(termo)
    );
  }) ?? [];

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditTipo(item.tipo_interacao || "Visita");
    setEditDataHora(
      item.data_hora
        ? getLocalDatetimeString(new Date(item.data_hora))
        : getLocalDatetimeString()
    );
    setEditFeedback(item.feedback_anotacoes || "");
    setEditGrau(item.grau_urgencia || "Baixo");
    setEditStatusFinanceiro(item.status_financeiro || "Não Paga");
    setEditValorCobrado(item.valor_cobrado ? String(item.valor_cobrado) : "");
    setEditStatusPagamento(item.status_pagamento || "Pendente");
    setEditNota(item.nota != null ? String(item.nota) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const payload = {
      id_cliente: editingItem.id_cliente,
      tipo_interacao: editTipo,
      data_hora: editDataHora,
      feedback_anotacoes: editFeedback,
      grau_urgencia: editGrau,
      status_financeiro: editStatusFinanceiro,
      valor_cobrado:
        editStatusFinanceiro === "Paga" ? parseFloat(editValorCobrado || "0") : null,
      status_pagamento: editStatusPagamento,
      nota: editNota ? Number(editNota) : null,
    };
    try {
      await update.mutateAsync({ id: editingItem.id_interacao, data: payload });
      toast.success("Interação atualizada com sucesso!", {
        action: {
          label: "Ver",
          onClick: () => navigate({ to: "/empresas/$id", params: { id: editingItem.id_cliente } }),
        },
      });
      setEditingItem(null);
    } catch {
      toast.error("Erro ao atualizar interação.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={idCliente} onValueChange={(v) => setIdCliente(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma empresa..." />
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
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded skeleton-shimmer" />
            ))}
          </div>
        ) : interacoesFiltradas.length > 0 ? (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {interacoesFiltradas.map((item: any) => {
              const idInteracao = item.id_interacao;
              if (!idInteracao) return null;

              return (
                <div key={idInteracao} className="group p-4 hover-row transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {item.tipo_interacao}
                        </span>
                        {item.grau_urgencia && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              item.grau_urgencia === "Alto"
                                ? "bg-red-100 text-red-700"
                                : item.grau_urgencia === "Médio"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            Urgência: {item.grau_urgencia}
                          </span>
                        )}
                        {item.status_financeiro === "Paga" && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold border ${
                              item.status_pagamento === "Pago"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }`}
                          >
                            {item.valor_cobrado
                              ? `Paga - ${formatarMoeda(item.valor_cobrado)}`
                              : "Paga"}
                            {item.status_pagamento === "Pago"
                              ? " ✓ Pago"
                              : " (Pendente)"}
                          </span>
                        )}
                        {item.nota != null && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              item.nota >= 8
                                ? "bg-emerald-100 text-emerald-700"
                                : item.nota >= 6
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            Nota: {item.nota}/10
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {item.data_hora
                            ? new Date(item.data_hora).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Data não informada"}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap pt-1 font-medium text-foreground">
                        {item.feedback_anotacoes || (
                          <span className="text-muted-foreground italic text-xs">
                            Sem anotações registadas.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditClick(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(idInteracao)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : idCliente && idCliente !== "todas" ? (
          <p className="text-sm text-muted-foreground italic p-4">
            Este cliente ainda não teve nenhum contato registrado.
          </p>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {idCliente === "todas" 
              ? "Nenhuma interação registrada no sistema." 
              : "Selecione uma empresa para visualizar o histórico."}
          </div>
        )}
      </div>

      {/* DIÁLOGO DE EDIÇÃO */}
      {editingItem && (
        <Dialog open onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Interação</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Status Financeiro</Label>
                <Select value={editStatusFinanceiro} onValueChange={(v: StatusFinanceiro) => setEditStatusFinanceiro(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Paga">Não Paga</SelectItem>
                    <SelectItem value="Paga">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editStatusFinanceiro === "Paga" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Cobrado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValorCobrado}
                      onChange={(e) => setEditValorCobrado(e.target.value)}
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
                <Label className="text-xs">Nota (0-10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={editNota}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (Number(val) >= 0 && Number(val) <= 10)) {
                      setEditNota(val);
                    }
                  }}
                  placeholder="0 a 10"
                />
              </div>
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
                  rows={4}
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
        title="Excluir interação?"
        description="Esta ação não pode ser desfeita. A interação será removida permanentemente."
        onConfirm={async () => {
          if (itemToDelete) {
            try {
              await remove.mutateAsync(itemToDelete);
              toast.success("Interação removida.");
            } catch {
              toast.error("Erro ao excluir interação.");
            }
          }
          setDeleteOpen(false);
        }}
        loading={remove.isPending}
      />
    </div>
  );
}