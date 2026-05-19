import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa } from "@/lib/api/hooks";
import type { EmpresaCreate, Empresa } from "@/lib/api/types";
import { ResumoClientes } from "@/components/ResumoClientes";

export const Route = createFileRoute("/empresas")({
  head: () => ({ title: "Empresas - Gestão do Cuidado" }),
  component: EmpresasPage,
});

function EmpresasPage() {
  // AQUI FOI CORRIGIDO: "empresas" agora já é o Array correto!
  const { data: empresas, isLoading } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);

  const handleEditClick = (empresa: Empresa) => {
    setEmpresaEditando(empresa);
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setEmpresaEditando(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // cadastros / clientes
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              {empresas?.length ?? 0} empresa(s) na base.
            </p>
          </div>

          <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEmpresaEditando(null)}>
                <Plus className="h-4 w-4" /> Nova empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
               <EmpresaDialogForm 
                 onClose={handleCloseModal} 
                 empresaInicial={empresaEditando} 
               />
            </DialogContent>
          </Dialog>
        </div>

        {(empresas?.length ?? 0) > 0 && (
          <ResumoClientes empresas={empresas ?? []} isLoading={isLoading} />
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-card/50"
              />
            ))}

          {empresas?.map((e) => (
            <div
              key={e.id_cliente}
              className="group rounded-lg border border-border bg-card p-4 shadow-card transition-all hover:border-primary/50 hover:shadow-card-hover relative"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                   <Link
                      to="/empresas/$id"
                      params={{ id: e.id_cliente }}
                      className="font-semibold truncate group-hover:text-primary block"
                    >
                      {e.nome_empresa}
                   </Link>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {e.cnpj ?? "Sem CNPJ"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    📍 {e.localizacao ?? "Localização não informada"} • {" "}
                    {e.servico_prestado ?? "-"}
                  </p>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditClick(e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ExcluirEmpresaDialog empresa={e} />
              </div>

            </div>
          ))}

          {!isLoading && (empresas?.length ?? 0) === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma empresa cadastrada. Clique em "Nova empresa" para começar.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmpresaDialogForm({ onClose, empresaInicial }: { onClose: () => void, empresaInicial: Empresa | null }) {
  const create = useCreateEmpresa();
  const update = useUpdateEmpresa();
  const isEditing = !!empresaInicial;
  const isLoading = create.isPending || update.isPending;

  const [form, setForm] = useState<EmpresaCreate>({
    nome_empresa: empresaInicial?.nome_empresa || "",
    cnpj: empresaInicial?.cnpj || "",
    localizacao: empresaInicial?.localizacao || "",
    servico_prestado: empresaInicial?.servico_prestado || "",
  });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.nome_empresa.trim()) return;

    const payload = {
      nome_empresa: form.nome_empresa.trim(),
      cnpj: form.cnpj || null,
      localizacao: form.localizacao || null,
      servico_prestado: form.servico_prestado || null,
    };

    if (isEditing && empresaInicial) {
      update.mutate(
        { id: empresaInicial.id_cliente, data: payload },
        { onSuccess: onClose }
      );
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome da empresa *">
          <Input
            value={form.nome_empresa}
            onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
            required
          />
        </Field>
        <Field label="CNPJ">
          <Input
            value={form.cnpj ?? ""}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </Field>
        <Field label="Localização">
          <Input
            value={form.localizacao ?? ""}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
        </Field>
        <Field label="Serviço prestado">
          <Input
            value={form.servico_prestado ?? ""}
            onChange={(e) => setForm({ ...form, servico_prestado: e.target.value })}
          />
        </Field>
        
        {(create.error || update.error) && (
          <p className="text-xs text-destructive">
            {create.error?.message || update.error?.message}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function ExcluirEmpresaDialog({ empresa }: { empresa: Empresa }) {
    const [open, setOpen] = useState(false);
    const deleteMutation = useDeleteEmpresa();
  
    const handleDelete = () => {
      deleteMutation.mutate(empresa.id_cliente, {
        onSuccess: () => setOpen(false)
      });
    };
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir empresa?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
              <p className="text-sm text-muted-foreground">
                  Tem certeza que deseja excluir a empresa <strong>{empresa.nome_empresa}</strong>? Esta ação não pode ser desfeita.
              </p>
              {deleteMutation.error && (
                   <p className="text-xs text-destructive mt-2">
                   Erro ao excluir: {deleteMutation.error.message}
                 </p>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending} className="gap-2">
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}