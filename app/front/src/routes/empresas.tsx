import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Building2, 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2,
  Calendar,
  AlertTriangle,
  PackageCheck,
  MessageSquare,
  DollarSign
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
        
        {/* CABEÇALHO */}
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

          <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) handleCloseModal();
            }}
          >
            <DialogTrigger asChild>
              <Button 
                className="gap-2" 
                onClick={() => {
                  setEmpresaEditando(null);
                  setOpen(true);
                }}
              >
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

            {!isLoading && empresas?.map((empresa: any) => {
              // ==========================================
              // PROCESSAR INTERAÇÕES
              // ==========================================
              const interacoes = Array.isArray(empresa.interacoes) ? empresa.interacoes : [];
              
              // Ordenar por data (mais recente primeiro)
              const interacoesOrdenadas = [...interacoes].sort((a: any, b: any) => {
                const dateA = new Date(a.data_hora || 0).getTime();
                const dateB = new Date(b.data_hora || 0).getTime();
                return dateB - dateA;
              });

              // ✅ ÚLTIMA VISITA (interação do tipo "Visita")
              const ultimaVisita = interacoesOrdenadas.find((i: any) => 
                i.tipo_interacao?.toLowerCase().includes("visita")
              );
              
              const ultimaVisitaTexto = ultimaVisita 
                ? new Date(ultimaVisita.data_hora).toLocaleDateString("pt-BR", { 
                    day: '2-digit', 
                    month: 'short' 
                  })
                : "—";

              // ==========================================
              // PROCESSAR CONTRATOS
              // ==========================================
              const contratos = Array.isArray(empresa.contratos) ? empresa.contratos : [];
              
              // Contratos ativos
              const contratosAtivos = contratos.filter((c: any) => 
                c.status_contrato?.toLowerCase() === "ativo"
              );

              // ✅ PRÓXIMA ENTREGA (menor data_fim futura dos contratos ativos)
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              
              const proximaEntrega = contratosAtivos
                .filter((c: any) => c.data_fim && new Date(c.data_fim) > hoje)
                .sort((a: any, b: any) => 
                  new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime()
                )[0];
              
              const proximaEntregaTexto = proximaEntrega
                ? new Date(proximaEntrega.data_fim).toLocaleDateString("pt-BR", {
                    day: '2-digit',
                    month: 'short'
                  })
                : "—";

              // ✅ PENDÊNCIAS FINANCEIRAS (faturas Pendente/Atrasado)
              const faturasPendentes = contratosAtivos.flatMap((c: any) => 
                Array.isArray(c.faturas) 
                  ? c.faturas.filter((f: any) => f.status === "Pendente" || f.status === "Atrasado")
                  : []
              );

              // ✅ PENDÊNCIAS DE ENTREGA (status diferente de Concluído)
            const entregasPendentes = contratosAtivos.flatMap((c: any) => 
              Array.isArray(c.entregas) 
                ? c.entregas.filter((e: any) => e.status_entrega !== "Concluído")
                : []
              );

const totalPendencias = faturasPendentes.length + entregasPendentes.length;
              // ✅ ÚLTIMAS 3 INTERAÇÕES (qualquer tipo)
              const ultimasInteracoes = interacoesOrdenadas.slice(0, 3);

              return (
                <div
                  key={empresa.id_cliente}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    {/* CABEÇALHO DO CARD */}
                    <div className="flex items-start gap-3 pr-16">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/empresas/$id"
                          params={{ id: empresa.id_cliente }}
                          className="font-semibold text-base tracking-tight truncate group-hover:text-primary block transition-colors"
                        >
                          {empresa.nome_empresa}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {empresa.cnpj || "Sem CNPJ cadastrado"}
                        </p>
                      </div>
                    </div>

                    {/* LOCALIZAÇÃO */}
                    <div className="mt-3 border-t border-border/60 pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        📍 {empresa.localizacao_cidade && empresa.localizacao_estado
                          ? `${empresa.localizacao_cidade}/${empresa.localizacao_estado}`
                          : empresa.localizacao_cidade || empresa.localizacao_bairro || "Localização não informada"}
                      </p>
                      
                      {/* SERVIÇOS CONTRATADOS */}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">Serviços: </span>
                        {empresa.servicos_contratados?.length > 0
                          ? empresa.servicos_contratados
                              .slice(0, 3)
                              .map((s: any) => s.tipo_servico)
                              .join(", ")
                          : "Nenhum serviço"}
                      </p>
                    </div>

                    {/* MÉTRICAS DO CARD */}
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-left border border-border/40">
                      {/* Última Visita */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-primary" /> Última Visita
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {ultimaVisitaTexto}
                        </p>
                      </div>

                      {/* Próxima Entrega */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <PackageCheck className="h-2.5 w-2.5 text-primary" /> Próxima Entrega
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {proximaEntregaTexto}
                        </p>
                      </div>

                      {/* Pendências */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 text-primary" /> Pendências
                        </span>
                        <p className={`text-xs font-bold ${totalPendencias > 0 ? "text-destructive" : "text-foreground"}`}>
                          {totalPendencias}
                        </p>
                      </div>

                      {/* Contratos Ativos */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5 text-primary" /> Contratos
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {contratosAtivos.length} ativo{contratosAtivos.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ÚLTIMAS INTERAÇÕES */}
<div className="mt-4 pt-3 border-t border-dashed border-border/60 space-y-2">
  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block">
    Últimas Interações
  </span>
  <div className="space-y-2 max-h-36 overflow-y-auto pr-0.5">
    {ultimasInteracoes.length > 0 ? (
      ultimasInteracoes.map((interacao: any, idx: number) => {
        // ✅ Determinar cor baseada no grau de urgência
        const urgencia = (interacao.grau_urgencia || "").toLowerCase().trim();
        
        const urgenciaEstilo = 
          urgencia === "alto" 
            ? "bg-destructive/15 text-destructive border-destructive/30" 
            : urgencia === "médio" || urgencia === "medio"
              ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
              : urgencia === "baixo"
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "bg-muted/50 text-muted-foreground border-border";
        
        const urgenciaEmoji = 
          urgencia === "alto" ? "🔴" 
          : urgencia === "médio" || urgencia === "medio" ? "🟡"
            : urgencia === "baixo" ? "🟢"
              : "⚪";

        return (
          <div key={idx} className="rounded-md bg-muted/30 p-2 border border-border/20">
            <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground font-medium mb-1">
              <div className="flex items-center gap-1.5">
                {/* Tipo da interação */}
                <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono text-[8px]">
                  {interacao.tipo_interacao || "Interação"}
                </span>
                
                {/* ✅ GRAU DE URGÊNCIA */}
                {interacao.grau_urgencia && (
                  <span className={`px-1.5 py-0.2 rounded font-medium text-[8px] border ${urgenciaEstilo}`}>
                    {urgenciaEmoji} {interacao.grau_urgencia}
                  </span>
                )}
              </div>
              
              {/* Data */}
              <span>
                {interacao.data_hora 
                  ? new Date(interacao.data_hora).toLocaleDateString("pt-BR") 
                  : "—"}
              </span>
            </div>
            
            {/* Feedback/Anotações */}
            {interacao.feedback_anotacoes && (
              <p className="text-[11px] text-foreground/90 line-clamp-2 italic">
                "{interacao.feedback_anotacoes}"
              </p>
            )}
          </div>
        );
      })
    ) : (
      <p className="text-[11px] text-muted-foreground italic text-center py-1 bg-muted/10 rounded-md border border-dashed border-border/40">
        Nenhuma interação registrada
      </p>
    )}
  </div>
</div>
                  {/* BOTÕES DE AÇÃO */}
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                      onClick={() => handleEditClick(empresa)}
                      title="Editar dados cadastrais"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ExcluirEmpresaDialog empresa={empresa} />
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

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function EmpresaDialogForm({ onClose, empresaInicial }: { onClose: () => void, empresaInicial: Empresa | null }) {
  const create = useCreateEmpresa();
  const update = useUpdateEmpresa();
  const isEditing = !!empresaInicial;
  const isLoading = create.isPending || update.isPending;

  const [form, setForm] = useState({
    nome_empresa: empresaInicial?.nome_empresa || "",
    cnpj: empresaInicial?.cnpj || "",
    localizacao_estado: empresaInicial?.localizacao_estado || "",
    localizacao_cidade: empresaInicial?.localizacao_cidade || "",
    localizacao_bairro: empresaInicial?.localizacao_bairro || "",
  });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.nome_empresa.trim()) return;

    const payload: EmpresaCreate = {
      nome_empresa: form.nome_empresa.trim(),
      cnpj: form.cnpj || undefined,
      localizacao_estado: form.localizacao_estado || undefined,
      localizacao_cidade: form.localizacao_cidade || undefined,
      localizacao_bairro: form.localizacao_bairro || undefined,
    };

    if (isEditing && empresaInicial) {
      await update.mutateAsync({ id: empresaInicial.id_cliente, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome da empresa *</Label>
          <Input
            value={form.nome_empresa}
            onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">CNPJ</Label>
          <Input
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Estado (UF)</Label>
            <Input
              value={form.localizacao_estado}
              onChange={(e) => setForm({ ...form, localizacao_estado: e.target.value.toUpperCase() })}
              maxLength={2}
              placeholder="SP"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Cidade</Label>
            <Input
              value={form.localizacao_cidade}
              onChange={(e) => setForm({ ...form, localizacao_cidade: e.target.value })}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Bairro</Label>
            <Input
              value={form.localizacao_bairro}
              onChange={(e) => setForm({ ...form, localizacao_bairro: e.target.value })}
            />
          </div>
        </div>
        
        {(create.error || update.error) && (
          <p className="text-xs text-destructive">
            {(create.error as any)?.message || (update.error as any)?.message}
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
            Tem certeza que deseja excluir a empresa <strong>{empresa.nome_empresa}</strong>? 
            Esta ação não pode ser desfeita.
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