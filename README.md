```markdown
# 🏥 Gestão do Cuidado (PSA)

Sistema de consultoria B2B para gestão de clientes, contratos, entregas, financeiro e CRM.  
Backend modularizado, testado e pronto para produção. Frontend React integrado.

---

## 🚀 Tecnologias

| Camada        | Tecnologias                                                                 |
|---------------|-----------------------------------------------------------------------------|
| Backend       | FastAPI (Python 3.11+), SQLAlchemy, PostgreSQL (Supabase)                   |
| Frontend      | React + Vite + TanStack Router + shadcn/ui                                   |
| Testes        | pytest + httpx (34 cenários automatizados)                                  |
| Ferramentas   | Metabase (dashboards), ViaCEP (preenchimento automático de endereços)       |

---

## 📁 Estrutura do Projeto

```
consultoria_adriano/
├── back/                       # Backend FastAPI
│   ├── main.py                 # Aplicação principal
│   ├── core/                   # Configurações e banco de dados
│   │   ├── config.py           # Settings (carrega .env da raiz)
│   │   └── database.py         # Engine, SessionLocal, Base
│   ├── models/                 # ORM SQLAlchemy (um arquivo por entidade)
│   ├── schemas/                # Schemas Pydantic de entrada/saída
│   ├── api/v1/                 # Rotas versionadas (prefixo /api/v1)
│   ├── services/               # Lógica de negócio (ex.: ViaCEP)
│   ├── validators/             # Funções de validação reutilizáveis
│   ├── tests/                  # Testes automatizados (34 cenários)
│   └── requirements.txt
├── frontend/                   # Frontend React (isolado)
│   ├── .env                    # Variáveis de ambiente do frontend
│   └── ... (src, public, node_modules)
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

### 1. Backend

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

Ou, se preferir, entre na pasta `back` e execute de lá (o pytest encontrará o `.env` na raiz automaticamente):

```bash
cd back
python -m pytest tests/ -v
```

Todos os 34 testes passam em cerca de 60 segundos.  
Os testes são isolados e **não poluem o banco de dados** – cada teste cria seus próprios registros e os remove ao final.

---

## 📡 Principais Endpoints da API

| Método   | Rota                              | Descrição                                     |
|----------|-----------------------------------|-----------------------------------------------|
| GET      | `/api/v1/empresas`                | Listar empresas (com busca e paginação)       |
| POST     | `/api/v1/empresas`                | Criar nova empresa (preenche endereço via CEP)|
| GET      | `/api/v1/empresas/{id}`           | Detalhes de uma empresa                       |
| PUT      | `/api/v1/empresas/{id}`           | Atualizar dados da empresa                    |
| DELETE   | `/api/v1/empresas/{id}`           | Excluir empresa                               |
| POST     | `/api/v1/contratos`               | Criar contrato (gera faturas automaticamente) |
| GET      | `/api/v1/contratos/{id_cliente}`  | Listar contratos de uma empresa               |
| GET      | `/api/v1/faturas?id_contrato={id}`| Listar faturas de um contrato                 |
| PUT      | `/api/v1/faturas/{id}`            | Atualizar status/valor de uma fatura          |
| POST     | `/api/v1/pagamentos`              | Registrar pagamento (opcionalmente vincula fatura)|
| GET      | `/api/v1/pagamentos/contrato/{id}`| Listar pagamentos de um contrato              |
| GET      | `/api/v1/interacoes/{id_cliente}` | Histórico de interações com cliente           |
| POST     | `/api/v1/interacoes`              | Registrar nova interação                      |
| GET      | `/api/v1/interacoes/pagas`        | Listar interações pagas                       |
| GET      | `/api/v1/dashboard/kpis`          | Indicadores principais (empresas, contratos, receita)|

A lista completa de endpoints, com parâmetros e exemplos, está disponível no Swagger em [`/docs`](http://localhost:8000/docs).

---

## 📊 Status Atual do Projeto

| Item                          | Situação         |
|-------------------------------|------------------|
| Banco de dados normalizado    | ✅ 1FN, 2FN, 3FN |
| Integridade referencial        | ✅ FKs com CASCADE |
| Backend modularizado          | ✅ /api/v1       |
| Validações multicamada        | ✅ Banco, ORM, Pydantic |
| Testes automatizados          | ✅ 34 testes (100% passando) |
| Documentação OpenAPI          | ✅ Swagger enriquecido |
| Preenchimento automático CEP  | ✅ ViaCEP        |
| Autenticação                  | ⏳ Em planejamento |
| CI/CD                         | ⏳ Em planejamento |

---

## 🤝 Contribuição

1. Crie uma branch a partir de `main`.
2. Execute `pytest` antes de abrir um Pull Request.
3. Atualize os testes se adicionar novas funcionalidades.

---

**Desenvolvido com 💙 pela equipe Questify.**