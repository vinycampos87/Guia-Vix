import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ExternalLink, Download, Smartphone, ChevronRight } from 'lucide-react';

export default function BusSchedulesScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex flex-col pb-12">
      {/* Header */}
      <div className="bg-white p-6 border-b border-slate-100 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2.5 bg-slate-50 rounded-2xl text-slate-500 hover:bg-slate-100 transition-all"
        >
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Ponto de Ônibus</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Horários Transcol</p>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-[300px]"
      >
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-white rounded-[32px] shadow-xl flex items-center justify-center p-5 border border-slate-100 overflow-hidden">
            <img 
              src="https://play-lh.googleusercontent.com/gHHVGV7DHYyxnPoqvfmMQbYkvdyULeGE7KW0354cWCjyQlF_XeQK7o6F1RrRsTwWDCc=s360"
              alt="ÔnibusGV Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://www.ceturb.es.gov.br/Media/Ceturb/Layoutv3/logo-onibusgv.png";
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2.5 rounded-xl shadow-lg border-2 border-white">
            <Smartphone size={16} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">App ÔnibusGV</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed px-2">
            Consulte horários atualizados e a localização em tempo real dos ônibus com o app oficial.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <a
            href="https://play.google.com/store/apps/details?id=br.com.geocontrol.pontual_previsao_cordova&hl=pt_BR"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Download size={16} /> Baixar Grátis
          </a>
          
          <a
            href="https://www.ceturb.es.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white text-slate-400 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 border border-slate-100 hover:bg-slate-50 transition-all"
          >
            <ExternalLink size={12} /> Site Oficial
          </a>
        </div>

        <div className="pt-4 opacity-40">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Transcol • Grande Vitória</p>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
