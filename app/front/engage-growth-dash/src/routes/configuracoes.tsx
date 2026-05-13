import { createFileRoute } from "@tanstack/react-router";
import { Cog, Server, Database, ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { API_BASE } from "@/lib/api/client";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Gestão do Cuidado" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // sistema
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Status das integrações.</p>
        </div>

        <div className="space-y-3">
          <Item icon={Server} title="API Backend" value={API_BASE} link={`${API_BASE}/docs`} />
          <Item icon={Database} title="Database" value="PostgreSQL (Supabase) via SQLAlchemy" />
          <Item icon={Cog} title="Stack" value="FastAPI · TanStack Start · React Query" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function Item({
  icon: Icon,
  title,
  value,
  link,
}: {
  icon: typeof Cog;
  title: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{value}</p>
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Abrir <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
