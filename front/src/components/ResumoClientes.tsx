import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  PackageCheck,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import {
  useContratosMulti,
  useEntregasMulti,
  useInteracoesMulti,
} from "@/lib/api/hooks";
import { useSearch } from "@/hooks/useSearch"; // 1. Importamos a busca global
import type { Empresa, Entrega, HistoricoInteracao } from "@/lib/api/types";

interface Props {
  empresas: Empresa[];
  isLoading?: boolean;
  limit?: number;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const relativeDays = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

export function ResumoClientes({ empresas, isLoading, limit = 6 }: Props) {
  // 2. Conectamos com o que o usuário digita no Header
  const { searchTerm } = useSearch();

  // 3. Filtramos a lista de empresas ANTES de mostrar na tela
  const empresasFiltradas = useMemo(() => {
    if (!searchTerm) return empresas;
    return empresas.filter(e => 
      e.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.cnpj && e.cnpj.includes(searchTerm))
    );
  }, [empresas, searchTerm]);

  // 4. Agora usamos a lista filtrada para definir quem aparece
  const visibles = empresasFiltradas.slice(0, limit);
  const ids = visibles.map((e) => e.id_cliente);

  const interacoesQ = useInteracoesMulti(ids);
  const contratosQ = useContratosMulti(ids);

  const contratoIds = useMemo(
    () =>
      contratosQ
        .flatMap((q) => q.data ?? [])
        .map((c) => c.id_contrato),
    [contratosQ],
  );
  const entregasQ = useEntregasMulti(contratoIds);

  const entregasByContrato = useMemo(() => {
    const map = new Map<string, Entrega[]>();
    contratoIds.forEach((id, i) => {
      map.set(id, entregasQ[i]?.data ?? []);
    });
    return map;
  }, [contratoIds, entregasQ]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // relacionamento
          </span>
          <h2 className="text-lg font-semibold tracking-tight">Resumo de Clientes</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe visitas, entregas e pendências em aberto.
          </p>
        </div>
        {empresasFiltradas.length > limit && (
          <span className="text-xs text-muted-foreground">
            mostrando {limit} de {empresasFiltradas.length}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg border border-border bg-card/50"
            />
          ))}

        {visibles.map((empresa, i) => {
          const interacoes = (interacoesQ[i]?.data ?? []) as HistoricoInteracao[];
          const contratos = contratosQ[i]?.data ?? [];

          const visitas = interacoes
            .filter((it) => (it.tipo_interacao ?? "").toLowerCase().includes("visita"))
            .sort((a, b) => (b.data_hora ?? "").localeCompare(a.data_hora ?? ""));
          const ultimaVisita = visitas[0];

          const contatosFiltrados = interacoes
            .filter(
              (it) =>
                !!it.feedback_anotacoes ||
                !(it.tipo_interacao ?? "").toLowerCase().includes("visita"),
            )
            .sort((a, b) => (b.data_hora ?? "").localeCompare(a.data_hora ?? ""));
          const ultimoContato = contatosFiltrados[0] ?? interacoes[0];

          const entregas = contratos.flatMap(
            (c) => entregasByContrato.get(c.id_contrato) ?? [],
          );
          const hoje = new Date().toISOString().slice(0, 10);
          const proxima = entregas
            .filter((e) => !e.data_conclusao && e.data_prazo_limite >= hoje)
            .sort((a, b) => a.data_prazo_limite.localeCompare(b.data_prazo_limite))[0];
          
          const pendencias = entregas.filter(
            (e) => !e.data_conclusao && (e.status_entrega ?? "").toLowerCase() !== "concluído",
          ).length;
          
          const atrasadas = entregas.filter(
            (e) => !e.data_conclusao && e.data_prazo_limite < hoje,
          ).length;

          const proxDias = relativeDays(proxima?.data_prazo_limite);

          return (
            <Link
              key={empresa.id_cliente}
              to="/empresas/$id"
              params={{ id: empresa.id_cliente }}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-all hover:border-primary/50 hover:shadow-[0_0_24px_-12px_var(--primary)]"
            >
              <header className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
                    {empresa.nome_empresa}
                  </h3>
                  <p className="truncate text-[11px] font-mono text-muted-foreground">
  {/* ✅ CORRIGIDO: usar campos que existem */}
  {empresa.localizacao_cidade 
    ? `${empresa.localizacao_cidade}${empresa.localizacao_estado ? `/${empresa.localizacao_estado}` : ''}`
    : empresa.servicos_contratados?.[0]?.tipo_servico || "—"}
</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </header>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat icon={CalendarCheck} label="Última visita" value={fmtDate(ultimaVisita?.data_hora)} />
                <Stat 
                   icon={PackageCheck} 
                   label="Próxima entrega" 
                   value={proxima ? `${fmtDate(proxima.data_prazo_limite)}${proxDias !== null && proxDias <= 7 ? ` · ${proxDias}d` : ""}` : "—"}
                   highlight={proxDias !== null && proxDias <= 3}
                />
                <Stat 
                   icon={AlertTriangle} 
                   label="Pendências" 
                   value={pendencias ? `${pendencias}${atrasadas ? ` (${atrasadas} atrasada${atrasadas > 1 ? "s" : ""})` : ""}` : "0"}
                   warning={atrasadas > 0}
                />
                <Stat 
                   icon={MessageSquare} 
                   label="Último contato" 
                   value={ultimoContato ? `${fmtDate(ultimoContato.data_hora)}${ultimoContato.tipo_interacao ? ` · ${ultimoContato.tipo_interacao}` : ""}` : "—"}
                />
              </div>

              {ultimoContato?.feedback_anotacoes && (
                <p className="line-clamp-2 rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] italic text-muted-foreground">
                  "{ultimoContato.feedback_anotacoes}"
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Componente auxiliar Stat (mantido igual)
function Stat({ icon: Icon, label, value, highlight, warning }: any) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2">
      <Icon className={warning ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" : highlight ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" : "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={warning ? "truncate text-xs font-medium text-destructive" : highlight ? "truncate text-xs font-medium text-primary" : "truncate text-xs font-medium text-foreground"}>{value}</p>
      </div>
    </div>
  );
}