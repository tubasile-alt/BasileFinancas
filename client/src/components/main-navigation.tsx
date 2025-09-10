import { Hospital, Home, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard Diário",
    icon: Home,
    description: "Controle financeiro diário"
  },
  {
    href: "/monthly",
    label: "Relatório Mensal", 
    icon: Calendar,
    description: "Dashboard mensal"
  },
  {
    href: "/gastos",
    label: "Gastos Clínica Basile",
    icon: BarChart3,
    description: "Análise de extratos bancários"
  }
];

interface MainNavigationProps {
  className?: string;
}

export function MainNavigation({ className }: MainNavigationProps) {
  const [location] = useLocation();

  return (
    <header className={cn("bg-primary text-primary-foreground shadow-sm border-b border-border", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e título */}
          <div className="flex items-center space-x-4">
            <Hospital className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Clínica Basile</h1>
          </div>

          {/* Navegação */}
          <nav className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20",
                      isActive && "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    )}
                    data-testid={`nav-link-${item.href.replace('/', '') || 'home'}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Navegação mobile */}
          <div className="md:hidden">
            <select
              value={location}
              onChange={(e) => window.location.href = e.target.value}
              className="bg-primary-foreground text-primary px-3 py-2 rounded-md text-sm font-medium"
              data-testid="nav-mobile-select"
            >
              {navigationItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Info adicional */}
          <div className="flex items-center space-x-4">
            <span className="hidden lg:block text-sm text-primary-foreground/80">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <div className="bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              <span data-testid="text-current-user">Sistema Clínica</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Hook para obter informações da página atual
 */
export function useCurrentPage() {
  const [location] = useLocation();
  const currentItem = navigationItems.find(item => item.href === location);
  
  return {
    currentPath: location,
    currentItem,
    isHome: location === "/",
    isMonthly: location === "/monthly", 
    isGastos: location === "/gastos"
  };
}