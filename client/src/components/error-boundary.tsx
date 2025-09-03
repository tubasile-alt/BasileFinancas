import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Ops! Algo deu errado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Isso pode acontecer em alguns navegadores ao selecionar campos.
            </p>
            {this.state.error && (
              <details className="text-xs text-muted-foreground">
                <summary>Detalhes técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
              variant="secondary"
            >
              Recarregar página
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}