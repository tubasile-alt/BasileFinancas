/**
 * Componentes de Gráficos Financeiros - Clínica Basile
 * 
 * Componentes para visualização de dados financeiros usando recharts:
 * - ExpenseCategoryChart: Gráfico pizza das categorias de despesas operacionais
 * - WeeklyCashFlowChart: Gráfico linha do fluxo de caixa semanal operacional
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ClassifiedTransaction, WeeklyCashFlow } from '@shared/schema';
import { formatCurrency } from '@/lib/export-utils';
import { generateCategoryReport } from '@/lib/report-generators';

// Props para o gráfico de categorias de despesas
interface ExpenseCategoryChartProps {
  transactions: ClassifiedTransaction[];
}

// Props para o gráfico de fluxo de caixa semanal
interface WeeklyCashFlowChartProps {
  weeklyCashFlow: WeeklyCashFlow[];
}

/**
 * Gráfico Pizza por Categoria de Despesas
 * 
 * Mostra percentuais por categoria de despesas operacionais.
 * Filtra apenas despesas operacionais (valor < 0 e ehOperacional = true).
 */
export function ExpenseCategoryChart({ transactions }: ExpenseCategoryChartProps) {
  // Gera relatório de categorias e filtra apenas despesas
  const categoryReport = generateCategoryReport(transactions);
  const expenseCategories = categoryReport.filter(category => category.valor < 0);

  // Converte valores negativos para positivos para o gráfico
  const chartData = expenseCategories.map(category => ({
    categoria: category.categoria,
    valor: Math.abs(category.valor), // Converte para positivo
    valorOriginal: category.valor, // Mantém valor original para tooltip
  }));

  // Cores padrão do recharts
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
    '#d084d0', '#87d068', '#ffc0cb', '#ffa500', '#dda0dd'
  ];

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.categoria}</p>
          <p className="text-sm text-muted-foreground">
            Valor: {formatCurrency(data.valorOriginal)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Renderizador customizado para labels da legenda
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-1 text-sm">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-muted/10 rounded-lg border border-border">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Nenhuma despesa operacional encontrada
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione transações com categorias de despesas para visualizar o gráfico
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
        Distribuição de Despesas por Categoria
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="valor"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico Linha do Fluxo de Caixa Semanal
 * 
 * Eixo X: semana ISO
 * Eixo Y: total semanal operacional
 * Mostra tendência do fluxo de caixa ao longo das semanas.
 */
export function WeeklyCashFlowChart({ weeklyCashFlow }: WeeklyCashFlowChartProps) {
  // Ordena dados por semana para garantir ordem cronológica
  const sortedData = [...weeklyCashFlow].sort((a, b) => a.semana - b.semana);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">Semana {label}</p>
          <p className="text-sm text-muted-foreground">
            Fluxo: {formatCurrency(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (sortedData.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-muted/10 rounded-lg border border-border">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum dado de fluxo semanal disponível
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione transações operacionais para visualizar o fluxo semanal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
        Fluxo de Caixa Semanal Operacional
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={sortedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="semana" 
            className="text-sm"
            label={{ value: 'Semana ISO', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            className="text-sm"
            tickFormatter={(value) => formatCurrency(value)}
            label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="valor" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}