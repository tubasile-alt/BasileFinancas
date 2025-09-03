import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/export-utils";

interface DailySummaryProps {
  date: string;
}

interface DailySummaryData {
  total: number;
  plasticsTotal: number;
  dermatologyTotal: number;
  physiotherapyTotal: number;
  count: number;
}

export function DailySummary({ date }: DailySummaryProps) {
  const { data: summary } = useQuery<DailySummaryData>({
    queryKey: ["/api/daily-summary", date],
    enabled: !!date,
  });

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2"></div>
            <div className="h-8 bg-muted rounded w-32"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4 border border-border bg-background">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Total do Dia</div>
        <div className="text-2xl font-semibold text-foreground" data-testid="text-daily-total">
          {formatCurrency(summary.total)}
        </div>
      </Card>
      <Card className="p-4 border border-border bg-background">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Cirurgia Plástica</div>
        <div className="text-2xl font-semibold text-foreground" data-testid="text-plastics-total">
          {formatCurrency(summary.plasticsTotal)}
        </div>
      </Card>
      <Card className="p-4 border border-border bg-background">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Dermatologia</div>
        <div className="text-2xl font-semibold text-foreground" data-testid="text-dermatology-total">
          {formatCurrency(summary.dermatologyTotal)}
        </div>
      </Card>
      <Card className="p-4 border border-border bg-background">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Fisioterapia</div>
        <div className="text-2xl font-semibold text-foreground" data-testid="text-physiotherapy-total">
          {formatCurrency(summary.physiotherapyTotal)}
        </div>
      </Card>
    </div>
  );
}
