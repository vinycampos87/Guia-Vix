import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface BoostHighlightProps {
  expiresAt: any;
}

export default function BoostHighlight({ expiresAt }: BoostHighlightProps) {
  if (!expiresAt) return null;

  // Check if still valid
  const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  if (expiryDate < new Date()) return null;

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-emerald-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 sticky top-0 z-30 shadow-lg shadow-emerald-500/20"
    >
      <div className="bg-white/20 p-1 rounded-full">
        <Star size={12} className="fill-white text-white" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Destaque Verificado Guia Vix 🚀</span>
    </motion.div>
  );
}
