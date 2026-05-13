import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateModelo, useModelos, useTodosContratos, useEmpresas } from "@/lib/api/hooks";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos — Gestão do Cuidado" }] }),
  component: ContratosPage,
});

function ContratosPage() {
  const modelos = useModelos();
  const contratos = useTodosContratos();
  const empresas = useEmpresas();
  const [open, setOpen] = useState(false);

  const empresaNome = (id: string) =>
    empresas.data?.find((e) => e.id_cliente === id)?.nome_empresa ?? id.slice(0, 8);
  const modeloNome = (id: string) =>
    modelos.data?.find((m) => m.id_modelo === id)?.nome_modelo ?? "—";

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Modelos */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                // catálogo
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Modelos de Contrato</h1>
              <p className="text-sm text-muted-foreground">
                Templates reutilizáveis para vínculo com empresas.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo modelo
                </Button>
              </DialogTrigger>
              <NovoModeloDialog onClose={() => setOpen(false)} />
            </Dialog>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modelos.data?.map((m) => (
              <div
                key={m.id_modelo}
                className="rounded-lg border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{m.nome_modelo}</h3>
                    <p className="text-xs text-muted-foreground">
                      {m.periodicidade_cobranca ?? "sem periodicidade"}
                    </p>
                    {m.descricao_padrao && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {m.descricao_padrao}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {modelos.isLoading && (
              <div className="col-span-full text-xs text-muted-foreground">Carregando…</div>
            )}
          </div>
        </section>

        {/* Contratos vinculados */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Contratos Vinculados</h2>
            <p className="text-xs text-muted-foreground">
              Todos os contratos das empresas cadastradas.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contratos.data?.map((c) => (
                  <tr key={c.id_contrato} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{empresaNome(c.id_cliente)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{modeloNome(c.id_modelo)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.data_inicio}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">
                        {c.status_contrato ?? "Ativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(c.valor_acordado).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                  </tr>
                ))}
                {!contratos.isLoading && (contratos.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                      Nenhum contrato cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function NovoModeloDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateModelo();
  const [nome, setNome] = useState("");
  const [periodicidade, setPeriodicidade] = useState("Mensal");
  const [descricao, setDescricao] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    await create.mutateAsync({
      nome_modelo: nome.trim(),
      periodicidade_cobranca: periodicidade || null,
      descricao_padrao: descricao || null,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo modelo de contrato</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome do modelo *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Periodicidade de cobrança</Label>
          <Input value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Descrição padrão</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
          />
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
