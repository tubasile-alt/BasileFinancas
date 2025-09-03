// Captura erros JavaScript que podem causar tela branca
export function setupErrorLogging() {
  // Captura erros não tratados
  window.addEventListener('error', (event) => {
    console.error('🔴 Erro JavaScript detectado:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  // Captura promises rejeitadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 Promise rejeitada não tratada:', event.reason);
  });

  // Override console.error para detectar padrões
  const originalError = console.error;
  console.error = (...args) => {
    originalError(...args);
    
    // Detecta erros relacionados a Select/Form
    const message = args.join(' ');
    if (message.includes('Select') || message.includes('form') || message.includes('procedure')) {
      console.warn('⚠️ Possível problema com Select/Form detectado:', args);
    }
  };
}

// Log específico para debugging de seleção de médico
export function logDoctorSelection(doctor: string, procedures: any[]) {
  console.log('👨‍⚕️ Seleção de médico:', {
    doctor,
    procedures: procedures?.map(p => ({ name: p.name, value: p.value })),
    timestamp: new Date().toISOString()
  });
}