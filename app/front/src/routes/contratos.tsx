import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, FileText, Loader2, Plus, Link, ArchiveRestore, Pencil, Info } from "lucide-react";;
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useCreateModelo,
  useModelos,
  useTodosContratos,
  useEmpresas,
  useArquivarModelo,
  useDesarquivarModelo,
  useDesarquivarContrato,
  useArquivarContrato,
  useCreateContrato,
  useUpdateMotivoArquivamentoContrato,
  useUpdateMotivoArquivamentoModelo,
} from "@/lib/api/hooks";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos — Gestão do Cuidado" }] }),
  component: ContratosPage,
});

function ContratosPage() {
  const modelos = useModelos();
  const contratos = useTodosContratos();
  const empresas = useEmpresas();
  const arquivarModelo = useArquivarModelo();
  const arquivarContrato = useArquivarContrato();
  const desarquivarModelo = useDesarquivarModelo();
  const desarquivarContrato = useDesarquivarContrato();
  const updateMotivoContrato = useUpdateMotivoArquivamentoContrato();
  const updateMotivoModelo = useUpdateMotivoArquivamentoModelo();

  const [openModelo, setOpenModelo] = useState(false);
  const [openContrato, setOpenContrato] = useState(false);
  const [exibirArquivados, setExibirArquivados] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmActionType, setConfirmActionType] = useState<
    "arquivar_modelo" | "desarquivar_modelo" | "arquivar_contrato" | "desarquivar_contrato" | null
  >(null);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);

  const [motivoOpen, setMotivoOpen] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [motivoCustomizado, setMotivoCustomizado] = useState("");   // 👈 NOVO
  const [idParaArquivar, setIdParaArquivar] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState<{ id: string; tipo: "contrato" | "modelo" } | null>(null);

  const empresaNome = (id: string) =>
    empresas.data?.find((e) => e.id_cliente === id)?.nome_empresa ?? id.slice(0, 8);
  const modeloNome = (id: string) =>
    modelos.data?.find((m) => m.id_modelo === id)?.nome_modelo ?? "—";

  const contratosFiltrados = contratos.data?.filter((c) => {
    const status = c.status_contrato?.toString().trim().toLowerCase();
    const statusAlt = c.status?.toString().trim().toLowerCase();
    const isArquivado =
      status === "arquivado" || statusAlt === "arquivado" ||
      c.arquivado === true || c.ativo === false || c.ativo === "false" || c.ativo === 0;
    return exibirArquivados ? isArquivado : !isArquivado;
  });

  const modelosFiltrados = modelos.data?.filter((m) => {
    const status = m.status_modelo?.toString().trim().toLowerCase() || m.status?.toString().trim().toLowerCase();
    const isArquivado =
      m.ativo === false || m.ativo === "false" || m.ativo === 0 ||
      status === "arquivado" || status === "inativo";
    return exibirArquivados ? isArquivado : !isArquivado;
  });

  const solicitarMotivoArquivamento = (id: string, tipo: "contrato" | "modelo") => {
    setIdParaArquivar(id);
    setModoEdicao(null);
    setMotivoSelecionado("");
    setMotivoCustomizado("");   // 👈 NOVO
    setMotivoOpen(true);
  };

  const solicitarEdicaoMotivo = (id: string, motivoAtual: string, tipo: "contrato" | "modelo") => {
    setModoEdicao({ id, tipo });
    // Se o motivo atual não estiver na lista, assume "Outro" e preenche o campo
    const opcoes = ["Preço", "Mudança de fornecedor", "Fim do projeto", "Insatisfação"];
    if (opcoes.includes(motivoAtual)) {
      setMotivoSelecionado(motivoAtual);
      setMotivoCustomizado("");
    } else {
      setMotivoSelecionado("Outro");
      setMotivoCustomizado(motivoAtual || "");
    }
    setMotivoOpen(true);
  };

  const confirmarMotivo = () => {
    const motivoFinal = motivoSelecionado === "Outro" ? motivoCustomizado : motivoSelecionado;
    
    if (modoEdicao) {
      if (modoEdicao.tipo === "contrato") {
        updateMotivoContrato.mutate({ id: modoEdicao.id, motivo: motivoFinal });
      } else {
        updateMotivoModelo.mutate({ id: modoEdicao.id, motivo: motivoFinal });
      }
    } else if (idParaArquivar) {
      if (confirmActionType === "arquivar_contrato") {
        arquivarContrato.mutate({ id: idParaArquivar, motivo: motivoFinal || undefined });
      } else if (confirmActionType === "arquivar_modelo") {
        arquivarModelo.mutate({ id: idParaArquivar, motivo: motivoFinal || undefined });
      }
    }
    setMotivoOpen(false);
    setIdParaArquivar(null);
    setModoEdicao(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex justify-end">
          <Button
            variant={exibirArquivados ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setExibirArquivados(!exibirArquivados)}
          >
            {exibirArquivados ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {exibirArquivados ? "Ver Itens Ativos" : "Ver Itens Arquivados"}
          </Button>
        </div>

        {/* MODELOS DE CONTRATO */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                // catálogo {exibirArquivados && "(arquivados)"}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Modelos de Contrato</h1>
              <p className="text-sm text-muted-foreground">Templates reutilizáveis para vínculo com empresas.</p>
            </div>
            <Dialog open={openModelo} onOpenChange={setOpenModelo}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo modelo</Button>
              </DialogTrigger>
              <NovoModeloDialog onClose={() => setOpenModelo(false)} />
            </Dialog>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modelosFiltrados?.map((m) => {
              const isModeloArquivado = m.ativo === false || m.ativo === "false" || m.ativo === 0;
              return (
                <div key={m.id_modelo} className="rounded-lg border border-border bg-card p-4 shadow-card card-hover flex justify-between items-start group">
                  <div className="flex items-start gap-3 w-full justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{m.nome_modelo}</h3>
                        <p className="text-xs text-muted-foreground">{m.periodicidade_cobranca ?? "sem periodicidade"}</p>
                        {m.descricao_padrao && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{m.descricao_padrao}</p>}
                        {isModeloArquivado && m.motivo_arquivamento && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            Motivo: {m.motivo_arquivamento}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                solicitarEdicaoMotivo(m.id_modelo, m.motivo_arquivamento, "modelo");
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isModeloArquivado ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Desarquivar modelo"
                          disabled={desarquivarModelo.isPending}
                          onClick={() => {
                            setConfirmTitle("Desarquivar modelo?");
                            setConfirmDesc("O modelo voltará a ficar disponível para novos contratos.");
                            setConfirmActionType("desarquivar_modelo");
                            setConfirmTargetId(m.id_modelo);
                            setConfirmOpen(true);
                          }}
                        ><ArchiveRestore className="h-4 w-4" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Arquivar modelo"
                          disabled={arquivarModelo.isPending}
                          onClick={() => {
                            setConfirmActionType("arquivar_modelo");
                            solicitarMotivoArquivamento(m.id_modelo, "modelo");
                          }}
                        ><Archive className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CONTRATOS VINCULADOS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Contratos Vinculados {exibirArquivados && "(Arquivados)"}</h2>
              <p className="text-xs text-muted-foreground">Todos os contratos das empresas cadastradas.</p>
            </div>
            <Dialog open={openContrato} onOpenChange={setOpenContrato}>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="default"><Link className="h-4 w-4" /> Vincular Contrato</Button>
              </DialogTrigger>
              <VincularContratoDialog onClose={() => setOpenContrato(false)} />
            </Dialog>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Fim</th>
                  <th className="px-4 py-3">Status</th>
                  {exibirArquivados && <th className="px-4 py-3">Motivo</th>}
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contratosFiltrados?.map((c) => {
                  const isContratoArquivado =
                    c.status_contrato?.toString().trim().toLowerCase() === "arquivado" ||
                    c.status?.toString().trim().toLowerCase() === "arquivado" ||
                    c.arquivado === true || c.ativo === false;
                  const isEncerrado = c.status_contrato?.toString().trim().toLowerCase() === "encerrado";
                  return (
                    <tr key={c.id_contrato} className="hover-row">
                      <td className="px-4 py-3 font-medium">{empresaNome(c.id_cliente)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{modeloNome(c.id_modelo)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.data_inicio}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.data_fim ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${isContratoArquivado || isEncerrado ? "bg-muted text-muted-foreground border border-border" : "bg-primary/15 text-primary"}`}>
                          {c.status_contrato ?? "Ativo"}
                        </span>
                      </td>
                      {exibirArquivados && (
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{c.motivo_arquivamento || "—"}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-foreground"
                              onClick={() => solicitarEdicaoMotivo(c.id_contrato, c.motivo_arquivamento || "", "contrato")}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-semibold">
                        {Number(c.valor_acordado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isContratoArquivado ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Desarquivar contrato"
                            disabled={desarquivarContrato.isPending}
                            onClick={() => {
                              setConfirmTitle("Desarquivar contrato?");
                              setConfirmDesc("O contrato voltará a ficar Ativo.");
                              setConfirmActionType("desarquivar_contrato");
                              setConfirmTargetId(c.id_contrato);
                              setConfirmOpen(true);
                            }}
                          ><ArchiveRestore className="h-4 w-4" /></Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Arquivar contrato"
                            disabled={arquivarContrato.isPending}
                            onClick={() => {
                              setConfirmActionType("arquivar_contrato");
                              solicitarMotivoArquivamento(c.id_contrato, "contrato");
                            }}
                          ><Archive className="h-4 w-4" /></Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Diálogo genérico de confirmação (para desarquivar) */}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmTitle}
          description={confirmDesc}
          confirmLabel="Confirmar"
          onConfirm={() => {
            if (confirmActionType === "desarquivar_modelo" && confirmTargetId) {
              desarquivarModelo.mutate(confirmTargetId);
            } else if (confirmActionType === "desarquivar_contrato" && confirmTargetId) {
              desarquivarContrato.mutate(confirmTargetId);
            }
            setConfirmOpen(false);
          }}
          loading={desarquivarModelo.isPending || desarquivarContrato.isPending}
        />

        {/* Diálogo para selecionar/editar motivo de arquivamento (COM CAMPO "OUTRO") */}
        <Dialog open={motivoOpen} onOpenChange={setMotivoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {modoEdicao ? "Editar Motivo de Arquivamento" : "Motivo do Arquivamento"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={motivoSelecionado}
                  onChange={(e) => {
                    setMotivoSelecionado(e.target.value);
                    if (e.target.value !== "Outro") setMotivoCustomizado("");
                  }}
                >
                  <option value="">Selecione um motivo...</option>
                  <option value="Preço">Preço</option>
                  <option value="Mudança de fornecedor">Mudança de fornecedor</option>
                  <option value="Fim do projeto">Fim do projeto</option>
                  <option value="Insatisfação">Insatisfação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {motivoSelecionado === "Outro" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Descreva o motivo</Label>
                  <Input
                    value={motivoCustomizado}
                    onChange={(e) => setMotivoCustomizado(e.target.value)}
                    placeholder="Digite o motivo..."
                  />
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setMotivoOpen(false)}>Cancelar</Button>
                <Button
                  onClick={confirmarMotivo}
                  disabled={arquivarContrato.isPending || arquivarModelo.isPending || updateMotivoContrato.isPending || updateMotivoModelo.isPending}
                >
                  {modoEdicao ? "Salvar" : "Confirmar Arquivamento"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// --- DIALOGS ---
function NovoModeloDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateModelo();
  const [nome, setNome] = useState("");
  const [periodicidade, setPeriodicidade] = useState("Mensal");
  const [descricao, setDescricao] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    await create.mutateAsync({ nome_modelo: nome.trim(), periodicidade_cobranca: periodicidade || null, descricao_padrao: descricao || null });
    onClose();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo modelo de contrato</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label className="text-xs">Nome do modelo *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">Periodicidade de cobrança</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
            <option value="Semanal">Semanal</option><option value="Quinzenal">Quinzenal</option><option value="Mensal">Mensal</option><option value="Bimestral">Bimestral</option><option value="Trimestral">Trimestral</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option><option value="Por Visita">Por Visita</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Descrição padrão</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function VincularContratoDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateContrato();
  const empresas = useEmpresas();
  const modelos = useModelos();
  const [idCliente, setIdCliente] = useState("");
  const [idModelo, setIdModelo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorAcordado, setValorAcordado] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("5");
  const [cobraJuros, setCobraJuros] = useState(false);
  const [taxaJuros, setTaxaJuros] = useState("0");

  // 👇 NOVOS estados para modais de detalhes
  const [showEmpresaInfo, setShowEmpresaInfo] = useState(false);
  const [showModeloInfo, setShowModeloInfo] = useState(false);

  const empresaSelecionada = empresas.data?.find(emp => emp.id_cliente === idCliente);
  const modeloSelecionado = modelos.data?.find(mod => mod.id_modelo === idModelo);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente || !idModelo || !dataInicio) return;
    await create.mutateAsync({
      id_cliente: idCliente,
      id_modelo: idModelo,
      data_inicio: dataInicio,
      data_fim: dataFim || undefined,
      status_contrato: "Ativo",
      valor_acordado: parseFloat(valorAcordado.replace(",", ".")),
    } as any);
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Vincular Contrato</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {/* EMPRESA */}
        <div className="space-y-1.5">
          <Label className="text-xs">Empresa *</Label>
          <div className="flex gap-2">
            <select
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value)}
              required
            >
              <option value="">Selecione uma empresa...</option>
              {empresas.data?.map(emp => (
                <option key={emp.id_cliente} value={emp.id_cliente}>{emp.nome_empresa}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              disabled={!idCliente}
              onClick={() => setShowEmpresaInfo(true)}
              title="Ver detalhes da empresa"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MODELO */}
        <div className="space-y-1.5">
          <Label className="text-xs">Modelo de Contrato *</Label>
          <div className="flex gap-2">
            <select
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={idModelo}
              onChange={(e) => setIdModelo(e.target.value)}
              required
            >
              <option value="">Selecione um modelo...</option>
              {modelos.data?.filter(m => m.ativo !== false).map(mod => (
                <option key={mod.id_modelo} value={mod.id_modelo}>{mod.nome_modelo}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              disabled={!idModelo}
              onClick={() => setShowModeloInfo(true)}
              title="Ver detalhes do modelo"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ... resto do formulário (datas, valor, etc.) permanece igual ... */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Data de Início *</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label className="text-xs">Data de Fim</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valor Acordado (R$)</Label>
          <Input type="number" step="0.01" value={valorAcordado} onChange={(e) => setValorAcordado(e.target.value)} />
        </div>
        <div className="pt-2 border-t mt-2 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações de Pagamento</p>
          <div className="space-y-1.5"><Label className="text-xs">Dia de Vencimento Padrão *</Label><Input type="number" min="1" max="31" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} required /></div>
          <div className="flex items-center space-x-2"><Checkbox checked={cobraJuros} onCheckedChange={(c) => setCobraJuros(!!c)} /><Label className="text-xs">Cobrar juros por atraso?</Label></div>
          {cobraJuros && <div className="space-y-1.5 pl-6 border-l-2 border-primary/20"><Label className="text-xs">Taxa de Juros (%) *</Label><Input type="number" step="0.01" value={taxaJuros} onChange={(e) => setTaxaJuros(e.target.value)} required /></div>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Vincular</Button></DialogFooter>
      </form>

      {/* MODAL DE DETALHES DA EMPRESA */}
      <Dialog open={showEmpresaInfo} onOpenChange={setShowEmpresaInfo}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Detalhes da Empresa</DialogTitle>
          </DialogHeader>
          {empresaSelecionada ? (
            <div className="space-y-3 py-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Nome</span>
                <p className="text-sm font-medium">{empresaSelecionada.nome_empresa}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">CNPJ</span>
                  <p className="text-sm">{empresaSelecionada.cnpj || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Cidade/UF</span>
                  <p className="text-sm">{empresaSelecionada.localizacao_cidade || "—"} / {empresaSelecionada.localizacao_estado || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Segmento</span>
                  <p className="text-sm">{empresaSelecionada.segmento || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Porte</span>
                  <p className="text-sm">{empresaSelecionada.porte || "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma empresa selecionada.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmpresaInfo(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHES DO MODELO */}
      <Dialog open={showModeloInfo} onOpenChange={setShowModeloInfo}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Detalhes do Modelo de Contrato</DialogTitle>
          </DialogHeader>
          {modeloSelecionado ? (
            <div className="space-y-3 py-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Nome do Modelo</span>
                <p className="text-sm font-medium">{modeloSelecionado.nome_modelo}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Periodicidade</span>
                <p className="text-sm">{modeloSelecionado.periodicidade_cobranca || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Descrição Padrão</span>
                <p className="text-sm whitespace-pre-wrap">{modeloSelecionado.descricao_padrao || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Status</span>
                <p className="text-sm">{modeloSelecionado.ativo ? "Ativo" : "Arquivado"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum modelo selecionado.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModeloInfo(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContent>
  );
}