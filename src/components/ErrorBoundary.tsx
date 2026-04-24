import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        const msg = this.state.error?.message;
        if (msg && msg.startsWith('{')) {
          const parsed = JSON.parse(msg);
          if (parsed.error && (parsed.error.includes('permissions') || parsed.error.includes('permission'))) {
            errorMessage = "Você não tem permissão para realizar esta ação.";
          } else {
            errorMessage = parsed.error || errorMessage;
          }
          if (parsed.operationType || parsed.path) {
            details = `Operação: ${parsed.operationType || '?'} | Path: ${parsed.path || '?'}`;
          }
        } else if (msg) {
          errorMessage = msg;
        }
      } catch (e) {
        // Fallback if parsing fails
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 text-center"
          >
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-500 text-sm mb-6">{errorMessage}</p>
            
            {details && (
              <div className="bg-slate-50 p-3 rounded-xl text-[10px] font-mono text-slate-400 mb-8 break-all">
                {details}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                <RefreshCw size={18} /> Tentar Novamente
              </button>
              <button
                onClick={this.handleReset}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <Home size={18} /> Voltar ao Início
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
