import re
from datetime import date, datetime
from typing import List, Optional
from validate_docbr import CPF, CNPJ
import bleach

# Instâncias únicas para performance (Singleton-like)
_validador_cpf = CPF()
_validador_cnpj = CNPJ()

# ==========================================
# 1. VALIDAÇÃO DE DOCUMENTOS BRASILEIROS
# ==========================================

def validate_cpf(v: str) -> str:
    if not v:
        return v
    numeros = re.sub(r'\D', '', v)
    if not _validador_cpf.validate(numeros):
        raise ValueError("CPF matematicamente inválido.")
    return numeros

def validate_cnpj(v: str) -> str:
    if not v:
        return v
    numeros = re.sub(r'\D', '', v)
    if not _validador_cnpj.validate(numeros):
        raise ValueError("CNPJ matematicamente inválido.")
    return numeros

# ==========================================
# 2. VALIDAÇÕES DE NEGÓCIO
# ==========================================

def validate_positive_value(v: float) -> float:
    """Valor estritamente positivo (> 0)."""
    if v <= 0:
        raise ValueError("O valor deve ser um número positivo maior que zero.")
    return v

def validate_non_negative_value(v: float) -> float:
    """Valor não negativo (>= 0)."""
    if v < 0:
        raise ValueError("O valor não pode ser negativo.")
    return v

def validate_enum_choice(v: str, allowed_choices: List[str]) -> str:
    """Verifica se o valor pertence a uma lista de opções permitidas."""
    if v not in allowed_choices:
        raise ValueError(f"Valor inválido. Use: {', '.join(allowed_choices)}")
    return v

def validate_not_past_date(v: date) -> date:
    """Data não pode ser anterior à data atual."""
    if v and v < date.today():
        raise ValueError("A data não pode ser anterior ao dia de hoje.")
    return v

def validate_string_content(v: Optional[str], min_length: int = 3, max_length: int = 1000) -> Optional[str]:
    """Sanitiza texto removendo HTML e valida comprimento."""
    if v is None:
        return v
    sanitized = bleach.clean(v.strip(), tags=[], strip=True)
    if len(sanitized) < min_length:
        raise ValueError(f"O conteúdo deve ter pelo menos {min_length} caracteres significativos.")
    if len(sanitized) > max_length:
        raise ValueError(f"O conteúdo excede o limite de segurança de {max_length} caracteres.")
    return sanitized