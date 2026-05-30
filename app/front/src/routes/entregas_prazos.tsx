import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CalendarDays, Loader2, Plus, Pencil, Trash2, Search, FilterX } from "lucide-react";
import {
  useEmpresas,
  useTodosContratos,
  useEntregas,
  useCreateEntrega,
  useUpdateEntrega,
  useDeleteEntrega,
  useModelos,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import type { UUID } from "@/lib/api/types";

export const Route = createFileRoute("/entregas_prazos")({
  head: () => ({ meta: [{ title: "Entregas e Prazos — Gestão do Cuidado" }] }),
  component: EntregasPrazosPage,
});

// ==========================================
// UTILITÁRIOS
// ==========================================
const formatarData = (data: string | null | undefined) => {
  if (!data) return "—";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const calcularDiasRestantes = (dataLimite: string) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(dataLimite + "T00:00:00");
  const diffTime = limite.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function EntregasPrazosPage() {
  const [idEmpresa, setIdEmpresa] = useState<string>("todas");
  const [idContrato, setIdContrato] = useState<string>("todas");
  const [statusFiltro, setStatusFiltro] = useState<string>("todas");
  const [buscaLocal, setBuscaLocal] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<any>(null);

  // Form states
  const [formContrato, setFormContrato] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formPrazo, setFormPrazo] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState("Pendente");

  const empresas = useEmpresas();
  const { data: contratos } = useTodosContratos();   // retorna TODOS os contratos (já com joins)
  const { data: modelos } = useModelos();

  const modelosMap = useMemo(() => {
  if (!modelos) return {};
  const map: Record<string, string> = {};
  modelos.forEach((m: any) => {
    map[m.id_modelo] = m.nome_modelo;
  });
  return map;
}, [modelos]);
const { data: entregas, isLoading } = useEntregas({
  id_contrato: idContrato !== "todos" ? idContrato : undefined,
  status_entrega: statusFiltro !== "todas" ? statusFiltro : undefined,
});
  const create = useCreateEntrega();
  const update = useUpdateEntrega();
  const remove = useDeleteEntrega();

 const contratosDisponiveis = useMemo(() => {
  if (!contratos) return [];
  return contratos.filter((c: any) => {
    if (c.status_contrato !== "Ativo") return false;
    if (idEmpresa !== "todas" && c.id_cliente !== idEmpresa) return false;
    return true;
  });
}, [contratos, idEmpresa]);

  const resetForm = () => {
    setFormContrato("");
    setFormDescricao("");
    setFormPrazo(new Date().toISOString().slice(0, 10));
    setFormStatus("Pendente");
  };

  const handleOpenNew = () => {
    resetForm();
    setEditingEntrega(null);
    setDialogOpen(true);
  };

  const handleEdit = (entrega: any) => {
    setEditingEntrega(entrega);
    setFormContrato(entrega.id_contrato);
    setFormDescricao(entrega.descricao_entrega);
    setFormPrazo(entrega.data_prazo_limite);
    setFormStatus(entrega.status_entrega || "Pendente");
    setDialogOpen(true);
  };

  // ✅ Substituir window.confirm pelo ConfirmDialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContrato) {
      toast.error("Selecione um contrato");
      return;
    }

    const payload = {
      id_contrato: formContrato,
      descricao_entrega: formDescricao,
      data_prazo_limite: formPrazo,
      status_entrega: formStatus,
    };

    try {
      if (editingEntrega) {
        await update.mutateAsync({ id: editingEntrega.id_entrega, data: payload });
        toast.success("Entrega atualizada!");
      } else {
        await create.mutateAsync(payload);
        toast.success("Entrega agendada!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar entrega.");
    }
  };

  const entregasFiltradas = useMemo(() => {
    if (!entregas) return [];
    if (!buscaLocal) return entregas;
    const termo = buscaLocal.toLowerCase();
    return entregas.filter(
      (e: any) =>
        e.descricao_entrega?.toLowerCase().includes(termo) ||
        e.status_entrega?.toLowerCase().includes(termo)
    );
  }, [entregas, buscaLocal]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl flex flex-col gap-6 p-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entregas e Prazos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as entregas vinculadas aos contratos ativos.
            </p>
          </div>
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Entrega
          </Button>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={idEmpresa} onValueChange={(v) => { setIdEmpresa(v); setIdContrato("todos"); }}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.data?.map((e: any) => (
                <SelectItem key={e.id_cliente} value={e.id_cliente}>{e.nome_empresa}</SelectItem>
              ))}
            </SelectContent>
          </Select>

         <Select value={idContrato} onValueChange={setIdContrato}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os contratos</SelectItem>
              {contratosDisponiveis.map((c: any) => (
                <SelectItem key={c.id_contrato} value={c.id_contrato}>
                  {empresas.data?.find((e: any) => e.id_cliente === c.id_cliente)?.nome_empresa} – {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_acordado)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar entrega..."
              value={buscaLocal}
              onChange={(e) => setBuscaLocal(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => { setIdEmpresa("todas"); setIdContrato(""); setStatusFiltro("todas"); setBuscaLocal(""); }}>
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        {/* TABELA */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded skeleton-shimmer" />
              ))}
            </div>
          ) : entregasFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium">Contrato</th>
                    <th className="text-left px-4 py-3 font-medium">Descrição Entrega</th>
                    <th className="text-left px-4 py-3 font-medium">Prazo Limite</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Dias</th>
                    <th className="w-[100px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entregasFiltradas.map((entrega: any) => {
                    const contrato = contratos?.find((c: any) => c.id_contrato === entrega.id_contrato);
                    const empresa = empresas.data?.find((e: any) => e.id_cliente === contrato?.id_cliente);
                    const dias = calcularDiasRestantes(entrega.data_prazo_limite);
                    const atrasado = dias < 0 && entrega.status_entrega !== "Concluído";
                    const statusColor = entrega.status_entrega === "Concluído"
                      ? "bg-emerald-100 text-emerald-700"
                      : atrasado
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700";

                    return (
                      <tr key={entrega.id_entrega} className="hover-row">
                        <td className="px-4 py-3">{empresa?.nome_empresa || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {contrato && modelosMap[contrato.id_modelo] 
                            ? modelosMap[contrato.id_modelo] 
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{entrega.descricao_entrega}</td>
                        <td className="px-4 py-3 font-mono">{formatarData(entrega.data_prazo_limite)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {entrega.status_entrega || "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {entrega.status_entrega === "Concluído" ? (
                            <span className="text-emerald-600 font-medium">✓</span>
                          ) : atrasado ? (
                            <span className="text-red-600 font-medium">{Math.abs(dias)}d atraso</span>
                          ) : (
                            <span className="text-muted-foreground">{dias}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entrega)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(entrega.id_entrega)}>
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
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma entrega agendada. Que tal criar uma agora?</p>
            </div>
          )}
        </div>
      </div>

      {/* DIÁLOGO DE CRIAÇÃO/EDIÇÃO */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEntrega ? "Editar Entrega" : "Nova Entrega"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Contrato *</Label>
              <Select value={formContrato} onValueChange={setFormContrato} disabled={!!editingEntrega}>
                <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                <SelectContent>
                  {contratosDisponiveis.map((c: any) => (
                    <SelectItem key={c.id_contrato} value={c.id_contrato}>
                      {empresas.data?.find((e: any) => e.id_cliente === c.id_cliente)?.nome_empresa || "Empresa"} – {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_acordado)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Entrega</Label>
              <Textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={3} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo Limite</Label>
                <Input type="date" value={formPrazo} onChange={(e) => setFormPrazo(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir entrega?"
        description="Esta ação não pode ser desfeita. A entrega será removida permanentemente."
        onConfirm={async () => {
          if (itemToDelete) {
            try {
              await remove.mutateAsync(itemToDelete);
              toast.success("Entrega removida.");
            } catch {
              toast.error("Erro ao excluir entrega.");
            }
          }
          setDeleteOpen(false);
        }}
        loading={remove.isPending}
      />
    </DashboardLayout>
  );
}