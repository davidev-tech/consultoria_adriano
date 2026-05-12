import re
import bleach
from datetime import date, datetime
from typing import List, Optional
from validate_docbr import CPF, CNPJ

# Instâncias únicas para performance (Singleton-like)
_validador_cpf = CPF()
_validador_cnpj = CNPJ()

# ==========================================
# 1. VALIDAÇÃO DE DOCUMENTOS (Algoritmos BR)
# ==========================================

def validate_cpf(v: str) -> str:
    if not v:
        return v
    numeros = re.sub(r'\D', '', v) # Simplificado para remover tudo que não é dígito
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
# 2. CONTATOS E LOCALIZAÇÃO
# ==========================================

def validate_email(v: str) -> str:
    """Valida o formato de e-mail e garante letras minúsculas."""
    if not v:
        return v
    regex = r'^[a-z0-9]+[\._]?[a-z0-9]+[@]\w+[.]\w{2,3}$'
    if not re.match(regex, v.lower()):
        raise ValueError("Formato de e-mail inválido.")
    return v.lower().strip()

def validate_phone_br(v: str) -> str:
    """Valida telefones brasileiros (fixos ou celulares) com DDD."""
    if not v:
        return v
    numeros = re.sub(r'\D', '', v)
    if len(numeros) not in [10, 11]:
        raise ValueError("Telefone deve ter 10 (fixo) ou 11 (celular) dígitos com DDD.")
    return numeros

def validate_cep(v: str) -> str:
    """Garante que o CEP tenha exatamente 8 dígitos."""
    if not v:
        return v
    numeros = re.sub(r'\D', '', v)
    if len(numeros) != 8:
        raise ValueError("CEP deve conter exatamente 8 dígitos numéricos.")
    return numeros

# ==========================================
# 3. TEXTO E SEGURANÇA (Refinado)
# ==========================================

def validate_string_content(v: Optional[str], min_length: int = 3, max_length: int = 255) -> Optional[str]:
    """Remove espaços, limpa tags HTML (XSS) e valida limites."""
    if v is None:
        return v
    
    # Sanitização: Remove qualquer tag HTML/Script para evitar ataques XSS
    sanitized = bleach.clean(v.strip(), tags=[], strip=True)
    
    if len(sanitized) < min_length:
        raise ValueError(f"O conteúdo deve ter pelo menos {min_length} caracteres significativos.")
    if len(sanitized) > max_length:
        raise ValueError(f"O conteúdo excede o limite de segurança de {max_length} caracteres.")
    
    return sanitized

# ==========================================
# 4. CALENDÁRIO E TÉCNICOS
# ==========================================

def validate_not_past_date(v: date) -> date:
    if v and v < date.today():
        raise ValueError("A data não pode ser anterior ao dia de hoje.")
    return v

def validate_not_past_datetime(v: datetime) -> datetime:
    if v and v.date() < date.today():
        raise ValueError("O registro não pode ter data/hora retroativa.")
    return v

def validate_positive_value(v: float) -> float:
    if v <= 0:
        raise ValueError("O valor deve ser um número positivo maior que zero.")
    return v

def validate_coordinates(v: Optional[str]) -> Optional[str]:
    """Valida formato 'Lat, Long'."""
    if not v:
        return v
    padrao = r'^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$'
    if not re.match(padrao, v.strip()):
        raise ValueError("Formato de coordenadas inválido. Use: 'Lat, Long'.")
    return v.strip()

def validate_enum_choice(v: str, allowed_choices: List[str]) -> str:
    if v not in allowed_choices:
        raise ValueError(f"Valor inválido. Use: {', '.join(allowed_choices)}")
    return v