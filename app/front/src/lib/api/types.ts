// Tipos espelhados dos schemas Pydantic da API
export type UUID = string;

// --- NOVO DTO: Catálogo de Serviços ---
export interface ServicoDetalhe {
  id_servico: UUID;
  nome_servico: string;
}

export interface Empresa {
  id_cliente: UUID;
  nome_empresa: string;
  cnpj?: string | null;
  email?: string | null;
  
  // --- COLUNAS ATÔMICAS DE LOCALIZAÇÃO ---
  cep?: string | null;
  localizacao_estado?: string | null;
  localizacao_cidade?: string | null;
  localizacao_bairro?: string | null;
  logradouro?: string | null;
  
  // --- SERVIÇOS VINCULADOS ---
  servicos_contratados: ServicoDetalhe[];
  
  // Arrays para suportar a EmpresaResponseCompleta (usado nas tabelas do front)
  interacoes?: any[];
  contratos?: any[];
  financeiro?: any[];
}

export interface EmpresaCreate {
  nome_empresa: string;
  cnpj?: string | null;
  email?: string | null;
  
  // --- COLUNAS ATÔMICAS DE LOCALIZAÇÃO ---
  cep?: string | null;
  localizacao_estado?: string | null;
  localizacao_cidade?: string | null;
  localizacao_bairro?: string | null;
  logradouro?: string | null;
  
  // Array de UUIDs para enviar ao back-end na hora de salvar
  ids_servicos_contratados: UUID[];
}

// ==========================================
// RESTANTE DO ARQUIVO MANTIDO INTACTO
// ==========================================

export interface Responsavel {
  id_responsavel: UUID;
  id_cliente: UUID;
  nome: string;
  cpf?: string | null;
  cargo?: string | null;
}

export interface ResponsavelCreate {
  id_cliente: UUID;
  nome: string;
  cpf?: string | null;
  cargo?: string | null;
}

export interface ModeloContrato {
  id_modelo: UUID;
  nome_modelo: string;
  periodicidade_cobranca?: string | null;
  descricao_padrao?: string | null;
}

export interface ModeloContratoCreate {
  nome_modelo: string;
  periodicidade_cobranca?: string | null;
  descricao_padrao?: string | null;
}

export interface Contrato {
  id_contrato: UUID;
  id_cliente: UUID;
  id_modelo: UUID;
  valor_acordado: number;
  status_contrato?: string | null;
  data_inicio: string; // YYYY-MM-DD
  data_fim?: string | null;
}

export interface ContratoCreate {
  id_cliente: UUID;
  id_modelo: UUID;
  valor_acordado: number;
  status_contrato?: string | null;
  data_inicio: string;
  data_fim?: string | null;
}

export interface Paciente {
  id_paciente: UUID;
  id_cliente: UUID;
  nome: string;
  historico_cuidados?: string | null;
}

export interface PacienteCreate {
  id_cliente: UUID;
  nome: string;
  historico_cuidados?: string | null;
}

// ✅ TIPO PARA STATUS FINANCEIRO (apenas 2 opções)
export type StatusFinanceiro = 'Não Paga' | 'Paga';

// ✅ ATUALIZADO: HistoricoInteracao com status_financeiro
export interface HistoricoInteracao {
  id_interacao?: UUID;
  id_cliente: UUID;
  tipo_interacao?: string | null;
  data_hora?: string | null;
  feedback_anotacoes?: string | null;
  grau_urgencia?: string | null;
  status_financeiro?: StatusFinanceiro; // ✅ ADICIONADO
  valor_cobrado?: number | null
  status_pagamento?: string | null;
}

// ✅ ATUALIZADO: HistoricoInteracaoCreate com status_financeiro
export interface HistoricoInteracaoCreate {
  id_cliente: UUID;
  tipo_interacao?: string | null;
  data_hora?: string | null;
  feedback_anotacoes?: string | null;
  grau_urgencia?: string | null;
  status_financeiro?: StatusFinanceiro; // ✅ ADICIONADO
  valor_cobrado?: number | null
  status_pagamento?: string | null;
}

// ✅ NOVO: Payload específico para atualização parcial (PUT)
export interface InteracaoUpdatePayload {
  tipo_interacao?: string;
  data_hora?: string;
  feedback_anotacoes?: string;
  grau_urgencia?: string;
  status_financeiro?: StatusFinanceiro;
}

export interface Entrega {
  id_entrega: UUID;
  id_contrato: UUID;
  descricao_entrega: string;
  data_prazo_limite: string; // YYYY-MM-DD
  data_conclusao?: string | null;
  status_entrega?: string | null;
}

export interface Pagamento {
  id_pagamento?: UUID;
  id_contrato: UUID;
  id_visita?: UUID | null;
  valor: number;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
}

export interface PagamentoCreate {
  id_contrato: UUID;
  id_visita?: UUID | null;
  valor: number;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
}

export interface Fatura {
  id_fatura: string;
  id_contrato: string;
  data_emissao?: string | null;
  valor_original?: number;
  data_vencimento?: string | null;
  status?: string | null;
  data_pagamento?: string | null;
  valor_juros_pago?: number | null;
}

export interface InteracoesPagasResumo {
  total_interacoes: number;
  total_valor: number;
}