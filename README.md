# 🏥 Sistema de Gestão - Consultoria Adriano (Economia do Cuidado)

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23336791.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Metabase](https://img.shields.io/badge/Metabase-509EE3?style=for-the-badge&logo=Metabase&logoColor=white)

> Sistema completo de gestão focado na Economia do Cuidado, desenvolvido para otimizar a operação de consultoria, controle de contratos e visibilidade financeira.

## 📌 Contexto do Projeto
Este projeto foi desenvolvido para atender às dores específicas de um consultor de gestão que atua em instituições de cuidado (como lares de idosos e clínicas). O foco é resolver a ineficiência em anotações de visitas, bagunça na agenda e o esquecimento recorrente de baixas de pagamento.

---

## 🛠️ Tecnologias Utilizadas

- **Linguagem:** Python 3.11+
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Performance e documentação automática)
- **Banco de Dados:** PostgreSQL (Relacional e Robusto)
- **ORM:** SQLAlchemy (Mapeamento Objeto-Relacional)
- **BI & Analytics:** [Metabase](https://www.metabase.com/) (Visualização de dados Open Source)
- **Validação de Dados:** Pydantic

---

## 📊 Arquitetura de Dados

O banco de dados foi modelado para garantir integridade referencial e escalabilidade. Os principais módulos incluem:
- **CRM:** Cadastro de empresas, responsáveis e pacientes.
- **Contratos:** Gestão de modelos (mensais/avulsos) e vigência.
- **Operação:** Registro de visitas com geolocalização e histórico de feedback.
- **Financeiro:** Controle automático de faturamento e status de pagamento.



[Image of database schema diagram]


---

## 🚀 Como Rodar o Projeto (Local)

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/nome-do-repositorio.git](https://github.com/seu-usuario/nome-do-repositorio.git)
   cd nome-do-repositorio
  instale as bibliotecas necessarias abra o terminal e digite: pip install -r requerimentos.txt
