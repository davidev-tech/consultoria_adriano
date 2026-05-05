CREATE TABLE IF NOT EXISTS "clientes" (
	"id_responsavel" UUID NOT NULL UNIQUE,
	"nome" VARCHAR(255) NOT NULL,
	"cpf" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id_responsavel")
);




CREATE TABLE IF NOT EXISTS "contratos" (
	"id_contrato" UUID NOT NULL UNIQUE,
	"forma_pagamento" VARCHAR(255) NOT NULL,
	"id_empresa" UUID NOT NULL UNIQUE,
	"valor_acordado" DECIMAL NOT NULL,
	"status_contrato" VARCHAR(255) NOT NULL,
	"id_modelo" UUID NOT NULL UNIQUE,
	"data_inicio" DATE NOT NULL,
	PRIMARY KEY("id_contrato")
);




CREATE TABLE IF NOT EXISTS "empresas" (
	"id_empresa" UUID NOT NULL UNIQUE,
	"nome" VARCHAR(255) NOT NULL,
	"cnpj" VARCHAR(255) NOT NULL,
	"localizacao" VARCHAR(255) NOT NULL,
	"servico_prestado" VARCHAR(255) NOT NULL,
	"id_responsavel" UUID NOT NULL UNIQUE,
	PRIMARY KEY("id_empresa")
);




CREATE TABLE IF NOT EXISTS "historico_visitas" (
	"id_visita" UUID NOT NULL UNIQUE,
	"anotacoes" TEXT NOT NULL,
	"data" DATE NOT NULL,
	"id_agenda" UUID NOT NULL UNIQUE,
	PRIMARY KEY("id_visita")
);




CREATE TABLE IF NOT EXISTS "agenda" (
	"id_agenda" UUID NOT NULL UNIQUE,
	"data" DATE NOT NULL,
	"id_empresa" UUID NOT NULL UNIQUE,
	"grau_urgencia" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id_agenda")
);




CREATE TABLE IF NOT EXISTS "contatos" (
	"id_contato" UUID NOT NULL UNIQUE,
	"id_empresa" UUID NOT NULL UNIQUE,
	"id_responsavel" UUID NOT NULL UNIQUE,
	"contato" VARCHAR(255) NOT NULL UNIQUE,
	"tipo_contato" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id_contato")
);




CREATE TABLE IF NOT EXISTS "modelo_contrato" (
	"id_modelo" UUID NOT NULL UNIQUE,
	"nome_modelo" VARCHAR(255) NOT NULL,
	"periodicidade" VARCHAR(255) NOT NULL,
	"descricao_padrao" TEXT NOT NULL,
	PRIMARY KEY("id_modelo")
);




CREATE TABLE IF NOT EXISTS "pagamentos" (
	"id_pagamento" UUID NOT NULL UNIQUE,
	"id_contrato" UUID NOT NULL UNIQUE,
	"valor_previsto" NUMERIC NOT NULL UNIQUE,
	"valor_pago" NUMERIC NOT NULL,
	"data_vencimento" DATE NOT NULL,
	"data_pagamento" DATE,
	"status" VARCHAR(255) NOT NULL,
	PRIMARY KEY("id_pagamento")
);



ALTER TABLE "clientes"
ADD FOREIGN KEY("id_responsavel") REFERENCES "empresas"("id_responsavel")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "clientes"
ADD FOREIGN KEY("id_responsavel") REFERENCES "contatos"("id_responsavel")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "empresas"
ADD FOREIGN KEY("id_empresa") REFERENCES "contatos"("id_empresa")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "empresas"
ADD FOREIGN KEY("id_empresa") REFERENCES "contratos"("id_empresa")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "contratos"
ADD FOREIGN KEY("id_contrato") REFERENCES "pagamentos"("id_contrato")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "empresas"
ADD FOREIGN KEY("id_empresa") REFERENCES "agenda"("id_empresa")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "agenda"
ADD FOREIGN KEY("id_agenda") REFERENCES "historico_visitas"("id_agenda")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "modelo_contrato"
ADD FOREIGN KEY("id_modelo") REFERENCES "contratos"("id_modelo")
ON UPDATE NO ACTION ON DELETE NO ACTION;
