import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertTriangle, Download, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface DashboardData {
  kpis: {
    kpi_saidas_op_valor: number;
    kpi_qtd_lanc: number;
    kpi_variacao_mom: number;
    kpi_ticket_medio: number;
    kpi_outros_pct: number;
  };
  chart_categorias: Array<{ categoria: string; valor: number; percentual: number }>;
  chart_metodos: Array<{ metodo: string; valor: number; percentual: number; ticket_medio: number }>;
  chart_semana: Array<{ semana: string; valor: number; media: number; desvio: number }>;
  chart_mom_waterfall: Array<{ categoria: string; valor: number; direcao: "up" | "down" }>;
  top_fornecedores: Array<{ fornecedor: string; categoria: string; valor: number; percentual: number; lancamentos: number }>;
  impostos: Array<{ data: string; descricao: string; valor: number; nivel: string }>;
  boletos: Array<{ data: string; favorecido: string; valor: number; categoria: string }>;
  pix_out: Array<{ contraparte: string; valor: number; lancamentos: number }>;
  outros: Array<{ data: string; historico: string; valor: number; favorecido: string }>;
  alertas: Array<{ tipo: string; mensagem: string; severidade: "info" | "warning" | "error" }>;
}

const CORES = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

export default function InsightsPage() {
  const [mesAlvo, setMesAlvo] = useState("");

  const { data: mesesDisp = [] } = useQuery({
    queryKey: ["/api/insights/meses"],
    queryFn: async () => {
      const res = await fetch("/api/insights/meses");
      const data = await res.json() as string[];
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/insights", mesAlvo],
    queryFn: async () => {
      if (!mesAlvo) return null;
      const res = await fetch(`/api/insights?mes=${mesAlvo}`);
      return (await res.json()) as DashboardData;
    },
    enabled: !!mesAlvo,
  });

  const exportarCSV = (dados: any[], nomeArquivo: string) => {
    if (dados.length === 0) return;
    const csv = [
      Object.keys(dados[0]).join(","),
      ...dados.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com navegação */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Dashboard de Gastos</h1>
              <p className="text-sm sm:text-base text-gray-600">Análise detalhada de despesas e insights</p>
            </div>
          </div>
        </div>

        {/* Seletor de Mês */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full sm:w-72">
              <Label htmlFor="mes" className="text-sm font-medium mb-2 block">
                Selecione o Mês
              </Label>
              <Select value={mesAlvo} onValueChange={setMesAlvo}>
                <SelectTrigger id="mes">
                  <SelectValue placeholder="Escolha um mês para visualizar..." />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {mesesDisp.length > 0 ? (
                    mesesDisp.map((mes) => (
                      <SelectItem key={mes} value={mes}>
                        {format(parse(mes, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: pt })}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="vazio" disabled>
                      Nenhum relatório salvo na aba Gastos
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {mesesDisp.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">⚠️ Processe e salve um relatório na aba "Gastos Clínica Basile" primeiro</p>
              )}
            </div>
          </CardContent>
        </Card>

        {mesesDisp.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhum relatório salvo</AlertTitle>
            <AlertDescription>
              Acesse a aba <strong>"Gastos Clínica Basile"</strong>, processe um arquivo e clique em "Salvar Relatório" para visualizar os dados aqui.
            </AlertDescription>
          </Alert>
        ) : !mesAlvo ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Selecione um período</AlertTitle>
            <AlertDescription>Escolha um mês acima para visualizar os dados do dashboard.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Saídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold truncate">
                    R$ {data.kpis.kpi_saidas_op_valor.toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Lançamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{data.kpis.kpi_qtd_lanc}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold truncate">
                    R$ {data.kpis.kpi_ticket_medio.toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>

              <Card className="hidden sm:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Variação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">
                    {(data.kpis.kpi_variacao_mom * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Outros %</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-lg sm:text-2xl font-bold ${
                      data.kpis.kpi_outros_pct > 5 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {data.kpis.kpi_outros_pct.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chart_categorias}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="categoria"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                        <Bar dataKey="valor" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Método Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.chart_metodos}
                          dataKey="valor"
                          nameKey="metodo"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                        >
                          {data.chart_metodos.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CORES[index % 8]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos Linha 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Despesas Semanais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.chart_semana}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                        <Line type="monotone" dataKey="valor" stroke="#3b82f6" name="Despesas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Variação por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chart_mom_waterfall}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                        <Bar dataKey="valor" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabelas - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Top Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.top_fornecedores.slice(0, 8).map((f, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium truncate">{f.fornecedor}</TableCell>
                            <TableCell className="text-right">R$ {f.valor.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right">{f.percentual.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Impostos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.impostos.slice(0, 5).map((imp, idx) => (
                      <div key={idx} className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 truncate">{imp.nivel}</span>
                        <span className="font-semibold">R$ {imp.valor.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabelas Linha 2 - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg">Boletos</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportarCSV(data.boletos, "boletos.csv")}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span className="text-xs sm:text-sm">Exportar</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Favorecido</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.boletos.slice(0, 5).map((b, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{b.data}</TableCell>
                            <TableCell className="font-medium truncate text-xs sm:text-sm">{b.favorecido}</TableCell>
                            <TableCell className="text-right text-xs">R$ {b.valor.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">PIX Enviado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contraparte</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pix_out.slice(0, 5).map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium truncate">{p.contraparte}</TableCell>
                            <TableCell className="text-right">R$ {p.valor.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Outros/Conferir */}
            {data.outros.length > 0 && (
              <Card className="mb-6">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg">Outras Despesas</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportarCSV(data.outros, "outros.csv")}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span className="text-xs sm:text-sm">Exportar CSV</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Histórico</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.outros.slice(0, 8).map((o, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{o.data}</TableCell>
                            <TableCell className="font-medium truncate text-xs">{o.historico}</TableCell>
                            <TableCell className="text-right">R$ {o.valor.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alertas */}
            {data.alertas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Alertas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.alertas.map((alerta, idx) => (
                      <Alert key={idx} variant={alerta.severidade === "error" ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-sm">{alerta.tipo}</AlertTitle>
                        <AlertDescription className="text-xs sm:text-sm">{alerta.mensagem}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
