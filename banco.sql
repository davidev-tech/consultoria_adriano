import sqlite3
import uuid
from datetime import datetime

# 1: Função de conexão centralizada com Row Factory
def conexao_bd():
    conn = sqlite3.connect('meu_banco_consultoria.db')
    # Permite acessar colunas pelo nome: linha['nome_empresa'] em vez de linha[0]
    conn.row_factory = sqlite3.Row 
    return conn

# 2: Criação de tabelas com Chaves Estrangeiras explícitas (Padrão SQLite)
def inicializar_banco():
    conn = conexao_bd()
    cursor = conn.cursor()
    
    # Ativa o suporte a Foreign Keys no SQLite (obrigatório em cada conexão)
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Tabela Empresa (Exemplo: FarmaVida, Creche, etc)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS empresa_cliente (
        id_cliente TEXT PRIMARY KEY,
        nome_empresa TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        localizacao TEXT,
        servico_prestado TEXT
    )
    ''')

    # Tabela Contrato
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS contrato (
        id_contrato TEXT PRIMARY KEY,
        id_cliente TEXT,
        valor_acordado REAL,
        status_contrato TEXT,
        FOREIGN KEY (id_cliente) REFERENCES empresa_cliente (id_cliente)
    )
    ''')

    conn.commit()
    conn.close()
    print("Banco de dados inicializado com sucesso!")

# 3: Gerenciamento de UUID e Transações Seguras
def inserir_empresa(nome, cnpj, local, servico):
    conn = conexao_bd()
    cursor = conn.cursor()
    
    # Gerando o ID via Python para evitar limitações do SQLite
    novo_id = str(uuid.uuid4())
    
    try:
        cursor.execute('''
            INSERT INTO empresa_cliente (id_cliente, nome_empresa, cnpj, localizacao, servico_prestado)
            VALUES (?, ?, ?, ?, ?)
        ''', (novo_id, nome, cnpj, local, servico))
        
        conn.commit() # 4: Só salva se tudo der certo
        print(f"Empresa {nome} cadastrada com ID: {novo_id}")
        return novo_id
    except sqlite3.IntegrityError:
        print("Erro: CNPJ já cadastrado!")
        conn.rollback() # 5: Desfaz qualquer alteração em caso de erro
    finally:
        conn.close()

# 5: Consulta limpa retornando Dicionários
def listar_empresas():
    conn = conexao_bd()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM empresa_cliente ORDER BY nome_empresa")
    
    resultados = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return resultados   
def inicializar_banco():
    conn = conexao_bd()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Estrutura COMPLETA com todas as 9 tabelas do ecossistema
    cursor.executescript('''
        -- 1. Tabelas Base (Não dependem de ninguém)
        CREATE TABLE IF NOT EXISTS empresa_cliente (
            id_cliente TEXT PRIMARY KEY,
            nome_empresa TEXT NOT NULL,
            cnpj TEXT UNIQUE,
            localizacao TEXT,
            servico_prestado TEXT
        );

        CREATE TABLE IF NOT EXISTS modelo_contrato (
            id_modelo TEXT PRIMARY KEY,
            nome_modelo TEXT NOT NULL,
            periodicidade_cobranca TEXT,
            descricao_padrao TEXT
        );

        -- 2. Tabelas de Primeiro Nível (Dependem da Empresa ou Modelo)
        CREATE TABLE IF NOT EXISTS responsavel (
            id_responsavel TEXT PRIMARY KEY,
            id_cliente TEXT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE,
            cargo TEXT,
            FOREIGN KEY (id_cliente) REFERENCES empresa_cliente (id_cliente)
        );

        CREATE TABLE IF NOT EXISTS historico_interacoes (
            id_interacao TEXT PRIMARY KEY,
            id_cliente TEXT,
            tipo_interacao TEXT,
            data_hora TEXT,
            coordenadas_geo TEXT,
            feedback_anotacoes TEXT,
            FOREIGN KEY (id_cliente) REFERENCES empresa_cliente (id_cliente)
        );

        CREATE TABLE IF NOT EXISTS paciente_beneficiario (
            id_paciente TEXT PRIMARY KEY,
            id_cliente TEXT,
            nome TEXT NOT NULL,
            historico_cuidados TEXT,
            FOREIGN KEY (id_cliente) REFERENCES empresa_cliente (id_cliente)
        );

        CREATE TABLE IF NOT EXISTS contrato (
            id_contrato TEXT PRIMARY KEY,
            id_cliente TEXT,
            id_modelo TEXT,
            valor_acordado REAL,
            status_contrato TEXT,
            data_inicio TEXT,
            data_fim TEXT,
            FOREIGN KEY (id_cliente) REFERENCES empresa_cliente (id_cliente),
            FOREIGN KEY (id_modelo) REFERENCES modelo_contrato (id_modelo)
        );

        -- 3. Tabelas de Segundo Nível (Dependem do Contrato ou Paciente)
        CREATE TABLE IF NOT EXISTS entregas_prazos (
            id_entrega TEXT PRIMARY KEY,
            id_contrato TEXT,
            descricao_entrega TEXT NOT NULL,
            data_prazo_limite TEXT,
            data_conclusao TEXT,
            status_entrega TEXT,
            FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato)
        );

        CREATE TABLE IF NOT EXISTS visita_atendimento (
            id_visita TEXT PRIMARY KEY,
            id_contrato TEXT,
            id_paciente TEXT,
            data_hora TEXT,
            grau_urgencia TEXT,
            feedback_anotacoes TEXT,
            FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato),
            FOREIGN KEY (id_paciente) REFERENCES paciente_beneficiario (id_paciente)
        );

        -- 4. Tabelas de Terceiro Nível (Dependem da Visita e do Contrato)
        CREATE TABLE IF NOT EXISTS pagamento (
            id_pagamento TEXT PRIMARY KEY,
            id_contrato TEXT,
            id_visita TEXT,
            data_pagamento TEXT,
            valor REAL,
            forma_pagamento TEXT,
            condicao_pagamento TEXT,
            status_pagamento TEXT,
            FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato),
            FOREIGN KEY (id_visita) REFERENCES visita_atendimento (id_visita)
        );
    ''')
    conn.commit()
    conn.close()
    # Banco de Dados inicializado com TODAS as 9 tabelas


def inserir_responsavel(id_cliente, nome, cpf, cargo):
    novo_id = str(uuid.uuid4())
    conn = conexao_bd()
    try:
        conn.execute('''
            INSERT INTO responsavel (id_responsavel, id_cliente, nome, cpf, cargo)
            VALUES (?, ?, ?, ?, ?)
        ''', (novo_id, id_cliente, nome, cpf, cargo))
        conn.commit()
        return novo_id
    except Exception as e:
        conn.rollback()
        # Se o CPF já existir, ele avisa e não quebra o sistema
        print(f"Aviso ao inserir responsável {nome}: CPF já cadastrado.")
        return None
    finally:
        conn.close()



#PAGINA DA MAIN


from data_base import *

from data_base import inicializar_banco, inserir_empresa, listar_empresas, inserir_responsavel

def executar_projeto():
    # 1. Garante que o banco está pronto
    inicializar_banco()
    
    # 2. Cadastro das 7 empresas
    clientes_para_inserir = [
        {"nome": "Lar São Francisco", "cnpj": "11.222.333/0001-44", "local": "Calhau, São Luís - MA", "servico": "Gestão de Saúde Domiciliar e Assinaturas"},
        {"nome": "Creche Sonho de Criança", "cnpj": "99.888.777/0001-66", "local": "Itaqui-Bacanga, São Luís - MA", "servico": "Educação Infantil e Conformidade"},
        {"nome": "CAPS II Renascer", "cnpj": "22.333.444/0001-55", "local": "João Paulo, São Luís - MA", "servico": "Saúde Mental e Projeto Terapêutico Singular"},
        {"nome": "CuidaBem Home Care", "cnpj": "33.222.111/0001-99", "local": "Renascença II, São Luís - MA", "servico": "Marketplace de Cuidadores e Escalas"},
        {"nome": "Clínica REABILITA", "cnpj": "44.555.666/0001-22", "local": "São Francisco, São Luís - MA", "servico": "Reabilitação Híbrida (SUS/Particular)"},
        {"nome": "APAE de Bacabal", "cnpj": "00.111.222/0001-33", "local": "Bacabal - MA", "servico": "Atendimento Multidisciplinar (Saúde/Educação/Social)"},
        {"nome": "FarmaVida", "cnpj": "55.666.777/0001-88", "local": "Caxias - MA", "servico": "Farmácia e Dispensação Popular"}
    ]
    # Cadastro das 7 empresas com tratamento de erros e transações seguras
    print("\n--- 1. Cadastrando Empresas ---")
    for cliente in clientes_para_inserir:
        inserir_empresa(cliente["nome"], cliente["cnpj"], cliente["local"], cliente["servico"])

    # 3. Vinculando os Responsáveis
    empresas = listar_empresas()
    for emp in empresas:
        id_da_empresa = emp['id_cliente']
        nome_da_empresa = emp['nome_empresa']
        
        if nome_da_empresa == "FarmaVida":
            inserir_responsavel(id_da_empresa, "Raimundo Silva", "222.333.444-55", "Farmacêutico e Proprietário")
        elif nome_da_empresa == "APAE de Bacabal":
            inserir_responsavel(id_da_empresa, "Dona Neuza Bacabal", "111.222.333-44", "Coordenadora Geral")
        elif nome_da_empresa == "CuidaBem Home Care":
            inserir_responsavel(id_da_empresa, "Marcela Enfermagem", "888.777.666-55", "Enfermeira Fundadora / CEO")
        elif nome_da_empresa == "Clínica REABILITA":
            inserir_responsavel(id_da_empresa, "Dra. Fernanda Lemos", "999.000.111-22", "Diretora Clínica")
        elif nome_da_empresa == "CAPS II Renascer":
            inserir_responsavel(id_da_empresa, "Dr. Augusto Miranda", "777.888.999-00", "Psiquiatra / Diretor")
        elif nome_da_empresa == "Creche Sonho de Criança":
            inserir_responsavel(id_da_empresa, "Rosângela Souza", "666.555.444-33", "Diretora Escolar")
        elif nome_da_empresa == "Lar São Francisco":
            inserir_responsavel(id_da_empresa, "Conceição", "333.222.111-00", "Matriarca / Responsável Principal")
            inserir_responsavel(id_da_empresa, "Filha da Conceição", "444.555.666-77", "Co-Responsável Familiar")

    # Base Pronta! Empresas e Responsáveis configurados com sucesso

if __name__ == "__main__":
    executar_projeto()]


#PAGINA SEED 	


import uuid
from data_base import conexao_bd

def executar_carga_completa():
    print("Iniciando a Carga Operacional Completa (Full Seed)...")
    conn = conexao_bd()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT nome_empresa, id_cliente FROM empresa_cliente")
        empresas = {row['nome_empresa']: row['id_cliente'] for row in cursor.fetchall()}

        operacoes = [
            {
                "empresa": "FarmaVida", "modelo": "Gestão de Dispensação", "desc_modelo": "Controle SNGPC e Farmácia Popular", "valor": 45000.00,
                "paciente": "Dona Maria (Balcão)", "historico": "Programa Farmácia Popular. Losartana contínua.",
                "data_visita": "2026-05-09 08:30:00", "urgencia": "NORMAL", "feedback": "DISPENSAÇÃO: 1 caixa de Losartana."
            },
            {
                "empresa": "Clínica REABILITA", "modelo": "Gestão Híbrida", "desc_modelo": "Reabilitação Clínica Orientada a Metas", "valor": 35000.00,
                "paciente": "Sr. Ricardo (Pós-AVC)", "historico": "META: Recuperar marcha independente sem apoio.",
                "data_visita": "2026-05-09 09:00:00", "urgencia": "ALTO", "feedback": "SESSÃO: Cinesioterapia motora."
            },
            {
                "empresa": "Lar São Francisco", "modelo": "Plano Domiciliar Premium", "desc_modelo": "Visitas semanais e monitoramento 24h", "valor": 15000.00,
                "paciente": "Dona Francisca (Alzheimer)", "historico": "Grau 2. Necessita auxílio para locomoção.",
                "data_visita": "2026-05-10 10:15:00", "urgencia": "NORMAL", "feedback": "VISITA: Sinais vitais estáveis."
            },
            {
                "empresa": "Creche Sonho de Criança", "modelo": "Gestão Escolar e Conformidade", "desc_modelo": "Acompanhamento pedagógico e nutricional", "valor": 22000.00,
                "paciente": "Enzo Gabriel (Maternal II)", "historico": "Acompanhamento de curva de crescimento.",
                "data_visita": "2026-05-11 14:00:00", "urgencia": "NORMAL", "feedback": "AVALIAÇÃO: Peso e altura normais."
            },
            {
                "empresa": "CAPS II Renascer", "modelo": "Repasse SUS / Prefeitura", "desc_modelo": "Projeto Terapêutico Singular (PTS)", "valor": 55000.00,
                "paciente": "João Silva (Esquizofrenia)", "historico": "Uso de Haloperidol.",
                "data_visita": "2026-05-12 09:30:00", "urgencia": "MÉDIO", "feedback": "ATENDIMENTO: Renovação de receita."
            },
            {
                "empresa": "CuidaBem Home Care", "modelo": "Taxa de Plataforma VIP", "desc_modelo": "Marketplace de plantonistas e escalas", "valor": 12500.00,
                "paciente": "Sr. Antônio (Pós-operatório)", "historico": "Cirurgia de fêmur. Necessita plantonista.",
                "data_visita": "2026-05-13 20:00:00", "urgencia": "NORMAL", "feedback": "PLANTÃO: Início de turno."
            },
            {
                "empresa": "APAE de Bacabal", "modelo": "Convênio Estadual APAE", "desc_modelo": "Atendimento Multidisciplinar Integrado", "valor": 80000.00,
                "paciente": "Maria Clara (Síndrome de Down)", "historico": "Acompanhamento Fono/TO.",
                "data_visita": "2026-05-14 15:45:00", "urgencia": "NORMAL", "feedback": "SESSÃO: Excelente resposta aos estímulos."
            }
        ]

        print("-> Injetando dados nas 9 tabelas do sistema...")
        
        for op in operacoes:
            id_cliente = empresas.get(op["empresa"])
            if not id_cliente: continue

            # Gerando IDs de toda a estrutura
            id_mod, id_cont, id_pac, id_vis = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
            id_pag, id_ent, id_int = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())

            # Fases 1 a 4 (Que já tínhamos)
            cursor.execute('INSERT INTO modelo_contrato (id_modelo, nome_modelo, periodicidade_cobranca, descricao_padrao) VALUES (?, ?, ?, ?)', (id_mod, op["modelo"], 'Mensal', op["desc_modelo"]))
            cursor.execute('INSERT INTO contrato (id_contrato, id_cliente, id_modelo, valor_acordado, status_contrato, data_inicio) VALUES (?, ?, ?, ?, ?, ?)', (id_cont, id_cliente, id_mod, op["valor"], 'ATIVO', '2026-01-10'))
            cursor.execute('INSERT INTO paciente_beneficiario (id_paciente, id_cliente, nome, historico_cuidados) VALUES (?, ?, ?, ?)', (id_pac, id_cliente, op["paciente"], op["historico"]))
            cursor.execute('INSERT INTO visita_atendimento (id_visita, id_contrato, id_paciente, data_hora, grau_urgencia, feedback_anotacoes) VALUES (?, ?, ?, ?, ?, ?)', (id_vis, id_cont, id_pac, op["data_visita"], op["urgencia"], op["feedback"]))

            # --- AS 3 NOVAS FASES PARA COMPLETAR O SEU DIAGRAMA ---
            
            # Fase 5: Pagamento vinculado à Visita e ao Contrato
            cursor.execute('''INSERT INTO pagamento (id_pagamento, id_contrato, id_visita, data_pagamento, valor, forma_pagamento, status_pagamento) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                           (id_pag, id_cont, id_vis, op["data_visita"], (op["valor"]/12), 'PIX', 'PAGO'))
            
            # Fase 6: Entregas e Prazos do Contrato
            cursor.execute('''INSERT INTO entregas_prazos (id_entrega, id_contrato, descricao_entrega, data_prazo_limite, status_entrega) 
                              VALUES (?, ?, ?, ?, ?)''', 
                           (id_ent, id_cont, 'Relatório Mensal de Produtividade', '2026-05-30', 'PENDENTE'))
            
            # Fase 7: Histórico de Interação (Reuniões de alinhamento com a empresa)
            cursor.execute('''INSERT INTO historico_interacoes (id_interacao, id_cliente, tipo_interacao, data_hora, feedback_anotacoes) 
                              VALUES (?, ?, ?, ?, ?)''', 
                           (id_int, id_cliente, 'Reunião Presencial', '2026-05-01 10:00:00', 'Alinhamento mensal realizado com sucesso. Metas batidas.'))

        conn.commit()
        print("\n✅ BANCO 100% POPULADO! Todas as 9 tabelas agora possuem dados reais e conectados.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Falha na transação. Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    executar_carga_completa()
