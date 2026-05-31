import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Building2, Plus, Loader2, Pencil, Trash2,
  Calendar, AlertTriangle, PackageCheck, DollarSign,
  MessageSquare, FileText, X
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/Breadcrumb"; // 👈 Breadcrumb adicionado
import {
  useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa,
  useInteracoesPorCliente, useContratosPorEmpresa, useModelos,
} from "@/lib/api/hooks";
import type { EmpresaCreate, Empresa } from "@/lib/api/types";

export const Route = createFileRoute("/empresas")({
  head: () => ({ title: "Empresas - Gestão do Cuidado" }),
  component: EmpresasPage,
});

// ============= utilitários =============
const formatarMoeda = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "R$ 0,00";
const formatarData = (d: string | null | undefined, comHora = false) => {
  if (!d) return "—";
  const op: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (comHora) { op.hour = "2-digit"; op.minute = "2-digit"; }
  return new Date(d).toLocaleDateString("pt-BR", op);
};

function EmpresasPage() {
  const { data: empresas, isLoading } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [empresaDetalhe, setEmpresaDetalhe] = useState<any>(null);

  const handleEditClick = (empresa: Empresa) => { setEmpresaEditando(empresa); setOpen(true); };
  const handleCloseModal = () => { setOpen(false); setEmpresaEditando(null); };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">// cadastros / clientes</span>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">{empresas?.length ?? 0} empresa(s) na base.</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) handleCloseModal(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { setEmpresaEditando(null); setOpen(true); }}>
                <Plus className="h-4 w-4" /> Nova empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <EmpresaDialogForm onClose={handleCloseModal} empresaInicial={empresaEditando} />
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h2 className="text-lg font-medium tracking-tight mb-4">Diretório de Clientes</h2>
          
          {/* ✅ 3 COLUNAS: removido xl:grid-cols-4 */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[340px] rounded-xl border border-border skeleton-shimmer" />
            ))}
            {!isLoading && empresas?.map((empresa: any) => {
              const interacoes = Array.isArray(empresa.interacoes) ? empresa.interacoes : [];
              const interacoesOrdenadas = [...interacoes].sort((a: any, b: any) => new Date(b.data_hora || 0).getTime() - new Date(a.data_hora || 0).getTime());
              const ultimaVisita = interacoesOrdenadas.find((i: any) => i.tipo_interacao?.toLowerCase().includes("visita"));
              const contratos = Array.isArray(empresa.contratos) ? empresa.contratos : [];
              const contratosAtivos = contratos.filter((c: any) => c.status_contrato?.toLowerCase() === "ativo");
              const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
              const proximaEntrega = contratosAtivos.filter((c: any) => c.data_fim && new Date(c.data_fim) > hoje).sort((a: any, b: any) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())[0];
              const pendenciasContrato = contratosAtivos.reduce((acc: number, c: any) => acc + (c.entregas || []).filter((e: any) => e.status_entrega !== "Concluído").length, 0);
              const faturasPendentes = contratosAtivos.reduce((acc: number, c: any) => acc + (c.faturas || []).filter((f: any) => f.status === "Pendente" || f.status === "Atrasado").length, 0);
              const interacoesFinanceirasPendentes = interacoes.filter((i: any) => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente").length;
              const totalPendencias = pendenciasContrato + faturasPendentes + interacoesFinanceirasPendentes;
              const ultimasInteracoes = interacoesOrdenadas.slice(0, 3);

              return (
                <div
                  key={empresa.id_cliente}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md card-hover animate-fade-in-up hover:scale-[1.03] hover:shadow-xl cursor-pointer"
                >
                  <div>
                    {/* CABEÇALHO COM ESPAÇO PARA OS BOTÕES */}
                    <div className="flex items-start gap-3 pr-14">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setEmpresaDetalhe(empresa)}
                          className="font-semibold text-base tracking-tight truncate text-left hover:text-primary transition-colors"
                        >
                          {empresa.nome_empresa}
                        </button>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{empresa.cnpj || "Sem CNPJ"}</p>
                      </div>
                    </div>

                    {/* MÉTRICAS */}
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-left border border-border/40">
                      <div className="space-y-0.5"><span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar className="h-2.5 w-2.5 text-primary" /> Última Visita</span><p className="text-xs font-medium">{ultimaVisita ? formatarData(ultimaVisita.data_hora) : "—"}</p></div>
                      <div className="space-y-0.5"><span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><PackageCheck className="h-2.5 w-2.5 text-primary" /> Próxima Entrega</span><p className="text-xs font-medium">{proximaEntrega ? formatarData(proximaEntrega.data_fim) : "—"}</p></div>
                      <div className="space-y-0.5"><span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5 text-orange-500" /> Pendências</span><p className={`text-xs font-bold ${totalPendencias > 0 ? "text-red-600" : "text-foreground"}`}>{totalPendencias}</p></div>
                      <div className="space-y-0.5"><span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><DollarSign className="h-2.5 w-2.5 text-primary" /> Contratos</span><p className="text-xs font-medium">{contratosAtivos.length} ativo(s)</p></div>
                    </div>
                  </div>

                  {/* ÚLTIMAS INTERAÇÕES */}
                  <div className="mt-4 pt-3 border-t border-dashed border-border/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block">Últimas Interações</span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-0.5">
                      {ultimasInteracoes.length > 0 ? ultimasInteracoes.map((interacao: any, idx: number) => (
                        <div key={idx} className="rounded-md bg-muted/30 p-2 border border-border/20 hover:scale-[1.02] transition-transform cursor-pointer">
                          <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground font-medium mb-1">
                            <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono text-[8px]">{interacao.tipo_interacao || "Interação"}</span>
                            <span>{interacao.data_hora ? new Date(interacao.data_hora).toLocaleDateString("pt-BR") : "—"}</span>
                          </div>
                          {interacao.feedback_anotacoes && <p className="text-[11px] text-foreground/90 line-clamp-2 italic">"{interacao.feedback_anotacoes}"</p>}
                        </div>
                      )) : <p className="text-[11px] text-muted-foreground italic text-center py-1 bg-muted/10 rounded-md border border-dashed border-border/40">Que tal registrar o primeiro contato com este cliente?</p>}
                    </div>
                  </div>

                  {/* ✅ BOTÕES DE AÇÃO NO TOPO DIREITO */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                      onClick={(e) => { e.stopPropagation(); handleEditClick(empresa); }}
                      title="Editar empresa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ExcluirEmpresaDialog empresa={empresa} />
                    </div>
                  </div>
                </div>
              );
            })}

            {!isLoading && (empresas?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Sua base de clientes começa aqui. Cadastre a primeira empresa.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== MODAL DE DETALHES 360° ========== */}
      {empresaDetalhe && (
        <Dialog open={!!empresaDetalhe} onOpenChange={(op) => { if (!op) setEmpresaDetalhe(null); }}>
          <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
            <DetalhesEmpresa empresa={empresaDetalhe} onClose={() => setEmpresaDetalhe(null)} />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

// ========== COMPONENTE INTERNO DO MODAL ==========
function DetalhesEmpresa({ empresa, onClose }: { empresa: any; onClose: () => void }) {
  const { data: interacoes, isLoading: loadInt } = useInteracoesPorCliente(empresa.id_cliente);
  const { data: contratos, isLoading: loadCont } = useContratosPorEmpresa(empresa.id_cliente);
  const { data: modelos } = useModelos();
  const [abaAtiva, setAbaAtiva] = useState("interacoes");

  const modeloMap = useMemo(() => {
    if (!modelos) return {};
    const map: Record<string, string> = {};
    modelos.forEach((m: any) => (map[m.id_modelo] = m.nome_modelo));
    return map;
  }, [modelos]);

  const interacoesOrdenadas = [...(interacoes || [])].sort((a: any, b: any) => new Date(b.data_hora || 0).getTime() - new Date(a.data_hora || 0).getTime());
  const contratosAtivos = (contratos || []).filter((c: any) => c.status_contrato?.toLowerCase() === "ativo");
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ultimaVisita = interacoesOrdenadas.find((i: any) => i.tipo_interacao?.toLowerCase().includes("visita"));
  const proximaEntrega = contratosAtivos.filter((c: any) => c.data_fim && new Date(c.data_fim) > hoje).sort((a: any, b: any) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())[0];
  const pendenciasContrato = contratosAtivos.reduce((acc, c) => acc + (c.entregas || []).filter((e: any) => e.status_entrega !== "Concluído").length, 0);
  const faturasPendentes = contratosAtivos.reduce((acc, c) => acc + (c.faturas || []).filter((f: any) => f.status === "Pendente" || f.status === "Atrasado").length, 0);
  const interFinPendentes = interacoesOrdenadas.filter(i => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente").length;
  const totalPendencias = pendenciasContrato + faturasPendentes + interFinPendentes;

  return (
    <div className="animate-fade-in-up">
      {/* 👇 Breadcrumb adicionado aqui */}
      <Breadcrumb
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Empresas", to: "/empresas" },
          { label: empresa.nome_empresa },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30"><Building2 className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-bold">{empresa.nome_empresa}</h2>
            <p className="text-sm text-muted-foreground">{empresa.cnpj || "CNPJ não informado"} • {empresa.localizacao_cidade || "—"}/{empresa.localizacao_estado || "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Última Visita" value={ultimaVisita ? formatarData(ultimaVisita.data_hora) : "—"} icon={Calendar} />
        <KpiCard label="Próxima Entrega" value={proximaEntrega ? formatarData(proximaEntrega.data_fim) : "—"} icon={PackageCheck} />
        <KpiCard label="Pendências" value={`${totalPendencias}`} icon={AlertTriangle} variant="warning" />
        <KpiCard label="Contratos Ativos" value={`${contratosAtivos.length}`} icon={FileText} />
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="interacoes"><MessageSquare className="h-4 w-4 mr-2" />Interações</TabsTrigger>
          <TabsTrigger value="contratos"><FileText className="h-4 w-4 mr-2" />Contratos</TabsTrigger>
          <TabsTrigger value="pendencias"><AlertTriangle className="h-4 w-4 mr-2" />Pendências</TabsTrigger>
        </TabsList>
        <TabsContent value="interacoes" className="mt-4 tab-content-enter">
          {loadInt ? <SkeletonList /> : interacoesOrdenadas.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {interacoesOrdenadas.map((i: any) => (
                <div key={i.id_interacao} className="rounded-lg border border-border bg-card p-4 hover-row hover:scale-[1.01] cursor-pointer transition-all">
                  <div className="flex justify-between"><span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{i.tipo_interacao}</span><span className="text-xs text-muted-foreground">{formatarData(i.data_hora, true)}</span></div>
                  <p className="text-sm mt-2">{i.feedback_anotacoes || <span className="text-muted-foreground italic">Sem anotações</span>}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Nenhuma interação.</p>}
        </TabsContent>
        <TabsContent value="contratos" className="mt-4 tab-content-enter">
          {loadCont ? <SkeletonList /> : contratos && contratos.length > 0 ? (
            <div className="space-y-3">
              {contratos.map((c: any) => (
                <div key={c.id_contrato} className="rounded-lg border border-border bg-card p-4 hover-row hover:scale-[1.01] cursor-pointer transition-all flex justify-between">
                  <div><p className="font-medium">{modeloMap[c.id_modelo] || "—"}</p><p className="text-xs text-muted-foreground">{c.data_inicio} → {c.data_fim || "indeterminado"}</p></div>
                  <div className="text-right"><p className="font-bold">{formatarMoeda(c.valor_acordado)}</p><p className="text-xs text-muted-foreground">{c.status_contrato}</p></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Nenhum contrato.</p>}
        </TabsContent>
        <TabsContent value="pendencias" className="mt-4 tab-content-enter">
          {totalPendencias === 0 ? <p className="text-sm text-muted-foreground italic">Nenhuma pendência.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="card-hover hover:scale-[1.02] hover:shadow-xl cursor-pointer transition-all">
                <CardHeader><CardTitle className="text-sm">Contratuais</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {contratosAtivos.flatMap((c: any) => (c.entregas || []).filter((e: any) => e.status_entrega !== "Concluído")).map((e: any) => (<li key={e.id_entrega} className="flex justify-between"><span>{e.descricao_entrega}</span><span className="text-red-500">{e.status_entrega}</span></li>))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="card-hover hover:scale-[1.02] hover:shadow-xl cursor-pointer transition-all">
                <CardHeader><CardTitle className="text-sm">Financeiras</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {contratosAtivos.flatMap((c: any) => (c.faturas || []).filter((f: any) => f.status === "Pendente" || f.status === "Atrasado")).map((f: any) => (<li key={f.id_fatura} className="flex justify-between"><span>Fatura {new Date(f.data_vencimento).toLocaleDateString("pt-BR")}</span><span className="text-red-500">{f.status}</span></li>))}
                    {interacoesOrdenadas.filter((i: any) => i.status_financeiro === "Paga" && i.status_pagamento === "Pendente").map((i: any) => (<li key={i.id_interacao} className="flex justify-between"><span>Interação {i.tipo_interacao}</span><span className="text-yellow-500">Pag. Pendente</span></li>))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="flex gap-2 mt-6">
        <Link to="/interacoes"><Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-2" />Nova Interação</Button></Link>
        <Link to="/contratos"><Button size="sm"><FileText className="h-4 w-4 mr-2" />Novo Contrato</Button></Link>
      </div>
    </div>
  );
}

// ========== COMPONENTES AUXILIARES ==========
function KpiCard({ label, value, icon: Icon, variant = "default" }: any) {
  const bg = variant === "warning" ? "bg-yellow-500/10 text-yellow-600 ring-yellow-500/20" : "bg-primary/15 text-primary ring-primary/30";
  return (
    <Card className="card-hover hover:scale-[1.03] hover:shadow-xl cursor-pointer transition-all">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${bg}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}
function SkeletonList() { return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded skeleton-shimmer" />)}</div>; }

function EmpresaDialogForm({ onClose, empresaInicial }: { onClose: () => void, empresaInicial: Empresa | null }) {
  const create = useCreateEmpresa(); const update = useUpdateEmpresa();
  const isEditing = !!empresaInicial; const isLoading = create.isPending || update.isPending;
  const [form, setForm] = useState({ nome_empresa: empresaInicial?.nome_empresa || "", cnpj: empresaInicial?.cnpj || "", localizacao_estado: empresaInicial?.localizacao_estado || "", localizacao_cidade: empresaInicial?.localizacao_cidade || "", localizacao_bairro: empresaInicial?.localizacao_bairro || "" });
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!form.nome_empresa.trim()) return;
    const payload: EmpresaCreate = { nome_empresa: form.nome_empresa.trim(), cnpj: form.cnpj || undefined, localizacao_estado: form.localizacao_estado || undefined, localizacao_cidade: form.localizacao_cidade || undefined, localizacao_bairro: form.localizacao_bairro || undefined };
    if (isEditing && empresaInicial) await update.mutateAsync({ id: empresaInicial.id_cliente, data: payload }); else await create.mutateAsync(payload);
    onClose();
  };
  return (
    <>
      <DialogHeader><DialogTitle>{isEditing ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5"><Label className="text-xs">Nome da empresa *</Label><Input value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Estado (UF)</Label><Input value={form.localizacao_estado} onChange={(e) => setForm({ ...form, localizacao_estado: e.target.value.toUpperCase() })} maxLength={2} placeholder="SP" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Cidade</Label><Input value={form.localizacao_cidade} onChange={(e) => setForm({ ...form, localizacao_cidade: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Bairro</Label><Input value={form.localizacao_bairro} onChange={(e) => setForm({ ...form, localizacao_bairro: e.target.value })} /></div>
        </div>
        {(create.error || update.error) && <p className="text-xs text-destructive">{(create.error as any)?.message || (update.error as any)?.message}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isLoading} className="gap-2">{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{isEditing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </form>
    </>
  );
}

function ExcluirEmpresaDialog({ empresa }: { empresa: Empresa }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteEmpresa();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          title="Excluir empresa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Excluir empresa?</DialogTitle></DialogHeader>
        <div className="py-4"><p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong>{empresa.nome_empresa}</strong>? Esta ação não pode ser desfeita.</p>{deleteMutation.error && <p className="text-xs text-destructive mt-2">Erro ao excluir: {deleteMutation.error.message}</p>}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate(empresa.id_cliente, { onSuccess: () => setOpen(false) })} disabled={deleteMutation.isPending} className="gap-2">{deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}