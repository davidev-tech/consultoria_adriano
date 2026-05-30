import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmpresas, useTodosContratos } from "@/lib/api/hooks";
import { AlertTriangle, Calendar, Clock, MessageSquare, PackageCheck, DollarSign, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface AcaoSugerida {
  tipo: "sem_interacao" | "contrato_vencendo" | "fatura_atrasada" | "entrega_atrasada";
  titulo: string;
  descricao: string;
  empresaId: string;
  empresaNome: string;
  rota: string;
}

export function AcoesSugeridas() {
  const { data: empresas } = useEmpresas();
  const { data: contratos } = useTodosContratos();

  const acoes = useMemo(() => {
    const resultado: AcaoSugerida[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!empresas || !contratos) return resultado;

    // 1. Empresas sem interação há mais de 30 dias
    empresas.forEach((empresa: any) => {
      const interacoes = empresa.interacoes || [];
      const ordenadas = [...interacoes].sort(
        (a: any, b: any) => new Date(b.data_hora || 0).getTime() - new Date(a.data_hora || 0).getTime()
      );
      const ultimaInteracao = ordenadas[0];
      if (!ultimaInteracao) {
        resultado.push({
          tipo: "sem_interacao",
          titulo: "Sem interações registradas",
          descricao: "Nunca houve contato com este cliente.",
          empresaId: empresa.id_cliente,
          empresaNome: empresa.nome_empresa,
          rota: `/empresas/$id`,
        });
        return;
      }
      const dataUltima = new Date(ultimaInteracao.data_hora);
      const diffDias = Math.floor((hoje.getTime() - dataUltima.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias > 30) {
        resultado.push({
          tipo: "sem_interacao",
          titulo: "Sem interação há mais de 30 dias",
          descricao: `Último contato em ${dataUltima.toLocaleDateString("pt-BR")} (${diffDias} dias).`,
          empresaId: empresa.id_cliente,
          empresaNome: empresa.nome_empresa,
          rota: `/empresas/$id`,
        });
      }
    });

    // 2. Contratos vencendo nos próximos 15 dias
    // 3. Faturas atrasadas há mais de 7 dias
    // 4. Entregas com prazo estourado
    contratos.forEach((contrato: any) => {
      const empresa = empresas.find((e: any) => e.id_cliente === contrato.id_cliente);
      const nomeEmpresa = empresa?.nome_empresa || "Empresa desconhecida";

      // Contratos vencendo
      if (contrato.data_fim) {
        const dataFim = new Date(contrato.data_fim + "T00:00:00");
        const diffDias = Math.floor((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias >= 0 && diffDias <= 15) {
          resultado.push({
            tipo: "contrato_vencendo",
            titulo: "Contrato próximo do vencimento",
            descricao: `Vence em ${diffDias} dias (${dataFim.toLocaleDateString("pt-BR")}).`,
            empresaId: contrato.id_cliente,
            empresaNome: nomeEmpresa,
            rota: "/financeiro",
          });
        }
      }

      // Faturas atrasadas há mais de 7 dias
      const faturas = contrato.faturas || [];
      faturas.forEach((fatura: any) => {
        if (fatura.status === "Atrasado" || fatura.status === "Pendente") {
          const dataVenc = new Date(fatura.data_vencimento + "T00:00:00");
          const diffDias = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias > 7) {
            resultado.push({
              tipo: "fatura_atrasada",
              titulo: "Fatura atrasada",
              descricao: `Venceu em ${dataVenc.toLocaleDateString("pt-BR")} (${diffDias} dias de atraso).`,
              empresaId: contrato.id_cliente,
              empresaNome: nomeEmpresa,
              rota: "/financeiro",
            });
          }
        }
      });

      // Entregas com prazo estourado
      const entregas = contrato.entregas || [];
      entregas.forEach((entrega: any) => {
        if (entrega.status_entrega && entrega.status_entrega.toLowerCase() !== "concluído") {
          const dataLimite = new Date(entrega.data_prazo_limite + "T00:00:00");
          if (dataLimite < hoje) {
            resultado.push({
              tipo: "entrega_atrasada",
              titulo: "Entrega atrasada",
              descricao: entrega.descricao_entrega,
              empresaId: contrato.id_cliente,
              empresaNome: nomeEmpresa,
              rota: "/entregas_prazos",
            });
          }
        }
      });
    });

    // Deduplicar por empresa+tipo (mostrar apenas 1 por tipo por empresa)
    const seen = new Set<string>();
    return resultado.filter((a) => {
      const key = `${a.empresaId}-${a.tipo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [empresas, contratos]);

  if (acoes.length === 0) return null;

  const iconeMap = {
    sem_interacao: MessageSquare,
    contrato_vencendo: Calendar,
    fatura_atrasada: DollarSign,
    entrega_atrasada: PackageCheck,
  };

  const corMap = {
    sem_interacao: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    contrato_vencendo: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    fatura_atrasada: "bg-red-500/10 text-red-400 ring-red-500/20",
    entrega_atrasada: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  };

  return (
    <section className="rounded-lg border border-border bg-card shadow-card overflow-hidden w-full mt-2">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Pontos de Atenção</h2>
          <p className="text-xs text-muted-foreground">
            {acoes.length} situação(ões) que precisam da sua atenção.
          </p>
        </div>
        <Link to="/pendencias">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-3 w-3" />
            Ver todas
          </Button>
        </Link>
      </div>
      <div className="p-4 grid gap-3 md:grid-cols-2">
        {acoes.slice(0, 4).map((acao, idx) => {
          const Icone = iconeMap[acao.tipo];
          return (
            <Link
              key={idx}
              to={acao.rota.startsWith("/empresas/") ? `/empresas/$id` : acao.rota}
              params={acao.rota.startsWith("/empresas/") ? { id: acao.empresaId } : undefined}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${corMap[acao.tipo]}`}>
                <Icone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">{acao.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <strong>{acao.empresaNome}</strong> · {acao.descricao}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}