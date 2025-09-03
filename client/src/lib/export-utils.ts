import type { FinancialEntry } from "@shared/schema";
import * as XLSX from 'xlsx';

function getTotalValue(paymentDetails: any[]) {
  if (!paymentDetails || paymentDetails.length === 0) return 0;
  return paymentDetails.reduce((sum, payment) => sum + (payment.value || 0), 0);
}

function getPaymentByMethod(paymentDetails: any[], method: string) {
  if (!paymentDetails || paymentDetails.length === 0) return 0;
  const payment = paymentDetails.find(p => p.method === method);
  return payment ? payment.value : 0;
}

function getCreditCardInstallments(paymentDetails: any[]) {
  if (!paymentDetails || paymentDetails.length === 0) return '';
  const payment = paymentDetails.find(p => p.method === 'cartao_credito');
  return payment && payment.installments ? payment.installments : '';
}

function getCreditCardInstallmentValue(paymentDetails: any[]) {
  if (!paymentDetails || paymentDetails.length === 0) return 0;
  const payment = paymentDetails.find(p => p.method === 'cartao_credito');
  if (payment && payment.installments && payment.installments > 1) {
    return payment.value / payment.installments;
  }
  return payment ? payment.value : 0;
}

export function exportToExcel(entries: FinancialEntry[], filename: string = 'entradas-financeiras') {
  const worksheetData = entries.map(entry => ({
    'Hora': entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('pt-BR') : '',
    'Paciente': entry.patientName,
    'Código': entry.patientCode,
    'Médico': entry.doctor,
    'Procedimento': entry.procedure,
    'Valor Total': `R$ ${getTotalValue(entry.paymentDetails).toFixed(2).replace('.', ',')}`,
    'PIX': getPaymentByMethod(entry.paymentDetails, 'pix') > 0 ? `R$ ${getPaymentByMethod(entry.paymentDetails, 'pix').toFixed(2).replace('.', ',')}` : '',
    'Transferência': getPaymentByMethod(entry.paymentDetails, 'transferencia') > 0 ? `R$ ${getPaymentByMethod(entry.paymentDetails, 'transferencia').toFixed(2).replace('.', ',')}` : '',
    'Cartão': getPaymentByMethod(entry.paymentDetails, 'cartao_credito') > 0 ? `R$ ${getPaymentByMethod(entry.paymentDetails, 'cartao_credito').toFixed(2).replace('.', ',')}` : '',
    'Nº Parcelas': getCreditCardInstallments(entry.paymentDetails),
    'Valor Parcela': getCreditCardInstallmentValue(entry.paymentDetails) > 0 ? `R$ ${getCreditCardInstallmentValue(entry.paymentDetails).toFixed(2).replace('.', ',')}` : '',
    'Dinheiro': getPaymentByMethod(entry.paymentDetails, 'dinheiro') > 0 ? `R$ ${getPaymentByMethod(entry.paymentDetails, 'dinheiro').toFixed(2).replace('.', ',')}` : '',
    'Número NF': entry.invoiceNumber || '',
    'Observações': entry.observations || '',
    'Lançado por': entry.entryBy
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entradas Financeiras");
  
  // Ajustar largura das colunas
  const maxWidth = worksheetData.reduce((w, r) => Math.max(w, r.Paciente.length), 10);
  worksheet['!cols'] = [
    { wch: 8 },  // Hora
    { wch: Math.max(maxWidth, 15) }, // Paciente
    { wch: 10 }, // Código
    { wch: 15 }, // Médico
    { wch: 20 }, // Procedimento
    { wch: 12 }, // Valor Total
    { wch: 12 }, // PIX
    { wch: 12 }, // Transferência
    { wch: 12 }, // Cartão
    { wch: 10 }, // Nº Parcelas
    { wch: 12 }, // Valor Parcela
    { wch: 12 }, // Dinheiro
    { wch: 12 }, // Número NF
    { wch: 20 }, // Observações
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
