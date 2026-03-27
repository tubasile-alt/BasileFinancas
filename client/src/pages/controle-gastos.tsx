import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { MainNavigation } from '@/components/main-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

type CategoryTotals = Record<string, number>;

interface MonthSnapshot {
  key: string;
  label: string;
  totalExpenses: number;
  totalIncome: number;
  categories: CategoryTotals;
}

interface ControleGastosPayload {
  version: number;
  sourceFile: string;
  processedAt: string;
  totals: {
    transactions: number;
    expenseTransactions: number;
    incomeTransactions: number;
  };
  months: MonthSnapshot[];
}

const STORAGE_KEY = 'basile:controle-gastos:v1';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#84cc16', '#ef4444', '#d946ef', '#22d3ee', '#a78bfa', '#f472b6'];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function readPayload(): ControleGastosPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.months)) return null;
    return parsed as ControleGastosPayload;
  } catch {
    return null;
  }
}

export default function ControleGastosPage() {
  const [payload, setPayload] = useState<ControleGastosPayload | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  useEffect(() => {
    const refresh = () => {
      const data = readPayload();
      setPayload(data);
      if (data?.months?.length) {
        setSelectedMonthKey((prev) => prev || data.months[data.months.length - 1].key);
      }
    };

    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const sortedMonths = useMemo(() => {
    if (!payload) return [];
    return [...payload.months].sort((a, b) => a.key.localeCompare(b.key));
  }, [payload]);

  const selectedMonth = useMemo(
    () => sortedMonths.find((m) => m.key === selectedMonthKey) || sortedMonths[sortedMonths.length - 1],
    [sortedMonths, selectedMonthKey],
  );

  const previousMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const idx = sortedMonths.findIndex((m) => m.key === selectedMonth.key);
    return idx > 0 ? sortedMonths[idx - 1] : null;
  }, [sortedMonths, selectedMonth]);

  const categoryRows = useMemo(() => {
    if (!selectedMonth) return [];
    const entries = Object.entries(selectedMonth.categories || {});
    return entries
      .map(([category, amount]) => {
        const prev = previousMonth?.categories?.[category] || 0;
        const delta = prev > 0 ? ((amount - prev) / prev) * 100 : null;
        return { category, amount, prev, delta };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [selectedMonth, previousMonth]);

  const chartData = useMemo(
    () => categoryRows.slice(0, 8).map((row) => ({ name: row.category, value: row.amount })),
    [categoryRows],
  );

  const monthTotalsData = useMemo(
    () => sortedMonths.map((m) => ({ mes: m.label, despesas: m.totalExpenses, entradas: m.totalIncome })),
    [sortedMonths],
  );

  const currentTotal = selectedMonth?.totalExpenses || 0;
  const previousTotal = previousMonth?.totalExpenses || 0;
  const totalDelta = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const topCategory = categoryRows[0];
  const alerts = categoryRows.filter((row) => row.delta !== null && row.delta > 15).length;

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Controle de Gastos</h1>
            <p className="text-sm text-muted-foreground">Dashboard alimentado automaticamente pelos dados processados na aba Extrato.</p>
          </div>
          <Button asChild>
            <Link href="/extrato">Ir para Extrato</Link>
          </Button>
        </div>

        {!payload || sortedMonths.length === 0 ? (
          <Alert>
            <AlertDescription>
              Nenhum dado encontrado. Faça o upload e processamento na aba <strong>Extrato</strong> para popular este dashboard.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  {sortedMonths.map((month) => (
                    <Button
                      key={month.key}
                      size="sm"
                      variant={month.key === selectedMonth?.key ? 'default' : 'outline'}
                      onClick={() => setSelectedMonthKey(month.key)}
                    >
                      {month.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Extrato: <strong>{payload.sourceFile}</strong> · Processado em{' '}
                  <strong>{new Date(payload.processedAt).toLocaleString('pt-BR')}</strong>
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total de Saídas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(currentTotal)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Variação vs mês anterior</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalDelta === null ? '—' : `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(1)}%`}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Maior categoria</CardTitle></CardHeader><CardContent><p className="text-lg font-semibold">{topCategory?.category || '—'}</p><p className="text-sm text-muted-foreground">{topCategory ? formatCurrency(topCategory.amount) : '—'}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Alertas ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{alerts}</p><p className="text-sm text-muted-foreground">Categorias com alta {'>'} 15%</p></CardContent></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Distribuição por categoria (Top 8)</CardTitle></CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={110}>
                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Evolução mensal (Entradas x Saídas)</CardTitle></CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthTotalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={(v) => `R$ ${(Number(v) / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                      <Bar dataKey="despesas" fill="#ef4444" />
                      <Bar dataKey="entradas" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Radar de Gargalos por Categoria</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Mês Atual</TableHead>
                      <TableHead className="text-right">Mês Anterior</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRows.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.prev)}</TableCell>
                        <TableCell className="text-right">{row.delta === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}%`}</TableCell>
                        <TableCell className="text-right">
                          {row.delta === null ? (
                            <Badge variant="secondary">Sem base</Badge>
                          ) : row.delta > 15 ? (
                            <Badge variant="destructive">Crítico</Badge>
                          ) : row.delta > 0 ? (
                            <Badge> Atenção </Badge>
                          ) : (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
