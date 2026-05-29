import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2, AlertTriangle, DollarSign, ClipboardList, FilterX, Search } from "lucide-react";
import { useEmpresas } from "@/lib/api/hooks";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import type { UUID } from "@/lib/api/types";

interface Pendencia {
  id: string;
  tipo: string;
  empresa_nome: string;
  descricao: string;
  status: string;
  data_limite?: string;
  valor?: number;
  id_referencia: string;
}

export const Route = createFileRoute("/pendencias")({
  head: () => ({ meta: [{ title: "Pendências — Gestão do Cuidado" }] }),
  component: PendenciasPage,
});

const formatarData = (data: string | null | undefined) => {
  if (!data) return "—";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatarMoeda = (valor: number | null | undefined) => {
  if (!valor) return "—";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const usePendencias = (id_cliente?: string, tipo?: string) => {
  return useQuery<Pendencia[]>({
    queryKey: ["pendencias", id_cliente, tipo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (id_cliente && id_cliente !== "todas") params.append("id_cliente", id_cliente);
      if (tipo && tipo !== "todas") params.append("tipo", tipo);
      return api<Pendencia[]>(`/pendencias?${params.toString()}`);
    },
  });
};

function PendenciasPage() {
  const [idEmpresa, setIdEmpresa] = useState<string>("todas");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas");
  const [buscaLocal, setBuscaLocal] = useState("");

  const empresas = useEmpresas();
  const { data: pendencias, isLoading } = usePendencias(
    idEmpresa !== "todas" ? idEmpresa : undefined,
    tipoFiltro !== "todas" ? tipoFiltro : undefined
  );

  const pendenciasFiltradas = pendencias?.filter(p => {
    if (!buscaLocal) return true;
    const termo = buscaLocal.toLowerCase();
    return (
      p.empresa_nome?.toLowerCase().includes(termo) ||
      p.descricao?.toLowerCase().includes(termo) ||
      p.status?.toLowerCase().includes(termo)
    );
  }) ?? [];

  const totalFinanceiro = pendencias?.filter(p => p.tipo === "financeira").length ?? 0;
  const totalEntregas = pendencias?.filter(p => p.tipo === "entrega").length ?? 0;
  const valorTotalPendente = pendencias?.filter(p => p.tipo === "financeira").reduce((acc, p) => acc + (p.valor || 0), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pendências</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de faturas em atraso e entregas pendentes.
          </p>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <DollarSign className="h-5 w-5" />
              <span className="text-lg font-bold">{totalFinanceiro} financeira(s)</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatarMoeda(valorTotalPendente)} pendentes
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <ClipboardList className="h-5 w-5" />
              <span className="text-lg font-bold">{totalEntregas} entrega(s)</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">com prazo não concluído</p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-lg font-bold">{pendenciasFiltradas.length} pendência(s)</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">no total</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={idEmpresa} onValueChange={(v) => { setIdEmpresa(v); }}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.data?.map((e: any) => (
                <SelectItem key={e.id_cliente} value={e.id_cliente}>{e.nome_empresa}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os tipos</SelectItem>
              <SelectItem value="financeira">Financeira</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa ou descrição..."
              value={buscaLocal}
              onChange={(e) => setBuscaLocal(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => { setIdEmpresa("todas"); setTipoFiltro("todas"); setBuscaLocal(""); }}>
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        {/* TABELA */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : pendenciasFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Data Limite</th>
                    <th className="text-left px-4 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendenciasFiltradas.map((p) => {
                    const tipoColor = p.tipo === "financeira" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                    const statusColor = p.status === "Atrasado" ? "text-red-600 font-bold" : p.status === "Pendente" ? "text-amber-600" : "text-blue-600";
                    return (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">{p.empresa_nome}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${tipoColor}`}>
                            {p.tipo === "financeira" ? "Financeira" : "Entrega"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{p.descricao}</td>
                        <td className={`px-4 py-3 ${statusColor}`}>{p.status}</td>
                        <td className="px-4 py-3 font-mono">{formatarData(p.data_limite)}</td>
                        <td className="px-4 py-3">{p.valor ? formatarMoeda(p.valor) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma pendência encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}