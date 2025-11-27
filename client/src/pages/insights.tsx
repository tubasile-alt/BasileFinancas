import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, parse } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, Download } from "lucide-react";

interface DashboardData {
  kpis: {
    kpi_saidas_op_valor: number;
    kpi_qtd_lanc: number;
    kpi_variacao_mom: number;
    kpi_ticket_medio: number;
    kpi_outros_pct: number;
  };
  chart_categorias: Array<{
    categoria: string;
    valor: number;
    percentual: number;
  }>;
  chart_metodos: Array<{
    metodo: string;
    valor: number;
    percentual: number;
    ticket_medio: number;
  }>;
  chart_semana: Array<{
    semana: string;
    valor: number;
    media: number;
    desvio: number;
  }>;
  chart_mom_waterfall: Array<{
    categoria: string;
    valor: number;
    direcao: "up" | "down";
  }>;
  top_fornecedores: Array<{
    fornecedor: string;
    categoria: string;
    valor: number;
    percentual: number;
    lancamentos: number;
  }>;
  impostos: Array<{
    data: string;
    descricao: string;
    valor: number;
    nivel: string;
  }>;
  boletos: Array<{
    data: string;
    favorecido: string;
    valor: number;
    categoria: string;
  }>;
  pix_out: Array<{
    contraparte: string;
    valor: number;
    lancamentos: number;
  }>;
  outros: Array<{
    data: string;
    historico: string;
    valor: number;
    favorecido: string;
  }>;
  alertas: Array<{
    tipo: string;
    mensagem: string;
    severidade: "info" | "warning" | "error";
  }>;
}

const CORES = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
];

export default function InsightsPage() {
  const [mesAlvo, setMesAlvo] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([]);
  const [fornecedorBusca, setFornecedorBusca] = useState("");
  const [metodosFiltro, setMetodosFiltro] = useState<string[]>([]);
  const [escopo, setEscopo] = useState<"operacional" | "total">("operacional");

  // Buscar dados do dashboard
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "/api/insights",
      mesAlvo,
      categoriasFiltro,
      fornecedorBusca,
      metodosFiltro,
      escopo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        mes: mesAlvo,
        categorias: categoriasFiltro.join(","),
        fornecedor: fornecedorBusca,
        metodos: metodosFiltro.join(","),
        escopo,
      });
      const res = await fetch(`/api/insights?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return (await res.json()) as DashboardData;
    },
  });

  // Buscar meses disponíveis
  const { data: mesesDisp } = useQuery({
    queryKey: ["/api/insights/meses"],
    queryFn: async () => {
      const res = await fetch("/api/insights/meses");
      if (!res.ok) throw new Error("Failed to fetch months");
      return (await res.json()) as string[];
    },
  });

  const toggleCategoria = (cat: string) => {
    setCategoriasFiltro((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleMetodo = (met: string) => {
    setMetodosFiltro((prev) =>
      prev.includes(met) ? prev.filter((m) => m !== met) : [...prev, met]
    );
  };

  const exportarCSV = (dados: any[], nomeArquivo: string) => {
    const csv = [
      Object.keys(dados[0] || {}).join(","),
      ...dados.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando insights...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os dados do dashboard. Por favor, tente
            novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard de Gastos
          </h1>
          <p className="text-gray-600">
            Análise detalhada de despesas e insights financeiros
          </p>
        </div>

        {/* Filtros Globais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Mês/Ano */}
              <div>
                <Label htmlFor="mes" className="text-sm font-medium mb-2">
                  Mês/Ano
                </Label>
                <Select value={mesAlvo} onValueChange={setMesAlvo}>
                  <SelectTrigger id="mes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesDisp?.map((mes) => (
                      <SelectItem key={mes} value={mes}>
                        {format(parse(mes, "yyyy-MM", new Date()), "MMMM yyyy", {
                          locale: pt,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Escopo */}
              <div>
                <Label className="text-sm font-medium mb-2">Escopo</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={escopo === "operacional"}
                      onCheckedChange={() => setEscopo("operacional")}
                    />
                    <span className="text-sm">Operacional</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={escopo === "total"}
                      onCheckedChange={() => setEscopo("total")}
                    />
                    <span className="text-sm">Total</span>
                  </label>
                </div>
              </div>

              {/* Fornecedor */}
              <div>
                <Label htmlFor="fornecedor" className="text-sm font-medium mb-2">
                  Fornecedor
                </Label>
                <Input
                  id="fornecedor"
                  placeholder="Buscar..."
                  value={fornecedorBusca}
                  onChange={(e) => setFornecedorBusca(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Métodos */}
              <div>
                <Label className="text-sm font-medium mb-2">Método</Label>
                <div className="space-y-2">
                  {["BOLETO", "PIX", "CARTAO", "OUTROS"].map((met) => (
                    <label
                      key={met}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={metodosFiltro.includes(met)}
                        onCheckedChange={() => toggleMetodo(met)}
                      />
                      <span className="text-sm">{met}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Saídas Operacionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {data.kpis.kpi_saidas_op_valor.toLocaleString("pt-BR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.kpis.kpi_qtd_lanc}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Variação MoM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(data.kpis.kpi_variacao_mom * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {data.kpis.kpi_ticket_medio.toLocaleString("pt-BR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Outros (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${data.kpis.kpi_outros_pct > 5 ? "text-red-600" : "text-green-600"}`}
              >
                {data.kpis.kpi_outros_pct.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Categorias */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chart_categorias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${Number(value).toLocaleString("pt-BR")}`
                    }
                  />
                  <Bar dataKey="valor" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Métodos */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.chart_metodos}
                    dataKey="valor"
                    nameKey="metodo"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {data.chart_metodos.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % 8]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${Number(value).toLocaleString("pt-BR")}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Semana */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas Semanais</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chart_semana}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${Number(value).toLocaleString("pt-BR")}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#3b82f6"
                    name="Despesas"
                  />
                  <Line
                    type="monotone"
                    dataKey="media"
                    stroke="#10b981"
                    name="Média"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* MoM Waterfall */}
          <Card>
            <CardHeader>
              <CardTitle>Variação por Categoria (MoM)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chart_mom_waterfall}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `R$ ${Number(value).toLocaleString("pt-BR")}`
                    }
                  />
                  <Bar dataKey="valor" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas Linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Fornecedores */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Lançamentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_fornecedores.slice(0, 10).map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {f.fornecedor}
                        </TableCell>
                        <TableCell>
                          R$ {f.valor.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{f.percentual.toFixed(1)}%</TableCell>
                        <TableCell>{f.lancamentos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Impostos */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Impostos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.impostos.slice(0, 5).map((imp, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{imp.nivel}</span>
                    <span className="font-semibold">
                      R$ {imp.valor.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas Linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Boletos */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Boletos</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportarCSV(data.boletos, "boletos.csv")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Favorecido</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.boletos.slice(0, 5).map((b, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{b.data}</TableCell>
                        <TableCell className="font-medium">
                          {b.favorecido}
                        </TableCell>
                        <TableCell>
                          R$ {b.valor.toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* PIX */}
          <Card>
            <CardHeader>
              <CardTitle>PIX Enviado - Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Lançamentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pix_out.slice(0, 5).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {p.contraparte}
                        </TableCell>
                        <TableCell>
                          R$ {p.valor.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{p.lancamentos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outros/Conferir */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Outras Despesas - Para Revisão</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportarCSV(data.outros, "outros.csv")}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Favorecido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.outros.map((o, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{o.data}</TableCell>
                      <TableCell className="font-medium">{o.historico}</TableCell>
                      <TableCell>
                        R$ {o.valor.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{o.favorecido}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        {data.alertas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Alertas e Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.alertas.map((alerta, idx) => (
                  <Alert
                    key={idx}
                    variant={
                      alerta.severidade === "error"
                        ? "destructive"
                        : "default"
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{alerta.tipo}</AlertTitle>
                    <AlertDescription>{alerta.mensagem}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
