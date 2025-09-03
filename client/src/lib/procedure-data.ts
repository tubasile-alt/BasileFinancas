export interface ProcedureData {
  name: string;
  value: number;
}

export const proceduresByDoctor: Record<string, ProcedureData[]> = {
  'dr-filipe': [
    { name: 'Mastopexia com Protese', value: 0 },
    { name: 'Mastopexia', value: 8000 },
    { name: 'Silicone', value: 10000 },
    { name: 'Face', value: 12000 },
    { name: 'Blefaro', value: 4000 },
    { name: 'Rino ou Ginecomastia', value: 8000 },
    { name: 'Lipo com alta no mesmo dia', value: 6000 },
    { name: 'Lipo com pernoite', value: 6500 },
    { name: 'Abdominoplastia', value: 8000 },
    { name: 'IMPLANTE CAPILAR', value: 0 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', value: 0 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', value: 0 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', value: 0 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', value: 0 },
    { name: 'pequena cirurgia ( retirada de pintas)', value: 0 },
    { name: 'retoque', value: 0 },
    { name: 'CIRURGIA UNIMED', value: 0 },
    { name: 'protese de coxa /ou panturrilha', value: 5000 },
    { name: 'protese glutea', value: 8000 },
    { name: 'Otoplastia sem sedacao', value: 4000 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', value: 0 },
    { name: 'BICHECTOMIA', value: 1000 },
    { name: 'consulta', value: 100 },
    { name: 'cirugia plástica pequena com sedação', value: 0 }
  ],
  'dr-vinicius': [
    { name: 'Mastopexia com Protese', value: 0 },
    { name: 'Mastopexia', value: 8000 },
    { name: 'Silicone', value: 10000 },
    { name: 'Face', value: 12000 },
    { name: 'Blefaro', value: 4000 },
    { name: 'Rino ou Ginecomastia', value: 8000 },
    { name: 'Lipo com alta no mesmo dia', value: 6000 },
    { name: 'Lipo com pernoite', value: 6500 },
    { name: 'Abdominoplastia', value: 8000 },
    { name: 'IMPLANTE CAPILAR', value: 0 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', value: 0 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', value: 0 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', value: 0 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', value: 0 },
    { name: 'pequena cirurgia ( retirada de pintas)', value: 0 },
    { name: 'retoque', value: 0 },
    { name: 'CIRURGIA UNIMED', value: 0 },
    { name: 'protese de coxa /ou panturrilha', value: 5000 },
    { name: 'protese glutea', value: 8000 },
    { name: 'Otoplastia sem sedacao', value: 4000 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', value: 0 },
    { name: 'BICHECTOMIA', value: 1000 },
    { name: 'consulta', value: 100 },
    { name: 'cirugia plástica pequena com sedação', value: 0 }
  ],
  'dr-basile': [
    { name: 'Mastopexia com Protese', value: 0 },
    { name: 'Mastopexia', value: 8000 },
    { name: 'Silicone', value: 10000 },
    { name: 'Face', value: 12000 },
    { name: 'Blefaro', value: 4000 },
    { name: 'Rino ou Ginecomastia', value: 8000 },
    { name: 'Lipo com alta no mesmo dia', value: 6000 },
    { name: 'Lipo com pernoite', value: 6500 },
    { name: 'Abdominoplastia', value: 8000 },
    { name: 'IMPLANTE CAPILAR', value: 0 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', value: 0 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', value: 0 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', value: 0 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', value: 0 },
    { name: 'pequena cirurgia ( retirada de pintas)', value: 0 },
    { name: 'retoque', value: 0 },
    { name: 'CIRURGIA UNIMED', value: 0 },
    { name: 'protese de coxa /ou panturrilha', value: 5000 },
    { name: 'protese glutea', value: 8000 },
    { name: 'Otoplastia sem sedacao', value: 4000 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', value: 0 },
    { name: 'BICHECTOMIA', value: 1000 },
    { name: 'consulta', value: 100 },
    { name: 'cirugia plástica pequena com sedação', value: 0 }
  ],
  'dr-arthur': [
    { name: 'Botox pequeno básico', value: 200 },
    { name: 'Botox médio básico', value: 350 },
    { name: 'Botox axilas', value: 530 },
    { name: 'Preenchimento', value: 380 },
    { name: 'Botox pequeno premium', value: 630 },
    { name: 'Botox médio premium', value: 780 },
    { name: 'Consulta', value: 0 },
    { name: 'Limelight', value: 0 },
    { name: 'Pearl fracionado', value: 0 },
    { name: 'Laser Cicatriz', value: 0 },
    { name: 'Genesis', value: 0 },
    { name: 'Pequena cirurgia', value: 150 },
    { name: 'PCT Depilaçao', value: 50 },
    { name: 'Depilaçao', value: 0 },
    { name: 'Morpheus pago', value: 50 },
    { name: 'Biopsia simples', value: 50 },
    { name: 'Biopsia cortesia', value: 0 },
    { name: 'Radiesse', value: 650 },
    { name: 'Volume', value: 430 },
    { name: 'Corticoide', value: 0 },
    { name: 'Peeling', value: 50 },
    { name: 'Pacote Estética', value: 100 },
    { name: 'Laser Capilar', value: 0 },
    { name: 'Morpheus cortesia', value: 0 },
    { name: 'Pacote peelings', value: 100 },
    { name: 'Sedação', value: 0 },
    { name: 'Pearl laser', value: 0 },
    { name: 'Pearl vip', value: 0 },
    { name: 'Infiltração', value: 50 },
    { name: 'Ulthera', value: 0 },
    { name: 'Sculptra', value: 900 },
    { name: 'Silhouet', value: 2000 },
    { name: 'Exilis Face', value: 0 },
    { name: 'Exilis Corpo', value: 0 },
    { name: 'Coolsculpting', value: 0 }
  ],
  'fisioterapia': [
    { name: 'dlus 4 sessões', value: 0 },
    { name: 'Limpeza de pele', value: 0 },
    { name: 'PACOTE LIMPEZA DE PELE', value: 0 },
    { name: 'dlus 10 sessões', value: 0 },
    { name: 'LP+MDA', value: 0 },
    { name: 'PACOTE LP+MDA', value: 0 },
    { name: 'MDA FACIAL', value: 0 },
    { name: 'MDA+PQ+ESTRIAS P', value: 0 },
    { name: 'MDA+PQ+ESTRIAS M', value: 0 },
    { name: 'MDA+PQ+ESTRIAS G', value: 0 },
    { name: '1 DRENAGEM', value: 0 },
    { name: 'DIFERENÇA PACOTE', value: 0 },
    { name: 'MADAH', value: 0 },
    { name: 'FITA SILICONE', value: 0 }
  ],
  'icb-transplante': [
    { name: 'Transplante Capilar', value: 8000 },
    { name: 'Body Hair', value: 0 }
  ]
};

export const doctorOptions = [
  { value: 'dr-filipe', label: 'Dr. Filipe' },
  { value: 'dr-vinicius', label: 'Dr. Vinícius' },
  { value: 'dr-basile', label: 'Dr. Basile' },
  { value: 'dr-arthur', label: 'Dr. Arthur' },
  { value: 'icb-transplante', label: 'ICB Transplante Capilar' },
  { value: 'fisioterapia', label: 'Fisioterapia' }
];

export const paymentMethodOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'dinheiro', label: 'Dinheiro' }
];

export const entryByOptions = [
  { value: 'michelle', label: 'Michelle' },
  { value: 'gisele', label: 'Gisele' }
];

export const installmentOptions = [
  { value: '1', label: '1x à vista' },
  { value: '2', label: '2x' },
  { value: '3', label: '3x' },
  { value: '4', label: '4x' },
  { value: '5', label: '5x' },
  { value: '6', label: '6x' },
  { value: '7', label: '7x' },
  { value: '8', label: '8x' },
  { value: '9', label: '9x' },
  { value: '10', label: '10x' },
  { value: '11', label: '11x' },
  { value: '12', label: '12x' }
];
