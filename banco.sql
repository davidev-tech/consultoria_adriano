CREATE TABLE IF NOT EXISTS "empresa_cliente" (
	"id_cliente" UUID NOT NULL UNIQUE,
	"nome_empresa" VARCHAR(255) NOT NULL,
	"cnpj" VARCHAR(255) NOT NULL UNIQUE,
	"localizacao" VARCHAR(255),
	"servico_prestado" VARCHAR(255),
	PRIMARY KEY("id_cliente")
);




CREATE TABLE IF NOT EXISTS "responsavel" (
	"id_responsavel" UUID NOT NULL UNIQUE,
	"id_cliente" UUID NOT NULL,
	"nome" VARCHAR(255) NOT NULL,
	"cpf" VARCHAR(255) NOT NULL UNIQUE,
	"email" VARCHAR(255) NOT NULL,
	"telefone" VARCHAR(255) NOT NULL,
	"cargo" VARCHAR(255),
	PRIMARY KEY("id_responsavel", "id_cliente")
);




CREATE TABLE IF NOT EXISTS "contrato" (
	"id_contrato" UUID NOT NULL UNIQUE,
	"id_cliente" UUID NOT NULL UNIQUE,
	"id_modelo" UUID NOT NULL UNIQUE,
	"valor_acordado" REAL NOT NULL,
	"status_contrato" VARCHAR(255) NOT NULL,
	"data_inicio" DATE NOT NULL,
	"data_fim" DATE NOT NULL,
	PRIMARY KEY("id_contrato", "id_cliente", "id_modelo")
);




CREATE TABLE IF NOT EXISTS "paciente_beneficiario" (
	"id_paciente" UUID NOT NULL UNIQUE,
	"id_cliente" UUID NOT NULL UNIQUE,
	"nome" VARCHAR(255) NOT NULL,
	"historico_cuidados" TEXT,
	PRIMARY KEY("id_paciente", "id_cliente")
);




CREATE TABLE IF NOT EXISTS "visita_atendimento" (
	"id_visita" UUID NOT NULL UNIQUE,
	"id_contrato" UUID NOT NULL UNIQUE,
	"id_paciente" UUID NOT NULL UNIQUE,
	"data_hora" TIMESTAMP NOT NULL,
	"grau_urgencia" VARCHAR(255),
	"coordenadas_geo" VARCHAR(255),
	"feedback_anotacoes" TEXT,
	PRIMARY KEY("id_visita", "id_contrato", "id_paciente")
);




CREATE TABLE IF NOT EXISTS "pagamento" (
	"id_pagamento" UUID NOT NULL UNIQUE,
	"id_contrato" UUID NOT NULL UNIQUE,
	"id_visita" UUID NOT NULL UNIQUE,
	"data_pagamento" DATE,
	"valor" REAL NOT NULL,
	"forma_pagamento" VARCHAR(255),
	"condicao_pagamento" VARCHAR(255),
	"status_pagamento" VARCHAR(255),
	PRIMARY KEY("id_pagamento", "id_contrato", "id_visita")
);




CREATE TABLE IF NOT EXISTS "modelo_contrato" (
	"id_modelo" UUID NOT NULL UNIQUE,
	"nome_modelo" VARCHAR(255) NOT NULL,
	"periodicidade_cobranca" VARCHAR(255) NOT NULL,
	"descricao_padrao" TEXT,
	PRIMARY KEY("id_modelo")
);




CREATE TABLE IF NOT EXISTS "entregas_prazos" (
	"id_entrega" UUID NOT NULL UNIQUE,
	"id_contrato" UUID NOT NULL UNIQUE,
	"descricao_entrega" VARCHAR(255) NOT NULL,
	"data_prazo_limite" DATE NOT NULL,
	"data_conclusao" DATE,
	"status_entrega" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id_entrega")
);




CREATE TABLE IF NOT EXISTS "historico_interacoes" (
	"id_interacao" UUID NOT NULL UNIQUE,
	"id_cliente" UUID NOT NULL UNIQUE,
	"tipo_interacao" VARCHAR(255) NOT NULL,
	"data_hora" TIMESTAMP NOT NULL,
	"coordenadas_geo" VARCHAR(255),
	"feedback_anotacoes" TEXT,
	PRIMARY KEY("id_interacao")
);



ALTER TABLE "responsavel"
ADD FOREIGN KEY("id_cliente") REFERENCES "empresa_cliente"("id_cliente")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "paciente_beneficiario"
ADD FOREIGN KEY("id_cliente") REFERENCES "empresa_cliente"("id_cliente")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "contrato"
ADD FOREIGN KEY("id_cliente") REFERENCES "empresa_cliente"("id_cliente")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "visita_atendimento"
ADD FOREIGN KEY("id_contrato") REFERENCES "contrato"("id_contrato")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "visita_atendimento"
ADD FOREIGN KEY("id_paciente") REFERENCES "paciente_beneficiario"("id_paciente")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "pagamento"
ADD FOREIGN KEY("id_contrato") REFERENCES "contrato"("id_contrato")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "pagamento"
ADD FOREIGN KEY("id_visita") REFERENCES "visita_atendimento"("id_visita")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "modelo_contrato"
ADD FOREIGN KEY("id_modelo") REFERENCES "contrato"("id_modelo")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "entregas_prazos"
ADD FOREIGN KEY("id_contrato") REFERENCES "contrato"("id_contrato")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "historico_interacoes"
ADD FOREIGN KEY("id_interacao") REFERENCES "empresa_cliente"("id_cliente")
ON UPDATE NO ACTION ON DELETE NO ACTION;
