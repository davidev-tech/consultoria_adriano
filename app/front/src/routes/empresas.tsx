import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateEmpresa, useEmpresas } from "@/lib/api/hooks";
import type { EmpresaCreate } from "@/lib/api/types";
import { ResumoClientes } from "@/components/ResumoClientes";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Gestão do Cuidado" }] }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const empresas = useEmpresas();
  const [open, setOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // cadastros / clientes
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              {empresas.data?.length ?? 0} empresa(s) na base.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova empresa
              </Button>
            </DialogTrigger>
            <NovaEmpresaDialog onClose={() => setOpen(false)} />
          </Dialog>
        </div>

        {(empresas.data?.length ?? 0) > 0 && (
          <ResumoClientes empresas={empresas.data ?? []} isLoading={empresas.isLoading} />
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {empresas.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-card/50"
              />
            ))}
          {empresas.data?.map((e) => (
            <Link
              key={e.id_cliente}
              to="/empresas/$id"
              params={{ id: e.id_cliente }}
              className="group rounded-lg border border-border bg-card p-4 shadow-card transition-all hover:border-primary/50 hover:shadow-[0_0_24px_-12px_var(--primary)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary">
                    {e.nome_empresa}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {e.cnpj ?? "sem CNPJ"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {e.localizacao ?? "Localização não informada"} ·{" "}
                    {e.servico_prestado ?? "—"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {!empresas.isLoading && (empresas.data?.length ?? 0) === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma empresa cadastrada. Clique em "Nova empresa" para começar.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function NovaEmpresaDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateEmpresa();
  const [form, setForm] = useState<EmpresaCreate>({
    nome_empresa: "",
    cnpj: "",
    localizacao: "",
    servico_prestado: "",
  });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.nome_empresa.trim()) return;
    await create.mutateAsync({
      nome_empresa: form.nome_empresa.trim(),
      cnpj: form.cnpj || null,
      localizacao: form.localizacao || null,
      servico_prestado: form.servico_prestado || null,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova empresa</DialogTitle>
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
        {create.error && (
          <p className="text-xs text-destructive">{(create.error as Error).message}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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
