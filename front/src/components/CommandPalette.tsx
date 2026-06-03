import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FileText,
  ClipboardList,
  Wallet,
  CalendarDays,
  AlertTriangle,
  Users,
  Plus,
  Search,
} from "lucide-react";
import { useEmpresas } from "@/lib/api/hooks";

const pages = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Empresas", to: "/empresas", icon: Building2 },
  { name: "Contratos", to: "/contratos", icon: FileText },
  { name: "Interações", to: "/interacoes", icon: ClipboardList },
  { name: "Financeiro", to: "/financeiro", icon: Wallet },
  { name: "Entregas e Prazos", to: "/entregas_prazos", icon: CalendarDays },
  { name: "Pendências", to: "/pendencias", icon: AlertTriangle },
  { name: "Responsáveis", to: "/responsaveis", icon: Users },
];

const acoes = [
  { name: "Nova Empresa", to: "/empresas", icon: Plus, action: "new-empresa" },
  { name: "Nova Interação", to: "/interacoes", icon: ClipboardList },
  { name: "Novo Contrato", to: "/contratos", icon: FileText },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: empresasData } = useEmpresas();
  const empresas = (empresasData as any[]) || [];

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const runCommand = useCallback(
    (to: string, params?: Record<string, string>) => {
      setOpen(false);
      navigate({ to, params });
    },
    [navigate]
  );

  // Filtrar páginas
  const paginasFiltradas = useMemo(() => {
    if (!query) return pages;
    const q = query.toLowerCase();
    return pages.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  // Filtrar empresas (até 5)
  const empresasFiltradas = useMemo(() => {
    if (!query || !empresas.length) return [];
    const q = query.toLowerCase();
    return empresas
      .filter((e) => e.nome_empresa?.toLowerCase().includes(q) || e.cnpj?.includes(q))
      .slice(0, 5);
  }, [query, empresas]);

  // Filtrar ações
  const acoesFiltradas = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return acoes.filter((a) => a.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="O que você precisa encontrar?"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {paginasFiltradas.length > 0 && (
          <CommandGroup heading="Páginas">
            {paginasFiltradas.map((page) => (
              <CommandItem
                key={page.to}
                value={page.name}
                onSelect={() => runCommand(page.to)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <page.icon className="h-4 w-4 text-muted-foreground" />
                <span>{page.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {empresasFiltradas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Empresas">
              {empresasFiltradas.map((empresa) => (
                <CommandItem
                  key={empresa.id_cliente}
                  value={`emp-${empresa.nome_empresa}`}
                  onSelect={() => runCommand("/empresas/$id", { id: empresa.id_cliente })}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{empresa.nome_empresa}</span>
                  <span className="text-xs text-muted-foreground">{empresa.cnpj || "Sem CNPJ"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {acoesFiltradas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ações">
              {acoesFiltradas.map((acao) => (
                <CommandItem
                  key={acao.name}
                  value={acao.name}
                  onSelect={() => runCommand(acao.to)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <acao.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{acao.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          Pressione{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
            Ctrl+K
          </kbd>{" "}
          para abrir
        </span>
        <span>Navegue com ↑↓ e Enter</span>
      </div>
    </CommandDialog>
  );
}