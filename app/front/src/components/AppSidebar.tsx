import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FileText,
  HeartPulse,
  ClipboardList,
  Wallet,
  Cog,
  Radar,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "Inteligência" },
  { title: "Empresas", url: "/empresas", icon: Building2, group: "Cadastros" },
  { title: "Contratos", url: "/contratos", icon: FileText, group: "Cadastros" },
  { title: "Interações", url: "/interacoes", icon: ClipboardList, group: "Operacional" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, group: "Financeiro" },
  { title: "Configurações", url: "/configuracoes", icon: Cog, group: "Sistema" },
];

const groups = ["Inteligência", "Cadastros", "Operacional", "Financeiro", "Sistema"] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]">
            <Radar className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Gestão do Cuidado</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Consultoria
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.16em]">
              {g}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items
                  .filter((i) => i.group === g)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
