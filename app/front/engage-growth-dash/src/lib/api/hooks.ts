import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Contrato,
  ContratoCreate,
  Empresa,
  EmpresaCreate,
  Entrega,
  HistoricoInteracao,
  HistoricoInteracaoCreate,
  ModeloContrato,
  ModeloContratoCreate,
  Paciente,
  PacienteCreate,
  Pagamento,
  PagamentoCreate,
  Responsavel,
  ResponsavelCreate,
  UUID,
} from "./types";

// Empresas
export const useEmpresas = () =>
  useQuery({ queryKey: ["empresas"], queryFn: () => api<Empresa[]>("/empresas") });

export const useCreateEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmpresaCreate) =>
      api<Empresa>("/empresas", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
};

// Responsáveis
export const useResponsaveis = (idCliente?: UUID) =>
  useQuery({
    queryKey: ["responsaveis", idCliente],
    queryFn: () => api<Responsavel[]>(`/responsaveis/${idCliente}`),
    enabled: !!idCliente,
  });

export const useCreateResponsavel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResponsavelCreate) =>
      api<Responsavel>("/responsaveis", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["responsaveis", vars.id_cliente] }),
  });
};

// Modelos de contrato
export const useModelos = () =>
  useQuery({ queryKey: ["modelos"], queryFn: () => api<ModeloContrato[]>("/modelos-contrato") });

export const useCreateModelo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ModeloContratoCreate) =>
      api<ModeloContrato>("/modelos-contrato", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modelos"] }),
  });
};

// Contratos
export const useContratosPorEmpresa = (idCliente?: UUID) =>
  useQuery({
    queryKey: ["contratos", idCliente],
    queryFn: () => api<Contrato[]>(`/contratos/${idCliente}`),
    enabled: !!idCliente,
  });

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

// Pacientes
export const useCreatePaciente = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PacienteCreate) =>
      api<Paciente>("/pacientes", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["pacientes", vars.id_cliente] }),
  });
};

// Interações
export const useCreateInteracao = () =>
  useMutation({
    mutationFn: (data: HistoricoInteracaoCreate) =>
      api<HistoricoInteracao>("/interacoes", { method: "POST", json: data }),
  });

// Pagamentos
export const usePagamentosPorContrato = (idContrato?: UUID) =>
  useQuery({
    queryKey: ["pagamentos", idContrato],
    queryFn: () => api<Pagamento[]>(`/pagamentos/contrato/${idContrato}`),
    enabled: !!idContrato,
  });

export const useCreatePagamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PagamentoCreate) =>
      api<Pagamento>("/pagamentos", { method: "POST", json: data }),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["pagamentos", vars.id_contrato] }),
  });
};

// Agregação: total de contratos somando todas as empresas
export const useTodosContratos = () => {
  const empresas = useEmpresas();
  return useQuery({
    queryKey: ["contratos-all", empresas.data?.map((e) => e.id_cliente).join(",")],
    enabled: !!empresas.data,
    queryFn: async () => {
      const all = await Promise.all(
        (empresas.data ?? []).map((e) =>
          api<Contrato[]>(`/contratos/${e.id_cliente}`).catch(() => [] as Contrato[]),
        ),
      );
      return all.flat();
    },
  });
};

// Interações por cliente
export const useInteracoesPorCliente = (idCliente?: UUID) =>
  useQuery({
    queryKey: ["interacoes", idCliente],
    queryFn: () => api<HistoricoInteracao[]>(`/interacoes/${idCliente}`),
    enabled: !!idCliente,
  });

// Entregas por contrato
export const useEntregasPorContrato = (idContrato?: UUID) =>
  useQuery({
    queryKey: ["entregas", idContrato],
    queryFn: () => api<Entrega[]>(`/entregas/contrato/${idContrato}`),
    enabled: !!idContrato,
  });

// Múltiplas listas de interações por cliente em paralelo
export const useInteracoesMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["interacoes", id],
      queryFn: () => api<HistoricoInteracao[]>(`/interacoes/${id}`).catch(() => [] as HistoricoInteracao[]),
    })),
  });

// Múltiplas listas de contratos por empresa em paralelo
export const useContratosMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["contratos", id],
      queryFn: () => api<Contrato[]>(`/contratos/${id}`).catch(() => [] as Contrato[]),
    })),
  });

// Múltiplas listas de entregas por contrato em paralelo
export const useEntregasMulti = (ids: UUID[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["entregas", id],
      queryFn: () => api<Entrega[]>(`/entregas/contrato/${id}`).catch(() => [] as Entrega[]),
    })),
  });
