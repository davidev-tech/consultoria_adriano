import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Building2, 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  MessageSquare
} from "lucide-react";
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

export const Route = createFileRoute("/empresas")({
  head: () => ({ title: "Empresas - Gestão do Cuidado" }),
  component: EmpresasPage,
});

function EmpresasPage() {
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
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        
        {/* CABEÇALHO DO PAINEL */}
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

        {/* DIRETÓRIO DE CLIENTES */}
        <div>
          <h2 className="text-lg font-medium tracking-tight mb-4">Diretório de Clientes</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[340px] animate-pulse rounded-xl border border-border bg-card/50"
                />
              ))}

            {!isLoading && empresas?.map((e: any) => {
              const interacoes = Array.isArray(e.interacoes) 
                ? e.interacoes 
                : Array.isArray(e.historico) ? e.historico : [];

              const interacoesOrdenadas = [...interacoes].sort((a: any, b: any) => {
                const dateA = new Date(a.data || a.data_interacao || a.criado_em).getTime();
                const dateB = new Date(b.data || b.data_interacao || b.criado_em).getTime();
                return dateB - dateA;
              });

              const ultimaInteracao = interacoesOrdenadas[0];
              let ultimoContatoExibicao = "—";
              if (ultimaInteracao) {
                const dateObj = new Date(ultimaInteracao.data || ultimaInteracao.data_interacao || ultimaInteracao.criado_em);
                const dataFormatada = dateObj.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
                ultimoContatoExibicao = `${dataFormatada} - ${ultimaInteracao.tipo || 'Contato'}`;
              } else if (e.ultimo_contato_tipo) {
                ultimoContatoExibicao = e.ultimo_contato_tipo;
              }

              const ultimaVisitaObj = interacoesOrdenadas.find((i: any) => 
                i.tipo?.toLowerCase().includes("visita") || 
                i.descricao?.toLowerCase().includes("visita")
              );
              let ultimaVisitaExibicao = "—";
              if (ultimaVisitaObj) {
                ultimaVisitaExibicao = new Date(ultimaVisitaObj.data || ultimaVisitaObj.data_interacao).toLocaleDateString("pt-BR");
              } else if (e.ultima_visita) {
                ultimaVisitaExibicao = new Date(e.ultima_visita).toLocaleDateString("pt-BR");
              }

              let proximaEntregaExibicao = "—";
              if (e.proxima_entrega) {
                proximaEntregaExibicao = new Date(e.proxima_entrega).toLocaleDateString("pt-BR");
              } else if (e.contratos && Array.isArray(e.contratos)) {
                const datasFuturas = e.contratos
                  .map((c: any) => c.data_entrega || c.proximo_vencimento || c.data_fim)
                  .filter(Boolean)
                  .map((d: string) => new Date(d))
                  .filter((d: Date) => d.getTime() > Date.now())
                  .sort((a: Date, b: Date) => a.getTime() - b.getTime());
                
                if (datasFuturas.length > 0) {
                  proximaEntregaExibicao = datasFuturas[0].toLocaleDateString("pt-BR");
                }
              }

              let totalPendencias = e.total_pendencias ?? 0;
              if (e.financeiro && Array.isArray(e.financeiro)) {
                totalPendencias = e.financeiro.filter((f: any) => f.status === 'atrasado' || f.status === 'pendente').length;
              }

              const notasParaExibir = interacoesOrdenadas.length > 0
                ? interacoesOrdenadas.slice(0, 3).map((i: any) => ({
                    data: new Date(i.data || i.data_interacao || i.criado_em).toLocaleDateString("pt-BR"),
                    tipo: i.tipo || "Nota",
                    texto: i.feedback || i.notas || i.descricao || ""
                  }))
                : e.ultimo_contato_feedback 
                  ? [{ data: e.ultima_visita ? new Date(e.ultima_visita).toLocaleDateString("pt-BR") : "", tipo: e.ultimo_contato_tipo || "Interação", texto: e.ultimo_contato_feedback }]
                  : [];

              return (
                <div
                  key={e.id_cliente}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start gap-3 pr-16">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/empresas/$id"
                          params={{ id: e.id_cliente }}
                          className="font-semibold text-base tracking-tight truncate group-hover:text-primary block transition-colors"
                        >
                          {e.nome_empresa}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {e.cnpj || "Sem CNPJ cadastrado"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-border/60 pt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <p className="truncate">📍 <span className="font-medium text-foreground/70">Localização:</span> {e.localizacao || "Não informada"}</p>
                      <p className="truncate">🛠️ <span className="font-medium text-foreground/70">Serviço:</span> {e.servico_prestado || "Não detalhado"}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-left border border-border/40">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-primary" /> Última Visita
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {ultimaVisitaExibicao}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5 text-primary" /> Próxima Entrega
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {proximaEntregaExibicao}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5 text-primary" /> Pendências
                        </span>
                        <p className={`text-xs font-bold ${totalPendencias > 0 ? "text-destructive" : "text-foreground"}`}>
                          {totalPendencias}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-2.5 w-2.5 text-primary" /> Último Contato
                        </span>
                        <p className="text-xs font-medium text-foreground truncate" title={ultimoContatoExibicao}>
                          {ultimoContatoExibicao}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-border/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block">
                      Últimas Notas de Interação
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                      {notasParaExibir.length > 0 ? (
                        notasParaExibir.map((nota: any, idx: number) => (
                          <div key={idx} className="rounded-md bg-muted/30 p-2 border border-border/20 text-left">
                            <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground font-medium mb-1">
                              <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono text-[8px]">
                                {nota.tipo}
                              </span>
                              <span>{nota.data}</span>
                            </div>
                            <p className="text-[11px] text-foreground/90 line-clamp-2 italic">
                              "{nota.texto}"
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic text-center py-1 bg-muted/10 rounded-md border border-dashed border-border/40">
                          Nenhuma nota de interação registrada.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                      onClick={() => handleEditClick(e)}
                      title="Editar dados cadastrais"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ExcluirEmpresaDialog empresa={e} />
                  </div>
                </div>
              );
            })}

            {!isLoading && (empresas?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Nenhuma empresa cadastrada. Clique em "Nova empresa" para começar.
              </div>
            )}
          </div>
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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir empresa?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir a empresa <strong>{empresa.nome_empresa}</strong>? Esta ação não pode ser desfeita e afetará todo o ecossistema de auditoria correlacionado.
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