import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Building2, FileText, Loader2, Plus, UserRound } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useContratosPorEmpresa,
  useCreateContrato,
  useCreateResponsavel,
  useEmpresas,
  useModelos,
  useResponsaveis,
} from "@/lib/api/hooks";

export const Route = createFileRoute("/empresas/$id")({
  head: () => ({ meta: [{ title: "Empresa — Gestão do Cuidado" }] }),
  component: EmpresaDetailPage,
});

function EmpresaDetailPage() {
  const { id } = Route.useParams();
  const empresas = useEmpresas();
  const empresa = empresas.data?.find((e) => e.id_cliente === id);
  const responsaveis = useResponsaveis(id);
  const contratos = useContratosPorEmpresa(id);
  const modelos = useModelos();

  const [openResp, setOpenResp] = useState(false);
  const [openCont, setOpenCont] = useState(false);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link
          to="/empresas"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar para empresas
        </Link>

        <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              // empresa
            </span>
            <h1 className="text-xl font-semibold tracking-tight">
              {empresa?.nome_empresa ?? "Carregando..."}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{empresa?.cnpj ?? "—"}</span>
              <span>{empresa?.localizacao ?? "—"}</span>
              <span>{empresa?.servico_prestado ?? "—"}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">UUID</p>
            <p className="font-mono text-[10px] text-muted-foreground">{id}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Responsáveis */}
          <section className="rounded-lg border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Responsáveis</h2>
                <p className="text-xs text-muted-foreground">Contatos da empresa</p>
              </div>
              <Dialog open={openResp} onOpenChange={setOpenResp}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Novo
                  </Button>
                </DialogTrigger>
                <NovoResponsavelDialog idCliente={id} onClose={() => setOpenResp(false)} />
              </Dialog>
            </div>
            <div className="divide-y divide-border">
              {responsaveis.isLoading && (
                <div className="p-5 text-xs text-muted-foreground">Carregando…</div>
              )}
              {responsaveis.data?.length === 0 && (
                <div className="p-5 text-xs text-muted-foreground">
                  Nenhum responsável cadastrado.
                </div>
              )}
              {responsaveis.data?.map((r) => (
                <div key={r.id_responsavel} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.cargo ?? "—"} · {r.cpf ?? "sem CPF"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contratos */}
          <section className="rounded-lg border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Contratos</h2>
                <p className="text-xs text-muted-foreground">Vínculos com modelos</p>
              </div>
              <Dialog open={openCont} onOpenChange={setOpenCont}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Novo
                  </Button>
                </DialogTrigger>
                <NovoContratoDialog
                  idCliente={id}
                  modelos={modelos.data ?? []}
                  onClose={() => setOpenCont(false)}
                />
              </Dialog>
            </div>
            <div className="divide-y divide-border">
              {contratos.isLoading && (
                <div className="p-5 text-xs text-muted-foreground">Carregando…</div>
              )}
              {contratos.data?.length === 0 && (
                <div className="p-5 text-xs text-muted-foreground">
                  Nenhum contrato cadastrado.
                </div>
              )}
              {contratos.data?.map((c) => (
                <div key={c.id_contrato} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {modelos.data?.find((m) => m.id_modelo === c.id_modelo)?.nome_modelo ??
                        "Modelo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Início: {c.data_inicio} · Status: {c.status_contrato ?? "Ativo"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {Number(c.valor_acordado).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function NovoResponsavelDialog({
  idCliente,
  onClose,
}: {
  idCliente: string;
  onClose: () => void;
}) {
  const create = useCreateResponsavel();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nome.trim()) return;
    await create.mutateAsync({
      id_cliente: idCliente,
      nome: nome.trim(),
      cpf: cpf || null,
      cargo: cargo || null,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo responsável</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">CPF</Label>
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cargo</Label>
          <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
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

function NovoContratoDialog({
  idCliente,
  modelos,
  onClose,
}: {
  idCliente: string;
  modelos: { id_modelo: string; nome_modelo: string }[];
  onClose: () => void;
}) {
  const create = useCreateContrato();
  const [idModelo, setIdModelo] = useState("");
  const [valor, setValor] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Ativo");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!idModelo || !valor) return;
    await create.mutateAsync({
      id_cliente: idCliente,
      id_modelo: idModelo,
      valor_acordado: Number(valor),
      data_inicio: dataInicio,
      status_contrato: status,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo contrato</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Modelo de contrato *</Label>
          <Select value={idModelo} onValueChange={setIdModelo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um modelo..." />
            </SelectTrigger>
            <SelectContent>
              {modelos.map((m) => (
                <SelectItem key={m.id_modelo} value={m.id_modelo}>
                  {m.nome_modelo}
                </SelectItem>
              ))}
              {modelos.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">
                  Cadastre um modelo em /contratos
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor acordado (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data início *</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Input value={status} onChange={(e) => setStatus(e.target.value)} />
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
