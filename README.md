# 🏥 Gestão do Cuidado (PSA)

Sistema de consultoria B2B para gestão de clientes, contratos, entregas, financeiro e CRM.  
Backend modularizado, testado e pronto para produção. Frontend React integrado.

---

## 🚀 Tecnologias

| Camada        | Tecnologias                                                                 |
|---------------|-----------------------------------------------------------------------------|
| Backend       | FastAPI (Python 3.11+), SQLAlchemy, PostgreSQL (Supabase)                   |
| Frontend      | React + Vite + TanStack Router + shadcn/ui                                   |
| Testes        | pytest + httpx (41 cenários automatizados)                                  |
| Ferramentas   | Metabase (dashboards), ViaCEP (preenchimento automático de endereços)       |

---

## 📁 Estrutura do Projeto

```
consultoria_adriano/
├── back/                       # Backend FastAPI
│   ├── main.py                 # Aplicação principal
│   ├── core/                   # Configurações e banco de dados
│   │   ├── config.py           # Settings (carrega .env da raiz)
│   │   ├── database.py         # Engine, SessionLocal, Base
│   │   ├── security.py         # Autenticação JWT + bcrypt
│   │   └── logging_config.py   # Logging estruturado (JSON)
│   ├── models/                 # ORM SQLAlchemy (um arquivo por entidade)
│   ├── schemas/                # Schemas Pydantic de entrada/saída
│   ├── api/v1/                 # Rotas versionadas (prefixo /api/v1)
│   │   ├── auth.py             # Registro e login
│   │   └── ...                 # Demais módulos (protegidos por JWT)
│   ├── services/               # Lógica de negócio (ex.: ViaCEP)
│   ├── validators/             # Funções de validação reutilizáveis
│   ├── tests/                  # Testes automatizados (41 cenários)
│   ├── criar_admin.py          # Script para criação rápida de usuário admin
│   └── requirements.txt
├── frontend/                   # Frontend React (isolado)
│   ├── .env                    # Variáveis de ambiente do frontend
│   └── ... (src, public, node_modules)
├── scripts/
│   └── dev.sh                  # Script para subir back e front ao mesmo tempo
├── .env                        # Variáveis de ambiente do backend
└── README.md
```

---

## ⚙️ Pré‑requisitos

- **Python 3.11+** instalado
- **Node.js 18+** e npm instalados
- **Banco de dados PostgreSQL** (a URL de conexão será fornecida)
- (Opcional) **Git** para clonar o repositório

---

## 🔧 Como Rodar o Projeto (Passo a Passo)

### 🚀 Inicialização rápida (com script)

Para subir backend e frontend com um único comando, execute:

```bash
./scripts/dev.sh
```

O script cria o ambiente virtual, instala dependências e inicia os dois servidores automaticamente.

### 1. Backend (manual)

1. **Clone o repositório** e acesse a pasta raiz:
   ```bash
   git clone <url-do-repo> consultoria_adriano
   cd consultoria_adriano
   ```

2. **Crie e ative um ambiente virtual** (recomendado):
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/Mac:
   source .venv/bin/activate
   ```

3. **Instale as dependências**:
   ```bash
   pip install -r back/requirements.txt
   ```
   > Os pacotes de teste (`pytest`, `httpx`) já estão incluídos no `requirements.txt`.

4. **Configure o arquivo `.env` do backend** – ele deve ficar na **raiz do projeto** (`consultoria_adriano/.env`):
   ```env
   DATABASE_URL="postgresql://postgres:YqErvrYQ4NjAvREU@db.erubhkiwdkotwmgqezca.supabase.co:5432/postgres"
   CORS_ALLOW_ORIGINS="http://localhost:8080,http://127.0.0.1:8080"
   ```
   > Substitua `DATABASE_URL` pela sua string de conexão.

5. **Execute o servidor** a partir da raiz (o `.env` é carregado automaticamente):
   ```bash
   python -m uvicorn back.main:app --reload
   ```
   O backend estará em `http://localhost:8000`.  
   Acesse a documentação interativa (Swagger) em [`http://localhost:8000/docs`](http://localhost:8000/docs).

---

## 🔐 Autenticação (JWT)

A API exige autenticação para criar, editar ou excluir recursos. Rotas de leitura (GET) são públicas.

### Criar usuário admin rapidamente

Execute o script incluso no projeto:

```bash
python back/criar_admin.py
```

Isso criará o usuário:

- **Login:** `admin`
- **Senha:** `123456`

> **Nota:** Se ocorrer o erro `ModuleNotFoundError: No module named 'back'`, execute o comando a partir da raiz do projeto (é o local correto). O script já está preparado para funcionar dessa forma.

### Usar no Swagger (passo a passo)

1. Acesse [`http://localhost:8000/docs`](http://localhost:8000/docs).
2. Vá até **`POST /api/v1/auth/login`** e clique em **"Try it out"**.
3. No campo **"Request body"**, apague qualquer conteúdo e cole exatamente:
   ```json
   {
     "username": "admin",
     "password": "123456"
   }
   ```
4. Clique em **"Execute"**. O servidor retornará um JSON com o campo `access_token`.
5. Copie apenas o valor da chave `access_token` (uma string longa).
6. No topo da página, clique no ícone de cadeado **Authorize** 🔒.
7. Na janela que abrir, cole o token no campo **Value** (não é necessário digitar "Bearer").
8. Clique em **"Authorize"** e depois em **"Close"**.

Agora todas as rotas protegidas (marcadas com ✅ na tabela abaixo) estarão acessíveis.

> **Problema comum:** Se o login retornar erro `422` com `JSON decode error`, certifique-se de que o corpo da requisição está exatamente como o JSON acima, sem caracteres extras. Basta limpar o campo e digitar novamente.

---

### 2. Frontend

1. **Navegue até a pasta do frontend**:
   ```bash
   cd frontend
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure o arquivo `.env` do frontend** (já existente):
   ```env
   VITE_API_BASE=http://localhost:8000/api/v1
   ```

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   O frontend abrirá em `http://localhost:8080` (ou outra porta configurada).

---

## 🧪 Executando os Testes Automatizados

Os testes estão localizados em `back/tests/`.  
Com o ambiente virtual ativado, execute **a partir da raiz do projeto** (onde o `.env` está):

```bash
python -m pytest back/tests/ -v
```

Ou, se preferir, entre na pasta `back` e execute de lá:

```bash
cd back
python -m pytest tests/ -v
```

Todos os 41 testes passam em cerca de 67 segundos.  
Os testes são isolados e **não poluem o banco de dados** – cada teste cria seus próprios registros e os remove ao final.

### ⚠️ Se algum teste falhar

- Certifique-se de que o servidor **não** está rodando (os testes usam seu próprio cliente).
- Caso apareçam erros de limpeza (ex.: `AssertionError` ao deletar), execute os testes novamente – a suíte foi projetada para suportar múltiplas execuções.
- Se houver registros de execuções anteriores (empresas "Teste", modelos repetidos), você pode limpá-los manualmente com os comandos abaixo (no banco de dados):
  ```sql
  DELETE FROM empresa_cliente WHERE nome_empresa LIKE 'Empresa Teste%' OR nome_empresa IN ('Empresa Duplicada', 'Empresa Única', 'Para excluir', 'Sem CNPJ', 'Teste Protegido', 'Empresa Protegida');
  DELETE FROM modelo_contrato WHERE nome_modelo IN ('Modelo de Teste Automático', 'Arquivar Teste', 'Modelo XYZ');
  ```

---

## 📡 Principais Endpoints da API

| Método   | Rota                              | Protegida | Descrição                                     |
|----------|-----------------------------------|-----------|-----------------------------------------------|
| GET      | `/api/v1/empresas`                | ❌        | Listar empresas (com busca e paginação)       |
| POST     | `/api/v1/empresas`                | ✅        | Criar nova empresa (preenche endereço via CEP)|
| GET      | `/api/v1/empresas/{id}`           | ❌        | Detalhes de uma empresa                       |
| PUT      | `/api/v1/empresas/{id}`           | ✅        | Atualizar dados da empresa                    |
| DELETE   | `/api/v1/empresas/{id}`           | ✅        | Excluir empresa                               |
| POST     | `/api/v1/contratos`               | ✅        | Criar contrato (gera faturas automaticamente) |
| GET      | `/api/v1/contratos/{id_cliente}`  | ❌        | Listar contratos de uma empresa               |
| GET      | `/api/v1/faturas?id_contrato={id}`| ❌        | Listar faturas de um contrato                 |
| PUT      | `/api/v1/faturas/{id}`            | ✅        | Atualizar status/valor de uma fatura          |
| POST     | `/api/v1/pagamentos`              | ✅        | Registrar pagamento (opcionalmente vincula fatura)|
| GET      | `/api/v1/pagamentos/contrato/{id}`| ❌        | Listar pagamentos de um contrato              |
| GET      | `/api/v1/interacoes/{id_cliente}` | ❌        | Histórico de interações com cliente           |
| POST     | `/api/v1/interacoes`              | ✅        | Registrar nova interação                      |
| GET      | `/api/v1/interacoes/pagas`        | ❌        | Listar interações pagas                       |
| GET      | `/api/v1/dashboard/kpis`          | ❌        | Indicadores principais (empresas, contratos, receita)|
| POST     | `/api/v1/auth/register`           | ❌        | Criar novo usuário                            |
| POST     | `/api/v1/auth/login`              | ❌        | Fazer login e obter token                     |

A lista completa de endpoints, com parâmetros e exemplos, está disponível no Swagger em [`/docs`](http://localhost:8000/docs).

---

## 📊 Status Atual do Projeto

| Item                          | Situação         |
|-------------------------------|------------------|
| Banco de dados normalizado    | ✅ 1FN, 2FN, 3FN |
| Integridade referencial        | ✅ FKs com CASCADE |
| Backend modularizado          | ✅ /api/v1       |
| Validações multicamada        | ✅ Banco, ORM, Pydantic |
| Testes automatizados          | ✅ 41 testes (100% passando) |
| Documentação OpenAPI          | ✅ Swagger enriquecido |
| Preenchimento automático CEP  | ✅ ViaCEP        |
| Autenticação JWT              | ✅ Registro, login, proteção de rotas |
| Logging estruturado           | ✅ JSON em arquivo e console |
| CI/CD                         | ⏳ Em planejamento |

---

## 🤝 Contribuição

1. Crie uma branch a partir de `main`.
2. Execute `pytest` antes de abrir um Pull Request.
3. Atualize os testes se adicionar novas funcionalidades.

---

**Desenvolvido com 💙 pela equipe Questify.**