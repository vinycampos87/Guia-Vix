import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, ArrowLeft, DollarSign, MapPin, Landmark, Store, Phone, Mail, Edit2, Trash2, Calendar, Share2 } from 'lucide-react';
import { Job } from '../types';
import { useAuth } from '../App';
import BoostHighlight from '../components/BoostHighlight';

export default function JobDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'jobs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setJob({ id: docSnap.id, ...docSnap.data() } as Job);
        } else {
          navigate('/jobs');
        }
      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!job || !id) return;
    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'jobs', id));
      navigate('/jobs');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `jobs/${id}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getWhatsAppLink = (job: Job) => {
    const text = encodeURIComponent(`Olá, vi sua vaga de "${job.title}" no Guia VIX e gostaria de me candidatar.`);
    return `https://wa.me/${job.whatsapp?.replace(/\D/g, '')}?text=${text}`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Confira esta vaga de ${job?.title} na ${job?.companyName}!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) return null;

  const isOwner = user && job.ownerId === user.uid;

  return (
    <div className="relative">
      <BoostHighlight expiresAt={job.boostExpiresAt} />
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-6 rounded-b-[32px] shadow-sm border-b border-slate-100 z-30 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button 
                  onClick={() => navigate(`/edit-job/${job.id}`)}
                  className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary transition-colors rounded-xl"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 bg-rose-50 text-rose-400 hover:text-rose-500 transition-colors rounded-xl"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button 
              onClick={handleShare}
              className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
            <Briefcase size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight truncate">
              {job.title}
            </h1>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold mt-0.5">
              <Store size={14} className="text-primary/60" />
              <span className="truncate">{job.companyName}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Salário</span>
              <span className="text-[11px] font-bold text-slate-700 truncate block">{job.salary || 'A combinar'}</span>
            </div>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
              <Landmark size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cidade</span>
              <span className="text-[11px] font-bold text-slate-700 truncate block">{job.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-6 pb-32 no-scrollbar max-w-4xl mx-auto w-full">
        {/* Description Section */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-200" />
            Descrição da Vaga
          </h2>
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-50">
            <p className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
              {job.description}
            </p>
          </div>
        </div>

        {/* Contact info Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-4 h-[1px] bg-slate-200" />
            Informações de Contato
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {job.whatsapp && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">WhatsApp</span>
                  <span className="text-[13px] text-slate-700 font-bold block">{job.whatsapp}</span>
                </div>
              </div>
            )}
            {job.email && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">E-mail</span>
                  <span className="text-[13px] text-slate-700 font-bold block truncate">{job.email}</span>
                </div>
              </div>
            )}
            {job.contact && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm">
                <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Telefone</span>
                  <span className="text-[13px] text-slate-700 font-bold block">{job.contact}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button at the end */}
        <div className="mt-8">
          <button 
            onClick={() => setApplying(true)}
            className="w-full bg-primary text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[0.98] active:scale-[0.96] transition-all flex items-center justify-center gap-2"
          >
            <Briefcase size={20} />
            <span className="text-sm">Quero Me Candidatar</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">
            Boa sorte na sua candidatura! 🚀
          </p>
        </div>
      </div>

      {/* Application Options Modal */}
      <AnimatePresence>
        {applying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setApplying(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Candidatar-se</h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Escolha um canal de contato</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {job.whatsapp && (
                  <a
                    href={getWhatsAppLink(job)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-[#128C7E] text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-50"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span className="text-sm">WhatsApp</span>
                  </a>
                )}

                {job.email && (
                  <a
                    href={`mailto:${job.email}?subject=Candidatura: ${job.title}`}
                    className="flex items-center gap-3 w-full bg-blue-600 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-50"
                  >
                    <Mail size={20} />
                    <span className="text-sm">E-mail</span>
                  </a>
                )}

                {job.contact && (
                  <a
                    href={`tel:${job.contact}`}
                    className="flex items-center gap-3 w-full bg-slate-800 text-white p-4 rounded-xl font-bold transition-all active:scale-95"
                  >
                    <Phone size={20} />
                    <span className="text-sm">Telefone</span>
                  </a>
                )}
              </div>

              <button 
                onClick={() => setApplying(false)}
                className="w-full mt-6 py-4 bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-[32px] shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-500 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
