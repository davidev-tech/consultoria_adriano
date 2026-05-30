import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Bell, Loader2, AlertTriangle, DollarSign, ClipboardList, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api/client";
import { useInteracoesPagas } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

interface Notificacao {
  id: string;
  tipo: "financeira" | "entrega" | "interacao";
  mensagem: string;
  data_limite?: string;
  valor?: number;
  rota: string;
}

function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca interações pagas com pagamento pendente (de todas as empresas)
  const { data: interacoesPagas } = useInteracoesPagas(undefined);

  useEffect(() => {
    async function fetchNotificacoes() {
      setLoading(true);
      try {
        // 1. Pendências financeiras e entregas (do endpoint /pendencias)
        const pendencias = await api<any[]>("/pendencias");
        const notifPendencias: Notificacao[] = pendencias.map((p: any) => ({
          id: p.id,
          tipo: p.tipo,
          mensagem: p.descricao,
          data_limite: p.data_limite,
          valor: p.valor,
          rota: p.tipo === "financeira" ? "/financeiro" : "/entregas_prazos",
        }));

        // 2. Interações pagas pendentes (pagamento ainda não realizado)
        const interacoesPendentes = (interacoesPagas || [])
          .filter((i: any) => i.status_pagamento === "Pendente")
          .slice(0, 5)
          .map((i: any) => ({
            id: i.id_interacao,
            tipo: "interacao" as const,
            mensagem: `Interação ${i.tipo_interacao?.toLowerCase() || "não especificada"} com valor pendente`,
            data_limite: i.data_hora,
            valor: i.valor_cobrado,
            rota: "/interacoes",
          }));

        // Junta e ordena por data (mais recentes primeiro)
        const todas = [...notifPendencias, ...interacoesPendentes]
          .sort((a, b) => new Date(b.data_limite || 0).getTime() - new Date(a.data_limite || 0).getTime())
          .slice(0, 10);

        setNotificacoes(todas);
      } catch (error) {
        console.error("Erro ao buscar notificações:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60000); // atualiza a cada 60s
    return () => clearInterval(interval);
  }, [interacoesPagas]);

  return { notificacoes, loading };
}

export function NotificacoesDropdown() {
  const { notificacoes, loading } = useNotificacoes();
  const [open, setOpen] = useState(false);
  const [visto, setVisto] = useState(false);

  // Ao abrir, marca como visto
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) setVisto(true);
  };

  const naoLidas = visto ? 0 : notificacoes.length;

  // Agrupamento
  const financeiras = notificacoes.filter((n) => n.tipo === "financeira");
  const entregas = notificacoes.filter((n) => n.tipo === "entrega");
  const interacoes = notificacoes.filter((n) => n.tipo === "interacao");

  const valorTotalFinanceiro = financeiras.reduce((acc, n) => acc + (n.valor || 0), 0);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 mr-4" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Central de Notificações</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </DropdownMenuLabel>
        
        {/* Resumo rápido */}
        {notificacoes.length > 0 && (
          <>
            <div className="px-2 py-2 grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center rounded-md bg-yellow-500/10 p-2">
                <DollarSign className="h-4 w-4 text-yellow-600 mb-1" />
                <span className="font-bold text-yellow-600">{financeiras.length}</span>
                <span className="text-muted-foreground">Financeiras</span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-red-500/10 p-2">
                <ClipboardList className="h-4 w-4 text-red-600 mb-1" />
                <span className="font-bold text-red-600">{entregas.length}</span>
                <span className="text-muted-foreground">Entregas</span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-blue-500/10 p-2">
                <MessageSquare className="h-4 w-4 text-blue-600 mb-1" />
                <span className="font-bold text-blue-600">{interacoes.length}</span>
                <span className="text-muted-foreground">Interações</span>
              </div>
            </div>
            {valorTotalFinanceiro > 0 && (
              <div className="px-2 pb-1">
                <p className="text-xs text-muted-foreground text-center">
                  Total pendente:{" "}
                  <span className="font-semibold text-yellow-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalFinanceiro)}
                  </span>
                </p>
              </div>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Lista de notificações */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && notificacoes.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>Nenhuma pendência recente</p>
            </div>
          ) : (
            notificacoes.map((n) => {
              const icone = n.tipo === "financeira" ? DollarSign : n.tipo === "entrega" ? ClipboardList : MessageSquare;
              const cor = n.tipo === "financeira" ? "text-yellow-600 bg-yellow-500/10" : n.tipo === "entrega" ? "text-red-600 bg-red-500/10" : "text-blue-600 bg-blue-500/10";
              
              return (
                <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3 cursor-pointer" asChild>
                  <Link to={n.rota} className="w-full">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cor)}>
                      {React.createElement(icone, { className: "h-4 w-4" })}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{n.mensagem}</p>
                      <div className="flex items-center gap-2">
                        {n.data_limite && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.data_limite).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {n.valor != null && n.valor > 0 && (
                          <span className="text-xs font-semibold text-yellow-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n.valor)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Link
            to="/pendencias"
            className="flex items-center justify-center gap-2 text-xs font-medium text-primary hover:underline w-full"
          >
            <ExternalLink className="h-3 w-3" />
            Ver todas as pendências
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}