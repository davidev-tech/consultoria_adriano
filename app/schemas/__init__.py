from .common import ServicoDetalhe, EnderecoResponse, PendenciaResponse, InteracaoFront, ContratoFront, FinanceiroFront
from .empresa import EmpresaBase, EmpresaCreate, EmpresaResponse
from .responsavel import ResponsavelBase, ResponsavelCreate, ResponsavelResponse, ResponsavelListResponse
from .modelo_contrato import ModeloContratoBase, ModeloContratoCreate, ModeloContratoResponse
from .contrato import ContratoBase, ContratoCreate, ContratoResponse
from .interacao import InteracaoBase, InteracaoCreate, InteracaoResponse
from .entrega import EntregaBase, EntregaCreate, EntregaResponse
from .pagamento import PagamentoBase, PagamentoCreate, PagamentoResponse
from .fatura import FaturaBase, FaturaCreate, FaturaResponse

# ... (imports existentes)

# Rebuild models that use forward references to resolve OpenAPI schema
from .empresa import EmpresaResponse
from .contrato import ContratoResponse
from .interacao import InteracaoResponse
from .entrega import EntregaResponse
from .fatura import FaturaResponse
from .pagamento import PagamentoResponse

EmpresaResponse.model_rebuild()
ContratoResponse.model_rebuild()
InteracaoResponse.model_rebuild()
EntregaResponse.model_rebuild()
FaturaResponse.model_rebuild()
PagamentoResponse.model_rebuild()