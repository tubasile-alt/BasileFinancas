import type { FinancialEntry } from "@shared/schema";
import * as XLSX from 'xlsx';

function getPaymentMethodsText(paymentDetails: any[]) {
  if (!paymentDetails || paymentDetails.length === 0) return 'N/A';
  
  return paymentDetails.map(payment => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      transferencia: 'Transferência',
      cartao_credito: 'Cartão',
      dinheiro: 'Dinheiro'
    };
    const methodLabel = labels[payment.method] || payment.method;
    const value = `R$ ${payment.value.toFixed(2).replace('.', ',')}`;
    const installments = payment.installments && payment.installments > 1 ? ` ${payment.installments}x` : '';
    return `${methodLabel}${installments}: ${value}`;
  }).join(' + ');
}

function getTotalValue(paymentDetails: any[]) {
  if (!paymentDetails || paymentDetails.length === 0) return 0;
  return paymentDetails.reduce((sum, payment) => sum + (payment.value || 0), 0);
}

export function exportToExcel(entries: FinancialEntry[], filename: string = 'entradas-financeiras') {
  const worksheetData = entries.map(entry => ({
    'Data': entry.entryDate,
    'Hora': entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('pt-BR') : '',
    'Paciente': entry.patientName,
    'Código': entry.patientCode,
    'Médico': entry.doctor,
    'Procedimento': entry.procedure,
    'Valor Total': `R$ ${getTotalValue(entry.paymentDetails).toFixed(2).replace('.', ',')}`,
    'Métodos de Pagamento': getPaymentMethodsText(entry.paymentDetails),
    'Número NF': entry.invoiceNumber || 'N/A',
    'Lançado por': entry.entryBy
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entradas Financeiras");
  
  // Ajustar largura das colunas
  const maxWidth = worksheetData.reduce((w, r) => Math.max(w, r.Paciente.length), 10);
  worksheet['!cols'] = [
    { wch: 12 }, // Data
    { wch: 8 },  // Hora
    { wch: Math.max(maxWidth, 15) }, // Paciente
    { wch: 10 }, // Código
    { wch: 15 }, // Médico
    { wch: 20 }, // Procedimento
    { wch: 15 }, // Valor Total
    { wch: 30 }, // Métodos de Pagamento
    { wch: 12 }, // Número NF
    { wch: 15 }  // Lançado por
  ];
  
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
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
