import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
} from "lucide-react";

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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
    (to: string) => {
      setOpen(false);
      navigate({ to });
    },
    [navigate]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou pesquise..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {pages.map((page) => (
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
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Pressione{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
          Ctrl+K
        </kbd>{" "}
        para abrir a qualquer momento
      </div>
    </CommandDialog>
  );
}