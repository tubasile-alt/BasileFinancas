// Custos dos procedimentos que os médicos pagam para a clínica
export interface ProcedureCostData {
  name: string;
  cost: number; // Custo em reais que o médico paga para a clínica
}

// Custos fixos mensais que cada médico paga
export const MONTHLY_FIXED_COSTS = {
  condominio: 6000, // R$ 6.000 de condomínio
  centro_cirurgico: 1500, // R$ 1.500 de taxa do centro cirúrgico
  total: 7500 // Total das taxas fixas
};

// Custos dos procedimentos para médicos de cirurgia plástica
export const procedureCostsByDoctor: Record<string, ProcedureCostData[]> = {
  'dr-filipe': [
    { name: 'Mastopexia com Protese', cost: 2000 },
    { name: 'Mastopexia', cost: 2000 },
    { name: 'Silicone', cost: 1500 },
    { name: 'Face', cost: 2800 },
    { name: 'Blefaro', cost: 1300 },
    { name: 'Rino ou Ginecomastia', cost: 1800 },
    { name: 'Lipo com alta no mesmo dia', cost: 2000 },
    { name: 'Lipo com pernoite', cost: 2500 },
    { name: 'Abdominoplastia', cost: 2500 },
    { name: 'IMPLANTE CAPILAR', cost: 2000 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', cost: 2500 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', cost: 2500 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', cost: 2800 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', cost: 2800 },
    { name: 'pequena cirurgia ( retirada de pintas)', cost: 500 },
    { name: 'retoque', cost: 500 },
    { name: 'CIRURGIA UNIMED', cost: 60.5 },
    { name: 'protese de coxa /ou panturrilha', cost: 2500 },
    { name: 'protese glutea', cost: 2500 },
    { name: 'Otoplastia sem sedacao', cost: 1500 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', cost: 2500 },
    { name: 'BICHECTOMIA', cost: 1000 },
    { name: 'consulta', cost: 0 },
    { name: 'cirugia plástica pequena com sedação', cost: 800 },
    { name: 'Morpheus', cost: 0 },
    { name: 'CO2/MORPHEUS/RENUVION solto', cost: 1500 }
  ],
  'dr-vinicius': [
    { name: 'Mastopexia com Protese', cost: 2000 },
    { name: 'Mastopexia', cost: 2000 },
    { name: 'Silicone', cost: 1500 },
    { name: 'Face', cost: 2800 },
    { name: 'Blefaro', cost: 1300 },
    { name: 'Rino ou Ginecomastia', cost: 1800 },
    { name: 'Lipo com alta no mesmo dia', cost: 2000 },
    { name: 'Lipo com pernoite', cost: 2500 },
    { name: 'Abdominoplastia', cost: 2500 },
    { name: 'IMPLANTE CAPILAR', cost: 2000 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', cost: 2500 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', cost: 2500 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', cost: 2800 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', cost: 2800 },
    { name: 'pequena cirurgia ( retirada de pintas)', cost: 500 },
    { name: 'retoque', cost: 500 },
    { name: 'CIRURGIA UNIMED', cost: 60.5 },
    { name: 'protese de coxa /ou panturrilha', cost: 2500 },
    { name: 'protese glutea', cost: 2500 },
    { name: 'Otoplastia sem sedacao', cost: 1500 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', cost: 2500 },
    { name: 'BICHECTOMIA', cost: 1000 },
    { name: 'consulta', cost: 0 },
    { name: 'cirugia plástica pequena com sedação', cost: 800 },
    { name: 'Morpheus', cost: 0 },
    { name: 'DIFERENÇA PACOTE', cost: 0 },
    { name: 'MADAH', cost: 0 },
    { name: 'FITA SILICONE', cost: 0 },
    { name: 'CO2/MORPHEUS/RENUVION solto', cost: 1500 }
  ],
  // ICB Transplante - custos específicos
  'icb-transplante': [
    { name: 'Transplante Capilar', cost: 2000 }, // R$ 2.000 por transplante
    { name: 'Body Hair', cost: 2000 } // R$ 2.000 por procedimento
  ],
  'dr-basile': [
    { name: 'Mastopexia com Protese', cost: 2000 },
    { name: 'Mastopexia', cost: 2000 },
    { name: 'Silicone', cost: 1500 },
    { name: 'Face', cost: 2800 },
    { name: 'Blefaro', cost: 1300 },
    { name: 'Rino ou Ginecomastia', cost: 1800 },
    { name: 'Lipo com alta no mesmo dia', cost: 2000 },
    { name: 'Lipo com pernoite', cost: 2500 },
    { name: 'Abdominoplastia', cost: 2500 },
    { name: 'IMPLANTE CAPILAR', cost: 2000 },
    { name: 'Combinada com protese sem Pernoite (protese de mama +nariz ou lipo )', cost: 2500 },
    { name: 'Combinada sem  protese sem Pernoite (rino + lipo)', cost: 2500 },
    { name: 'Combinada sem protese com Pernoite (mama reducao c abdomen//face c nariz)', cost: 2800 },
    { name: 'Combinada com protese com Pernoite (mama c protese + Abdomen)', cost: 2800 },
    { name: 'pequena cirurgia ( retirada de pintas)', cost: 500 },
    { name: 'retoque', cost: 500 },
    { name: 'CIRURGIA UNIMED', cost: 60.5 },
    { name: 'protese de coxa /ou panturrilha', cost: 2500 },
    { name: 'protese glutea', cost: 2500 },
    { name: 'Otoplastia sem sedacao', cost: 1500 },
    { name: 'contorno corporal (lift de coxa, dorso, braco)', cost: 2500 },
    { name: 'BICHECTOMIA', cost: 1000 },
    { name: 'consulta', cost: 0 },
    { name: 'cirugia plástica pequena com sedação', cost: 800 },
    { name: 'CO2/MORPHEUS/RENUVION solto', cost: 1500 }
  ],
  // Dr. Arthur - custos específicos
  'dr-arthur': [
    { name: 'botox pequeno', cost: 200 },
    { name: 'botox médio', cost: 350 },
    { name: 'botox axila', cost: 530 },
    { name: 'preenchimento', cost: 380 },
    { name: 'botox pequeno + preenchimento', cost: 630 },
    { name: 'botox médio + preenchimento', cost: 780 },
    { name: 'consulta', cost: 0 },
    { name: 'limelight', cost: 0 },
    { name: 'Pearl fracionado', cost: 0 },
    { name: 'Laser cicatriz', cost: 0 },
    { name: 'Genesis', cost: 0 },
    { name: 'pequena cirurgia', cost: 150 },
    { name: 'PCT depilação', cost: 50 },
    { name: '1 DEPILAÇÃO', cost: 0 },
    { name: 'morpheus rosto', cost: 0 },
    { name: 'morpheus palpebra', cost: 0 },
    { name: 'morpheus corpo', cost: 0 },
    { name: 'biópsia', cost: 50 },
    { name: 'EMSCULPTING neo', cost: 0 },
    { name: 'radiesse', cost: 650 },
    { name: 'voluma', cost: 430 },
    { name: 'corticóide', cost: 0 },
    { name: 'peeling', cost: 50 },
    { name: 'PACOTE ESTRIA', cost: 100 },
    { name: 'LASER CAPILAR', cost: 0 },
    { name: 'MORPHEUS 2 AREAS', cost: 0 },
    { name: 'pacote peeling', cost: 100 },
    { name: 'sedação', cost: 0 },
    { name: 'PEARL-ARTHUR', cost: 0 },
    { name: 'PEARL-FILIPE', cost: 0 },
    { name: 'PEARL- BASILE', cost: 0 },
    { name: 'PEARL-VINICIUS', cost: 0 },
    { name: 'INFILTRAÇÃO CORTICOIDE', cost: 50 },
    { name: 'PIAGLIS-PEQUENO', cost: 40 },
    { name: 'PIAGLIS -INTEIRO', cost: 100 },
    { name: 'MICROAGULHAMENTO', cost: 0 },
    { name: 'INFILTRAÇÃO CABELO', cost: 0 },
    { name: 'ULTHERA', cost: 0 },
    { name: 'SCULPTRA', cost: 900 },
    { name: 'SILHOUETTE', cost: 2000 },
    { name: 'EXILIS FACE/OLHOS/PESCOÇO', cost: 0 },
    { name: 'EXILIS CORPO', cost: 0 },
    { name: 'COOLSCUPTING', cost: 0 },
    { name: 'ENTONE', cost: 0 },
    { name: 'morpheus pescoco', cost: 0 }
  ]
};

// Função para obter o custo de um procedimento específico para um médico
export function getProcedureCost(doctor: string, procedureName: string): number {
  const doctorCosts = procedureCostsByDoctor[doctor];
  if (!doctorCosts) return 0;
  
  const procedure = doctorCosts.find(p => p.name === procedureName);
  return procedure?.cost || 0;
}

// Função para calcular o custo total de procedimentos para um médico
export function calculateProcedureCosts(procedures: Array<{ procedure: string; count: number; }>, doctor: string): number {
  return procedures.reduce((total, proc) => {
    const procedureCost = getProcedureCost(doctor, proc.procedure);
    return total + (procedureCost * proc.count);
  }, 0);
}

// Função para calcular o custo total mensal de um médico
export function calculateMonthlyDoctorCost(procedureCosts: number): number {
  return procedureCosts + MONTHLY_FIXED_COSTS.total;
}
