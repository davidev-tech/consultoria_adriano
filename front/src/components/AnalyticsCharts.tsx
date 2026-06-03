import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { PieChartIcon } from "lucide-react"; // ou use outro ícone de sua preferência

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6384', '#36A2EB'];
const STATUS_COLORS: Record<string, string> = { Pago: '#22c55e', Pendente: '#f97316' };

// ✅ Tooltip genérico para barras, linhas, radar
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card text-card-foreground p-3 shadow-lg">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ✅ Tooltip específico para gráficos de pizza/rosca
export const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-border bg-card text-card-foreground p-3 shadow-lg">
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-xs">
          Valor: <strong>{data.value}</strong> ({((data.percent ?? 0) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

// ==================== SCORECARD ====================
export function ScoreCard({ title, value, subtitle }: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

// ==================== INTERAÇÕES POR EMPRESA (BARRA HORIZONTAL) ====================
export function InteracoesPorEmpresa({ data }: { data: { name: string; total: number }[] }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Distribuição por Empresa</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 35)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} width={110} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          <Bar dataKey="total" name="Total Interações" fill="#0088FE" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== STATUS PAGAMENTO (ROSQUINHA) ====================
export function StatusPagamentoRosca({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Status de Pagamento</h3>
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
          <PieChartIcon className="h-12 w-12 mb-2 opacity-30" />
          <p className="text-sm">Nenhum pagamento registrado.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
// ==================== BARRAS AGRUPADAS – VALORES FINANCEIROS ====================
export function FinanceiroBarras({ data }: { data: { status: string; soma: number; media: number }[] }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Distribuição Financeira</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="status" tick={{ fill: '#6b7280' }} />
          <YAxis yAxisId="left" orientation="left" stroke="#22c55e" tick={{ fill: '#6b7280' }} />
          <YAxis yAxisId="right" orientation="right" stroke="#a855f7" tick={{ fill: '#6b7280' }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          <Legend />
          <Bar yAxisId="left" dataKey="soma" name="Soma Valor" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="media" name="Média Valor" fill="#a855f7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
// Gráfico de Barras Verticais (Colunas) – Contagem de Contratos por Status
export function StatusContratoColumnChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Status de Contrato</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" tick={{ fill: '#6b7280' }} />
          <YAxis allowDecimals={false} tick={{ fill: '#6b7280' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Quantidade" fill="#0088FE" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Tabela Dinâmica (Pivot) simples
export function PivotTable({
  titulo,
  linhas,
  colunas,
  dados,
  renderNome,
}: {
  titulo: string;
  linhas: any[];
  colunas: string[];
  dados: Record<string, Record<string, number>>;
  renderNome: (item: any) => string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm overflow-x-auto">
      <h3 className="text-sm font-semibold mb-4 text-foreground">{titulo}</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2 font-medium">Nome</th>
            {colunas.map((col) => (
              <th key={col} className="text-center px-3 py-2 font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((item, idx) => {
            const nome = renderNome(item);
            return (
              <tr key={idx} className="border-b hover:bg-muted/20">
                <td className="px-3 py-2">{nome}</td>
                {colunas.map((col) => (
                  <td key={col} className="text-center px-3 py-2">
                    {dados[item.id]?.[col] || 0}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}