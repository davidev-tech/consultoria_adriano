import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, FileText, Loader2, Plus, Link, ArchiveRestore, ChevronDown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useCreateModelo, 
  useModelos, 
  useTodosContratos, 
  useEmpresas, 
  useArquivarModelo, 
  useDesarquivarModelo,
  useDesarquivarContrato,
  useArquivarContrato,
  useCreateContrato 
} from "@/lib/api/hooks"; 

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
  
  const [openModelo, setOpenModelo] = useState(false);
  const [openContrato, setOpenContrato] = useState(false);
  const [exibirArquivados, setExibirArquivados] = useState(false);
  const [empresaFiltro, setEmpresaFiltro] = useState("Todas as empresas");

  // Diálogos de confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const empresaNome = (id: string) =>
    empresas.data?.find((e) => e.id_cliente === id)?.nome_empresa ?? id.slice(0, 8);
    
  const modeloNome = (id: string) =>
    modelos.data?.find((m) => m.id_modelo === id)?.nome_modelo ?? "—";

  const contratosFiltrados = contratos.data?.filter((c) => {
    const status = c.status_contrato?.toString().trim().toLowerCase();
    const isArquivado = status === "arquivado" || c.arquivado === true || c.ativo === false;
    
    // Filtro por empresa
    if (empresaFiltro !== "Todas as empresas") {
      const nome = empresaNome(c.id_cliente);
      if (nome !== empresaFiltro) return false;
    }
    
    return exibirArquivados ? isArquivado : !isArquivado;
  });

  const modelosFiltrados = modelos.data?.filter((m) => {
    const isArquivado = m.ativo === false || m.ativo === "false" || m.ativo === 0;
    return exibirArquivados ? isArquivado : !isArquivado;
  });

  const totalAtivos = contratos.data?.filter((c) => {
    const status = (c.status_contrato || "").toString().trim().toLowerCase();
    return status === "ativo";
  }).length || 0;

  // Função para abrir o diálogo de confirmação antes de executar uma ação
  const confirmActionWrapper = (action: () => void) => {
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Botão de exibir arquivados */}
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

        {/* SEÇÃO 1: MODELOS DE CONTRATO */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                // catálogo {exibirArquivados && "(arquivados)"}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Modelos de Contrato</h1>
              <p className="text-sm text-muted-foreground">
                Templates reutilizáveis para vínculo com empresas.
              </p>
            </div>
            
            <Dialog open={openModelo} onOpenChange={setOpenModelo}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo modelo
                </Button>
              </DialogTrigger>
              <NovoModeloDialog onClose={() => setOpenModelo(false)} />
            </Dialog>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modelosFiltrados?.map((m) => {
              const isModeloArquivado = m.ativo === false || m.ativo === "false" || m.ativo === 0;

              return (
                <div
                  key={m.id_modelo}
                  className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors flex gap-4 group"
                >
                  <div className="bg-primary/10 p-2 rounded-md h-fit">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
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
                  <div className="shrink-0 ml-2">
                    {isModeloArquivado ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        title="Desarquivar modelo"
                        disabled={desarquivarModelo.isPending}
                        onClick={() => confirmActionWrapper(() => desarquivarModelo.mutate(m.id_modelo))}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Arquivar modelo"
                        disabled={arquivarModelo.isPending}
                        onClick={() => confirmActionWrapper(() => arquivarModelo.mutate(m.id_modelo))}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {modelos.isLoading && (
              <div className="col-span-full text-xs text-muted-foreground">Carregando…</div>
            )}
            {!modelos.isLoading && (modelosFiltrados?.length ?? 0) === 0 && (
              <div className="col-span-full text-xs text-muted-foreground py-2 italic">
                Nenhum modelo encontrado nesta visualização {exibirArquivados && "(arquivados)"}.
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: CONTRATOS VINCULADOS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Contratos Vinculados {exibirArquivados && "(Arquivados)"}</h2>
              <p className="text-xs text-muted-foreground">
                Vínculos ativos entre empresas clientes e modelos contratuais ({totalAtivos} ativos).
              </p>
            </div>
            
            <div className="flex gap-3">
              <select 
                className="appearance-none bg-card border border-border text-foreground text-sm rounded-md pl-4 pr-10 py-2 outline-none focus:border-primary min-w-[200px]"
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
              >
                <option value="Todas as empresas">Todas as empresas</option>
                {empresas.data?.map((e) => (
                  <option key={e.id_cliente} value={e.nome_empresa}>{e.nome_empresa}</option>
                ))}
              </select>
              
              <Dialog open={openContrato} onOpenChange={setOpenContrato}>
                <DialogTrigger asChild>
                  <Button className="gap-2" variant="default">
                    <Link className="h-4 w-4" /> Vincular Contrato
                  </Button>
                </DialogTrigger>
                <VincularContratoDialog onClose={() => setOpenContrato(false)} />
              </Dialog>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Modelo</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Fim</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contratosFiltrados?.map((c) => {
                  const isContratoArquivado = 
                    c.status_contrato?.toString().trim().toLowerCase() === "arquivado" || 
                    c.arquivado === true || 
                    c.ativo === false;
                  const status = c.status_contrato ?? "Ativo";
                  
                  return (
                    <tr key={c.id_contrato} className="hover-row">
                      <td className="px-6 py-4 font-medium">{empresaNome(c.id_cliente)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{modeloNome(c.id_modelo)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {c.data_inicio}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {c.data_fim ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${status === 'Ativo' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {Number(c.valor_acordado).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isContratoArquivado ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="Desarquivar contrato"
                            disabled={desarquivarContrato.isPending}
                            onClick={() => confirmActionWrapper(() => desarquivarContrato.mutate(c.id_contrato))}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Arquivar contrato"
                            disabled={arquivarContrato.isPending}
                            onClick={() => confirmActionWrapper(() => arquivarContrato.mutate(c.id_contrato))}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                {contratos.isLoading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                      Carregando contratos...
                    </td>
                  </tr>
                )}

                {!contratos.isLoading && (contratosFiltrados?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground py-8 italic">
                      Nenhum contrato encontrado nesta visualização {exibirArquivados && "(arquivados)"}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Diálogo de confirmação (substitui window.confirm) */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar ação"
        description="Tem certeza que deseja prosseguir com esta ação?"
        onConfirm={() => {
          confirmAction();
          setConfirmOpen(false);
        }}
      />
    </DashboardLayout>
  );
}

// ============================================================================
// COMPONENTES DE DIALOG (POP-UPS)
// ============================================================================

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
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={periodicidade} 
            onChange={(e) => setPeriodicidade(e.target.value)}
          >
            <option value="Semanal">Semanal</option>
            <option value="Quinzenal">Quinzenal</option>
            <option value="Mensal">Mensal</option>
            <option value="Bimestral">Bimestral</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Semestral">Semestral</option>
            <option value="Anual">Anual</option>
            <option value="Por Visita">Por Visita</option>
          </select>
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

function VincularContratoDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateContrato();
  const empresas = useEmpresas();
  const modelos = useModelos();
  
  const [idCliente, setIdCliente] = useState("");
  const [idModelo, setIdModelo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorAcordado, setValorAcordado] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [diaVencimento, setDiaVencimento] = useState<string>("5");
  const [cobraJuros, setCobraJuros] = useState<boolean>(false);
  const [taxaJuros, setTaxaJuros] = useState<string>("0");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente || !idModelo || !dataInicio) return;
    
    const valorConvertido = valorAcordado ? parseFloat(valorAcordado.replace(",", ".")) : 0;

    await create.mutateAsync({
      id_cliente: idCliente,
      id_modelo: idModelo,
      data_inicio: dataInicio,
      data_fim: dataFim || undefined,
      status_contrato: status,
      valor_acordado: valorConvertido,
    } as any);
    
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Vincular Contrato</DialogTitle>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Empresa *</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={idCliente} 
            onChange={(e) => setIdCliente(e.target.value)} 
            required
          >
            <option value="">Selecione uma empresa...</option>
            {empresas.data?.map(emp => (
              <option key={emp.id_cliente} value={emp.id_cliente}>{emp.nome_empresa}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Modelo de Contrato *</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={idModelo} 
            onChange={(e) => setIdModelo(e.target.value)} 
            required
          >
            <option value="">Selecione um modelo...</option>
            {modelos.data?.filter(mod => mod.ativo !== false && mod.ativo !== "false" && mod.ativo !== 0).map(mod => (
              <option key={mod.id_modelo} value={mod.id_modelo}>{mod.nome_modelo}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data de Início *</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data de Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor Acordado (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={valorAcordado} 
              onChange={(e) => setValorAcordado(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Ativo">Ativo</option>
              <option value="Encerrado">Encerrado</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-border mt-2 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações de Pagamento</p>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Dia de Vencimento Padrão *</Label>
            <Input 
              type="number" 
              min="1" max="31"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              placeholder="Ex: 5"
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox 
              id="cobra-juros" 
              checked={cobraJuros}
              onCheckedChange={(checked) => setCobraJuros(checked === true)}
            />
            <Label htmlFor="cobra-juros" className="text-xs cursor-pointer">Cobrar juros por atraso?</Label>
          </div>

          {cobraJuros && (
            <div className="space-y-1.5 pl-6 border-l-2 border-primary/20">
              <Label className="text-xs">Taxa de Juros (%) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={taxaJuros}
                onChange={(e) => setTaxaJuros(e.target.value)}
                placeholder="Ex: 2.00"
                required={cobraJuros}
              />
            </div>
          )}
        </div>

        {create.error && (
          <p className="text-xs text-destructive">{(create.error as Error).message}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Vincular
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}