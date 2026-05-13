export function SupabaseActivities() {
  // Componente desativado temporariamente para remover erros de conexão
  // Enquanto o back-end (FastAPI) assume a responsabilidade pelos dados.
  return (
    <section className="rounded-lg border border-border bg-card shadow-card p-8 flex flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Módulo de Atividades em manutenção. 
      </p>
      <p className="text-xs text-muted-foreground/60">
        Consulte as tabelas de Clientes e Contratos abaixo.
      </p>
    </section>
  );
}