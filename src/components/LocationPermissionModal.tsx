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
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-slate-100 overflow-hidden">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <MapPin className="text-primary" size={40} />
                )}
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                Ver estabelecimentos próximos?
              </h2>
              <p className="text-slate-500 font-medium text-sm leading-relaxed px-2">
                Para mostrar as empresas e serviços mais perto de você agora, precisamos acessar sua localização.
              </p>
            </div>

            {/* Benefits */}
            <div className="px-8 pb-8 space-y-4">
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-3xl border border-primary/10">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Navigation size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-0.5">Precisão</p>
                  <p className="text-slate-600 text-xs font-medium">Ordem exata por distância de onde você está.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-50 flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/30 active:scale-95 transition-all"
              >
                Ativar Localização
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
              >
                Agora não
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
