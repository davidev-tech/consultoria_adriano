import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmpresas, useTodosContratos } from "@/lib/api/hooks";
import { Building2, FileText, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = {
  active: "oklch(0.72 0.15 160)",   // verde
  encerrado: "oklch(0.7 0.015 210)", // cinza
  pendente: "oklch(0.80 0.16 85)",   // amarelo
  arquivado: "oklch(0.62 0.22 25)",  // vermelho
};

export function DashboardExecutivo() {
  const { data: empresasData, isLoading: empresasLoading } = useEmpresas();
  const { data: todosContratos, isLoading: contratosLoading } = useTodosContratos();

  const empresas = (empresasData as any[]) || [];
  const totalEmpresas = empresas.length;

  const contratosAtivos = todosContratos?.filter(
    (c: any) => (c.status_contrato || "").toString().trim().toLowerCase() === "ativo"
  ) || [];

  const receitaTotal = contratosAtivos.reduce((acc, c) => acc + Number(c.valor_acordado || 0), 0);

  // Distribuição de status dos contratos
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    todosContratos?.forEach(c => {
      const status = (c.status_contrato || "Ativo").toString().trim();
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [todosContratos]);

  // Receita mensal (simulada a partir dos contratos ativos)
  const receitaMensal = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return meses.map(mes => ({
      mes,
      receita: contratosAtivos.reduce((acc, c) => acc + (Number(c.valor_acordado) || 0) / 12, 0),
    }));
  }, [contratosAtivos]);

  // Pendências
  const pendenciasFinanceiras = todosContratos?.flatMap(c => c.faturas?.filter((f: any) => f.status === "Pendente" || f.status === "Atrasado") || []).length || 0;
  const pendenciasEntregas = todosContratos?.flatMap(c => c.entregas?.filter((e: any) => e.status_entrega !== "Concluído") || []).length || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Empresas" value={totalEmpresas} icon={Building2} loading={empresasLoading} />
        <KpiCard title="Contratos Ativos" value={contratosAtivos.length} icon={FileText} loading={contratosLoading} />
        <KpiCard title="Receita (mês)" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitaTotal / 12)} icon={Wallet} loading={contratosLoading} />
        <KpiCard title="Pendências" value={pendenciasFinanceiras + pendenciasEntregas} icon={AlertTriangle} loading={contratosLoading} variant="warning" />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita Projetada (12 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 20%)" />
                <XAxis dataKey="mes" stroke="oklch(0.7 0.015 210)" />
                <YAxis stroke="oklch(0.7 0.015 210)" />
                <Tooltip />
                <Bar dataKey="receita" fill="oklch(0.72 0.15 160)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status dos Contratos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.keys(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, loading, variant = "default" }: any) {
  const bgColor = variant === "warning" ? "bg-yellow-500/10 text-yellow-600 ring-yellow-500/20" : "bg-primary/15 text-primary ring-primary/30";
  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">
              {loading ? "..." : value}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ring-1 ${bgColor}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}