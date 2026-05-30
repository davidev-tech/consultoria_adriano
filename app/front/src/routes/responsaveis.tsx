import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Users, Loader2, Plus, Pencil, Trash2, Search, FilterX } from "lucide-react";
import {
  useEmpresas,
  useCreateResponsavel,
  useUpdateResponsavel,
  useDeleteResponsavel,
  useResponsaveisList,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import type { UUID } from "@/lib/api/types";

interface ResponsavelForm {
  nome: string;
  cpf: string;
  cargo: string;
  id_cliente: string;
}

export const Route = createFileRoute("/responsaveis")({
  head: () => ({ meta: [{ title: "Responsáveis — Gestão do Cuidado" }] }),
  component: ResponsaveisPage,
});

function ResponsaveisPage() {
  const [idEmpresa, setIdEmpresa] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResp, setEditingResp] = useState<any>(null);

  const [form, setForm] = useState<ResponsavelForm>({
    nome: "",
    cpf: "",
    cargo: "",
    id_cliente: "",
  });

  const empresas = useEmpresas();
  const { data: responsaveis, isLoading } = useResponsaveisList({
    id_cliente: idEmpresa !== "todas" ? idEmpresa : undefined,
    busca: busca || undefined,
  });

  const create = useCreateResponsavel();
  const update = useUpdateResponsavel();
  const remove = useDeleteResponsavel();

  // Diálogo de confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ nome: "", cpf: "", cargo: "", id_cliente: "" });
  };

  const handleOpenNew = () => {
    resetForm();
    setEditingResp(null);
    setDialogOpen(true);
  };

  const handleEdit = (resp: any) => {
    setEditingResp(resp);
    setForm({
      nome: resp.nome,
      cpf: resp.cpf || "",
      cargo: resp.cargo || "",
      id_cliente: resp.id_cliente,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.id_cliente) {
      toast.error("Nome e empresa são obrigatórios.");
      return;
    }

    const payload = {
      id_cliente: form.id_cliente,
      nome: form.nome,
      cpf: form.cpf || undefined,
      cargo: form.cargo || undefined,
    };

    try {
      if (editingResp) {
        await update.mutateAsync({ id: editingResp.id_responsavel, data: payload });
        toast.success("Responsável atualizado!");
      } else {
        await create.mutateAsync(payload);
        toast.success("Responsável cadastrado!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl flex flex-col gap-6 p-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Responsáveis</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os contatos das empresas clientes.
            </p>
          </div>
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Responsável
          </Button>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={idEmpresa} onValueChange={setIdEmpresa}>
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

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => { setIdEmpresa("todas"); setBusca(""); }}>
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
          ) : responsaveis && responsaveis.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">CPF</th>
                  <th className="text-left px-4 py-3 font-medium">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium">Empresa</th>
                  <th className="w-[100px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {responsaveis.map((r: any) => (
                  <tr key={r.id_responsavel} className="hover-row">
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.cpf || "—"}</td>
                    <td className="px-4 py-3">{r.cargo || "—"}</td>
                    <td className="px-4 py-3">{r.empresa_nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id_responsavel)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p>Nenhum responsável encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIÁLOGO DE CRIAÇÃO/EDIÇÃO */}
      {dialogOpen && (
        <Dialog open onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>{editingResp ? "Editar Responsável" : "Novo Responsável"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.id_cliente} onValueChange={(v) => setForm({...form, id_cliente: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.data?.map((e: any) => (
                      <SelectItem key={e.id_cliente} value={e.id_cliente}>{e.nome_empresa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} />
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
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir responsável?"
        description="Esta ação não pode ser desfeita. O responsável será removido permanentemente."
        onConfirm={async () => {
          if (itemToDelete) {
            try {
              await remove.mutateAsync(itemToDelete);
              toast.success("Responsável removido.");
            } catch {
              toast.error("Erro ao excluir responsável.");
            }
          }
          setDeleteOpen(false);
        }}
        loading={remove.isPending}
      />
    </DashboardLayout>
  );
}