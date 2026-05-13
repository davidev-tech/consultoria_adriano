import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartPulse, Loader2, Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreatePaciente, useEmpresas } from "@/lib/api/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes")({
  head: () => ({ meta: [{ title: "Pacientes — Gestão do Cuidado" }] }),
  component: PacientesPage,
});

function PacientesPage() {
  const empresas = useEmpresas();
  const [open, setOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // operacional
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro de pacientes vinculados às empresas clientes.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo paciente
              </Button>
            </DialogTrigger>
            <NovoPacienteDialog
              empresas={empresas.data ?? []}
              onClose={() => setOpen(false)}
            />
          </Dialog>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <HeartPulse className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-4 text-base font-semibold">Cadastro de Pacientes</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            A API atual expõe apenas o endpoint de criação (POST /pacientes). Use o botão acima
            para registrar novos pacientes vinculados à empresa cliente.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function NovoPacienteDialog({
  empresas,
  onClose,
}: {
  empresas: { id_cliente: string; nome_empresa: string }[];
  onClose: () => void;
}) {
  const create = useCreatePaciente();
  const [idCliente, setIdCliente] = useState("");
  const [nome, setNome] = useState("");
  const [hist, setHist] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente || !nome.trim()) return;
    await create.mutateAsync({
      id_cliente: idCliente,
      nome: nome.trim(),
      historico_cuidados: hist || null,
    });
    toast.success("Paciente cadastrado");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo paciente</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Empresa cliente *</Label>
          <Select value={idCliente} onValueChange={setIdCliente}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id_cliente} value={e.id_cliente}>
                  {e.nome_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nome *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Histórico de cuidados</Label>
          <Textarea value={hist} onChange={(e) => setHist(e.target.value)} rows={4} />
        </div>
        {create.error && (
          <p className="text-xs text-destructive">{(create.error as Error).message}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
