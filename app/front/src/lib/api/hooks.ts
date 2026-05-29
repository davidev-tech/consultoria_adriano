import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useSearch } from "@/hooks/useSearch"; // A ponte de busca global
import type {
  Contrato,
  ContratoCreate,
  Empresa,
  EmpresaCreate,
  Entrega,
  HistoricoInteracao,
  HistoricoInteracaoCreate,
  InteracoesPagasResumo,
  ModeloContrato,
  ModeloContratoCreate,
  Pagamento,
  PagamentoCreate,
  Responsavel,
  ResponsavelCreate,
  UUID,
} from "./types";

// --- MÓDULO 1: EMPRESAS ---
export const useEmpresas = () => {
  const { searchTerm } = useSearch();
  return useQuery({ 
    queryKey: ["empresas", searchTerm], 
    queryFn: () => api<Empresa[]>(`/empresas${searchTerm ? `?busca=${searchTerm}` : ""}`) 
  });
};

export const useCreateEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmpresaCreate) =>
      api<Empresa>("/empresas", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
};

export const useUpdateEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string, data: EmpresaCreate }) =>
      api<Empresa>(`/empresas/${args.id}`, { 
        method: "PUT", 
        json: args.data 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
};

export const useDeleteEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/empresas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
};

// --- MÓDULO 2: RESPONSÁVEIS ---
export const useResponsaveis = (idCliente?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["responsaveis", idCliente, searchTerm],
    queryFn: () => api<Responsavel[]>(`/responsaveis/${idCliente}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idCliente,
  });
};

export const useCreateResponsavel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResponsavelCreate) =>
      api<Responsavel>("/responsaveis", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["responsaveis", vars.id_cliente] }),
  });
};

// --- MÓDULO 3: MODELOS DE CONTRATO ---
export const useModelos = () => {
  const { searchTerm } = useSearch();
  return useQuery({ 
    queryKey: ["modelos", searchTerm], 
    queryFn: () => api<ModeloContrato[]>(`/modelos-contrato${searchTerm ? `?busca=${searchTerm}` : ""}`) 
  });
};

export const useCreateModelo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ModeloContratoCreate) =>
      api<ModeloContrato>("/modelos-contrato", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modelos"] }),
  });
};

// --- MÓDULO 4: CONTRATOS ---
export const useContratosPorEmpresa = (idCliente?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["contratos", idCliente, searchTerm],
    queryFn: () => api<Contrato[]>(`/contratos/${idCliente}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idCliente,
  });
};

export const useCreateContrato = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContratoCreate) =>
      api<Contrato>("/contratos", { method: "POST", json: data }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contratos", vars.id_cliente] });
      qc.invalidateQueries({ queryKey: ["contratos-all"] });
    },
  });
};

// --- ENTREGAS E PRAZOS ---

export const useCreateEntrega = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EntregaCreate) =>
      api<Entrega>("/entregas", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
};

export const useUpdateEntrega = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Partial<EntregaCreate> & { status_entrega?: string; data_conclusao?: string } }) =>
      api<Entrega>(`/entregas/${args.id}`, { method: "PUT", json: args.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
};

export const useDeleteEntrega = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ mensagem: string }>(`/entregas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
};

export const useEntregas = (filtros?: {
  id_contrato?: string;
  status_entrega?: string;
  data_inicio?: string;
  data_fim?: string;
}) => {
  return useQuery({
    queryKey: ["entregas", filtros],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtros?.id_contrato) params.append("id_contrato", filtros.id_contrato);
      if (filtros?.status_entrega) params.append("status_entrega", filtros.status_entrega);
      if (filtros?.data_inicio) params.append("data_inicio", filtros.data_inicio);
      if (filtros?.data_fim) params.append("data_fim", filtros.data_fim);
      return api<Entrega[]>(`/entregas?${params.toString()}`);
    },
  });
};

// --- MÓDULO 6: INTERAÇÕES ---
export const useCreateInteracao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HistoricoInteracaoCreate) =>
      api<HistoricoInteracao>("/interacoes", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interacoes"] }),
  });
};

export const useInteracoesPorCliente = (idCliente?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["interacoes", idCliente, searchTerm],
    queryFn: () => api<HistoricoInteracao[]>(`/interacoes/${idCliente}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idCliente,
  });
};

// ✅ CÓDIGO CORRIGIDO
export const useUpdateInteracao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: HistoricoInteracaoCreate }) =>
      api<HistoricoInteracao>(`/interacoes/${args.id}`, { 
        method: "PUT", 
        json: args.data 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interacoes"] }),
  });
};

export const useDeleteInteracao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ mensagem: string }>(`/interacoes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interacoes"] }),
  });
};
// hooks.ts - Adicionar após os hooks de interação

export const useInteracoesPagas = (idCliente?: string) => {
  // Se for "todas" ou undefined, não filtra por empresa
  const clienteFiltro = idCliente && idCliente !== "todas" ? idCliente : undefined;

  return useQuery({
    queryKey: ["interacoes-pagas", clienteFiltro ?? "todas"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (clienteFiltro) params.append("id_cliente", clienteFiltro);
      return api<HistoricoInteracao[]>(`/interacoes-pagas?${params.toString()}`);
    },
  });
};

export const useTotalInteracoesPagas = (idCliente?: string) => {
  const clienteFiltro = idCliente && idCliente !== "todas" ? idCliente : undefined;

  return useQuery({
    queryKey: ["interacoes-pagas-total", clienteFiltro ?? "todas"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (clienteFiltro) params.append("id_cliente", clienteFiltro);
      return api<InteracoesPagasResumo>(`/interacoes-pagas/total?${params.toString()}`);
    },
  });
};
// --- MÓDULO 7: FINANCEIRO (PAGAMENTOS) ---
export const usePagamentosPorContrato = (idContrato?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["pagamentos", idContrato, searchTerm],
    queryFn: () => api<Pagamento[]>(`/pagamentos/contrato/${idContrato}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idContrato,
  });
};

export const useCreatePagamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PagamentoCreate) =>
      api<Pagamento>("/pagamentos", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["pagamentos", vars.id_contrato] }),
  });
};

export const useUpdatePagamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: any }) =>
      api<{ mensagem: string }>(`/pagamentos/${args.id}`, { 
        method: "PUT", 
        json: args.data 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos"] }),
  });
};

export const useDeletePagamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ mensagem: string }>(`/pagamentos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos"] }),
  });
};

// --- ENTREGAS ---
export const useEntregasPorContrato = (idContrato?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["entregas", idContrato, searchTerm],
    queryFn: () => api<Entrega[]>(`/entregas/contrato/${idContrato}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idContrato,
  });
};

// --- AGREGADORES E MÚLTIPLOS (DASHBOARD) ---
export const useTodosContratos = () => {
  const empresas = useEmpresas();
  return useQuery({
    queryKey: ["contratos-all", empresas.data?.map((e: Empresa) => e.id_cliente).join(",")],
    enabled: !!empresas.data,
    queryFn: async (): Promise<Contrato[]> => {
      const all = await Promise.all(
        (empresas.data ?? []).map((e: Empresa) =>
          api<Contrato[]>(`/contratos/${e.id_cliente}`).catch(() => [] as Contrato[]),
        ),
      );
      return all.flat();
    },
  });
};

export const useInteracoesMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["interacoes", id],
      queryFn: () => api<HistoricoInteracao[]>(`/interacoes/${id}`).catch(() => [] as HistoricoInteracao[]),
    })),
  });

export const useContratosMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["contratos", id],
      queryFn: () => api<Contrato[]>(`/contratos/${id}`).catch(() => [] as Contrato[]),
    })),
  });

export const useEntregasMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["entregas", id],
      queryFn: () => api<Entrega[]>(`/entregas/contrato/${id}`).catch(() => [] as Entrega[]),
    })),
  });

export function useArquivarModelo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`http://localhost:8000/modelos-contrato/${id}/arquivar`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Erro ao arquivar modelo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos"] });
    },
  });
}

export function useArquivarContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`http://localhost:8000/contratos/${id}/arquivar`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Erro ao arquivar contrato");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
  });
}
export function useDesarquivarModelo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`http://localhost:8000/modelos-contrato/${id}/desarquivar`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Erro ao desarquivar modelo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos"] });
    },
  });
}

export function useDesarquivarContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`http://localhost:8000/contratos/${id}/desarquivar`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Erro ao desarquivar contrato");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-all"] });
    },
  });
}

// --- MÓDULO NEW: FATURAS CORRIGIDAS ---
export const useFaturasPorContrato = (idContrato?: UUID) => {
  const { searchTerm } = useSearch();
  return useQuery({
    queryKey: ["faturas", idContrato, searchTerm],
    queryFn: () => api<any[]>(`/faturas?id_contrato=${idContrato}${searchTerm ? `?busca=${searchTerm}` : ""}`),
    enabled: !!idContrato,
  });
};

export const useCreateFatura = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api<any>("/faturas", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["faturas", vars.id_contrato] }),
  });
};

export const useUpdateFatura = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: any }) =>
      api<{ mensagem: string }>(`/faturas/${args.id}`, { 
        method: "PUT", 
        json: args.data 
      }),
    onSuccess: (_d, vars) => 
      qc.invalidateQueries({ queryKey: ["faturas", vars.data.id_contrato] }),
  });
};

export const useDeleteFatura = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ mensagem: string }>(`/faturas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturas"] }),
  });
};