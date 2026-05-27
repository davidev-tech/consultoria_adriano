import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Empresa } from "@/lib/api/types";

export function ActivityTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["empresas-recentes"],
    queryFn: () => api<Empresa[]>("/empresas"),
  });

  const items = (data ?? []).slice(0, 8);

  return (
    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Empresas Recentes</h2>
          <p className="text-xs text-muted-foreground">Últimos clientes cadastrados na base</p>
        </div>
        <Link
          to="/empresas"
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          Ver todas →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Serviço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {error && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-destructive">
                  Erro ao carregar empresas.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Nenhuma empresa cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {items.map((e) => (
              <TableRow key={e.id_cliente} className="border-border">
                <TableCell>
                  <Link
                    to="/empresas/$id"
                    params={{ id: e.id_cliente }}
                    className="flex items-center gap-3 hover:text-primary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{e.nome_empresa}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {e.cnpj ?? "—"}
                </TableCell>
                
                {/* ✅ COLUNA DE LOCALIZAÇÃO CORRIGIDA */}
                <TableCell className="text-muted-foreground">
                  {formatarLocalizacao(e)}
                </TableCell>
                
                {/* ✅ COLUNA DE SERVIÇO CORRIGIDA */}
                <TableCell className="text-muted-foreground">
                  {formatarServicos(e)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// ✅ FUNÇÕES AUXILIARES PARA FORMATAÇÃO

/**
 * Formata a localização da empresa (Cidade/UF)
 */
function formatarLocalizacao(empresa: Empresa): string {
  const partes: string[] = [];
  
  if (empresa.localizacao_cidade) {
    partes.push(empresa.localizacao_cidade);
  }
  
  if (empresa.localizacao_estado) {
    // Se tem cidade, formata como "Cidade/UF"
    if (partes.length > 0) {
      partes[0] = `${partes[0]}/${empresa.localizacao_estado}`;
    } else {
      partes.push(empresa.localizacao_estado);
    }
  }
  
  if (empresa.localizacao_bairro && partes.length === 0) {
    partes.push(empresa.localizacao_bairro);
  }
  
  return partes.length > 0 ? partes.join(' - ') : "—";
}

/**
 * Formata a lista de serviços contratados
 */
function formatarServicos(empresa: any): string {
  // Tenta obter serviços do array servicos_contratados
  if (empresa.servicos_contratados && Array.isArray(empresa.servicos_contratados) && empresa.servicos_contratados.length > 0) {
    return empresa.servicos_contratados
      .map((s: any) => s.tipo_servico)
      .filter(Boolean)
      .join(", ");
  }
  
  // Fallback: tenta obter de contratos (se disponível)
  if (empresa.contratos && Array.isArray(empresa.contratos) && empresa.contratos.length > 0) {
    const servicos = empresa.contratos
      .map((c: any) => c.modelo_nome || c.nome_servico || c.tipo_servico)
      .filter(Boolean);
    
    // Remove duplicados
    const servicosUnicos = [...new Set(servicos)];
    return servicosUnicos.length > 0 ? servicosUnicos.join(", ") : "—";
  }
  
  return "—";
}