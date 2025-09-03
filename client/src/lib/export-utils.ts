import type { FinancialEntry } from "@shared/schema";

export function exportToCSV(entries: FinancialEntry[], filename: string = 'entradas-financeiras') {
  const headers = [
    'Data',
    'Hora',
    'Paciente',
    'Código',
    'Médico',
    'Procedimento',
    'Valor',
    'Pagamento',
    'Parcelas',
    'Nota Fiscal',
    'Lançado por'
  ];

  const csvContent = [
    headers.join(','),
    ...entries.map(entry => [
      entry.entryDate,
      entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('pt-BR') : '',
      `"${entry.patientName}"`,
      entry.patientCode,
      entry.doctor,
      `"${entry.procedure}"`,
      `"R$ ${parseFloat(entry.procedureValue).toFixed(2).replace('.', ',')}"`,
      entry.paymentMethod,
      entry.installments || 1,
      entry.invoiceRequested ? 'Sim' : 'Não',
      entry.entryBy
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR');
}

export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
