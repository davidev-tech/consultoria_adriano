// Tipos espelhados dos schemas Pydantic da API
export type UUID = string;

export interface Empresa {
  id_cliente: UUID;
  nome_empresa: string;
  cnpj?: string | null;
  email?: string | null;
  cep?: string | null;
  localizacao?: string | null;
  servico_prestado?: string | null;
}
export interface EmpresaCreate {
  nome_empresa: string;
  cnpj?: string | null;
  email?: string | null;
  cep?: string | null;
  localizacao?: string | null;
  servico_prestado?: string | null;
}

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

export interface HistoricoInteracao {
  id_interacao?: UUID;
  id_cliente: UUID;
  tipo_interacao?: string | null;
  data_hora?: string | null;
  coordenadas_geo?: string | null;
  feedback_anotacoes?: string | null;
}
export interface HistoricoInteracaoCreate {
  id_cliente: UUID;
  tipo_interacao?: string | null;
  data_hora?: string | null;
  coordenadas_geo?: string | null;
  feedback_anotacoes?: string | null;
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
