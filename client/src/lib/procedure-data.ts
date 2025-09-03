export interface ProcedureData {
  name: string;
  value: number;
}

export const proceduresByDoctor: Record<string, ProcedureData[]> = {
  'dr-filipe': [
    { name: 'Mastopex', value: 1210 },
    { name: 'Silicone', value: 1089 },
    { name: 'Face', value: 2178 },
    { name: 'Blefaroplastia', value: 726 },
    { name: 'Rino ou Gluteo', value: 1210 },
    { name: 'Lipo com J', value: 1573 },
    { name: 'Abdominoplastia', value: 1815 },
    { name: 'Implante', value: 1815 },
    { name: 'Combinado', value: 1815 },
    { name: 'Combinado', value: 2178 },
    { name: 'Pequena cirurgia', value: 484 },
    { name: 'Retoque', value: 605 },
    { name: 'Cirurgia de grande porte', value: 1331 },
    { name: 'Otoplastia', value: 726 },
    { name: 'Ginecomastia', value: 1512.5 },
    { name: 'Bichectomia', value: 605 },
    { name: 'Consulta', value: 0 },
    { name: 'Cirurgia axila', value: 484 }
  ],
  'dr-vinicius': [
    { name: 'Mastopex', value: 1210 },
    { name: 'Silicone', value: 1089 },
    { name: 'Face', value: 2178 },
    { name: 'Blefaroplastia', value: 726 },
    { name: 'Rino ou Gluteo', value: 1210 },
    { name: 'Lipo com J', value: 1573 },
    { name: 'Abdominoplastia', value: 1815 },
    { name: 'Implante', value: 1815 },
    { name: 'Combinado', value: 1815 },
    { name: 'Combinado', value: 2178 },
    { name: 'Pequena cirurgia', value: 484 },
    { name: 'Retoque', value: 605 },
    { name: 'Cirurgia de grande porte', value: 1331 },
    { name: 'Otoplastia', value: 726 },
    { name: 'Ginecomastia', value: 1512.5 },
    { name: 'Bichectomia', value: 605 },
    { name: 'Consulta', value: 0 },
    { name: 'Cirurgia axila', value: 484 }
  ],
  'dr-basile': [
    { name: 'Botox pequeno', value: 200 },
    { name: 'Botox médio', value: 350 },
    { name: 'Botox axilas', value: 530 },
    { name: 'Preenchimento', value: 380 },
    { name: 'Botox pequeno', value: 630 },
    { name: 'Botox médio', value: 780 },
    { name: 'Consulta', value: 0 },
    { name: 'Limelight', value: 0 },
    { name: 'Pearl fracionado', value: 0 },
    { name: 'Laser Cicatriz', value: 0 },
    { name: 'Genesis', value: 0 },
    { name: 'Pequena cirurgia', value: 150 },
    { name: 'PCT Depilaçao', value: 50 },
    { name: 'Depilaçao', value: 0 },
    { name: 'Morpheus', value: 50 },
    { name: 'Biopsia', value: 50 },
    { name: 'Biopsia', value: 0 },
    { name: 'Radiesse', value: 650 },
    { name: 'Volume', value: 430 },
    { name: 'Corticoide', value: 0 },
    { name: 'Peeling', value: 50 },
    { name: 'Pacote Estética', value: 100 },
    { name: 'Laser Capilar', value: 0 },
    { name: 'Morpheus', value: 0 },
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
    { name: 'Coolsculpting', value: 0 },
    { name: 'Leia antes', value: 0 }
  ],
  'dr-arthur': [
    { name: 'Botox pequeno', value: 200 },
    { name: 'Botox médio', value: 350 },
    { name: 'Botox axilas', value: 530 },
    { name: 'Preenchimento', value: 380 },
    { name: 'Botox pequeno', value: 630 },
    { name: 'Botox médio', value: 780 },
    { name: 'Consulta', value: 0 },
    { name: 'Limelight', value: 0 },
    { name: 'Pearl fracionado', value: 0 },
    { name: 'Laser Cicatriz', value: 0 },
    { name: 'Genesis', value: 0 },
    { name: 'Pequena cirurgia', value: 150 },
    { name: 'PCT Depilaçao', value: 50 },
    { name: 'Depilaçao', value: 0 },
    { name: 'Morpheus', value: 50 },
    { name: 'Biopsia', value: 50 },
    { name: 'Biopsia', value: 0 },
    { name: 'Radiesse', value: 650 },
    { name: 'Volume', value: 430 },
    { name: 'Corticoide', value: 0 },
    { name: 'Peeling', value: 50 },
    { name: 'Pacote Estética', value: 100 },
    { name: 'Laser Capilar', value: 0 },
    { name: 'Morpheus', value: 0 },
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
    { name: 'Coolsculpting', value: 0 },
    { name: 'Leia antes', value: 0 }
  ],
  'fisioterapia': [
    { name: 'Piaglisplase', value: 40 },
    { name: 'Piaglisslise', value: 100 },
    { name: 'Microagulhamento', value: 0 },
    { name: 'Infiltração', value: 0 },
    { name: 'Ulthera', value: 0 },
    { name: 'Sculptra', value: 900 },
    { name: 'Silhouet', value: 2000 },
    { name: 'Exilis Face', value: 0 },
    { name: 'Exilis Corpo', value: 0 },
    { name: 'Coolsculpting', value: 0 },
    { name: 'Rita Star', value: 0 }
  ]
};

export const doctorOptions = [
  { value: 'dr-filipe', label: 'Dr. Filipe (Cirurgia Plástica)' },
  { value: 'dr-vinicius', label: 'Dr. Vinícius (Cirurgia Plástica)' },
  { value: 'dr-basile', label: 'Dr. Basile (Dermatologia)' },
  { value: 'dr-arthur', label: 'Dr. Arthur (Dermatologia)' },
  { value: 'fisioterapia', label: 'Fisioterapia' }
];

export const paymentMethodOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
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
  { value: '12', label: '12x' }
];
