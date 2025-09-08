import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PasswordProtectionProps {
  children: React.ReactNode;
}

const DASHBOARD_PASSWORD = "basile2300";
const STORAGE_KEY = "dashboard_authenticated";

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário já está autenticado
    const authenticated = localStorage.getItem(STORAGE_KEY);
    if (authenticated === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === DASHBOARD_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Senha incorreta");
      setPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-2">
              <Lock className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Dashboard Protegido</h1>
            </div>
            
            <p className="text-center text-muted-foreground">
              Digite a senha para acessar o dashboard financeiro
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-dashboard-password"
                  className="text-center"
                  autoFocus
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm text-center" data-testid="text-password-error">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-login-dashboard"
              >
                Entrar
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <Button 
          onClick={handleLogout} 
          variant="outline" 
          size="sm"
          data-testid="button-logout-dashboard"
        >
          Sair
        </Button>
      </div>
      {children}
    </div>
  );
}