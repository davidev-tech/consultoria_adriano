import React, { useEffect, useRef, useState } from "react";
import { BarChart3, ExternalLink } from "lucide-react";

const METABASE_INSTANCE_URL = "https://outpour-promoter-pessimism.ngrok-free.dev";
const METABASE_EMBED_SCRIPT = `${METABASE_INSTANCE_URL}/app/embed.js`;
const METABASE_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJyZXNvdXJjZSI6eyJxdWVzdGlvbiI6NTR9LCJwYXJhbXMiOnt9LCJpYXQiOjE3Nzg1NTQ1OTMsImV4cCI6MTc3ODU1NTE5MywiX2VtYmVkZGluZ19wYXJhbXMiOnt9fQ.AWr6f-Ki0VmVHJVEF1s4PtaIx9sARgJu03x0vOR8Jpc";

declare global {
  interface Window {
    metabaseConfig?: Record<string, unknown>;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "metabase-question": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          token?: string;
          "with-title"?: string;
          "with-downloads"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function MetabasePlaceholder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    window.metabaseConfig = {
      theme: { preset: "light" },
      isGuest: true,
      instanceUrl: METABASE_INSTANCE_URL,
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${METABASE_EMBED_SCRIPT}"]`,
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = METABASE_EMBED_SCRIPT;
    script.defer = true;
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
  }, []);

  return (
    <section className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Dashboard Metabase</h2>
          <p className="text-xs text-muted-foreground">
            BI integrado — KPIs, funis e cohorts em tempo real
          </p>
        </div>
        <a
          href={METABASE_INSTANCE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <ExternalLink className="h-3 w-3" /> Abrir Metabase
        </a>
      </div>

      <div ref={containerRef} className="min-h-[480px] w-full bg-white p-2">
        {scriptError ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/30">
              <BarChart3 className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="text-base font-semibold">Não foi possível carregar o Metabase</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Verifique se a instância está acessível em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{METABASE_INSTANCE_URL}</code>{" "}
              a partir do seu navegador.
            </p>
          </div>
        ) : (
          React.createElement("metabase-question", {
            token: METABASE_TOKEN,
            "with-title": "true",
            "with-downloads": "true",
          })
        )}
      </div>
    </section>
  );
}
