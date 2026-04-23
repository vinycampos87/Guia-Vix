import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, X } from 'lucide-react';
import { useAuth } from '../App';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LocationPermissionModal({ isOpen, onClose, onConfirm }: LocationPermissionModalProps) {
  const { settings } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            {/* Header with Logo */}
            <div className="pt-10 pb-6 px-8 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-xl border border-slate-100 overflow-hidden">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-3" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <MapPin className="text-white" size={40} />
                    </div>
                  )}
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                Ver estabelecimentos próximos?
              </h2>
              <p className="text-slate-500 font-medium text-[13px] leading-relaxed px-4">
                Para mostrar as empresas e serviços <span className="text-primary font-bold">mais pertinho de você agora</span>, precisamos acessar sua localização.
              </p>
            </div>

            {/* Benefits */}
            <div className="px-8 pb-10 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Navigation size={20} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Experiência Personalizada</p>
                  <p className="text-slate-800 text-[11px] font-black leading-tight">Exibiremos a distância exata até cada local.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-slate-50/50 backdrop-blur-sm flex flex-col gap-3 border-t border-slate-100">
              <button
                onClick={onConfirm}
                className="w-full bg-primary text-white py-5 rounded-[24px] font-black uppercase tracking-[2px] text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Ativar Localização
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-[24px] font-black uppercase tracking-[2px] text-[9px] text-slate-400 hover:text-slate-600 active:scale-95 transition-all text-center"
              >
                Prefiro pesquisar manualmente
              </button>
            </div>

            {/* Close Icon (Optional) */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
