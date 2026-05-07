import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Briefcase, Plus, X, DollarSign, Phone, Mail, MapPin, Search, Landmark, Store, Edit2, Trash2, Star, ChevronRight } from 'lucide-react';
import { Job, ES_CITIES } from '../types';

export default function JobsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [applyingTo, setApplyingTo] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const normalize = (text: string) => 
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const [newJob, setNewJob] = useState({
    title: '',
    companyName: '',
    city: ES_CITIES[0],
    neighborhood: '',
    description: '',
    salary: '',
    contact: '',
    whatsapp: '',
    email: '',
    bannerImage: '',
  });

  useEffect(() => {
    const fetchJobs = async () => {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const jobToSave = {
        ...newJob,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      };
      
      // Strip any undefined values
      Object.keys(jobToSave).forEach(key => {
        if ((jobToSave as any)[key] === undefined) {
          delete (jobToSave as any)[key];
        }
      });
      
      const docRef = await addDoc(collection(db, 'jobs'), jobToSave).catch(e => { throw handleFirestoreError(e, OperationType.CREATE, 'jobs'); });
      setJobs([{ id: docRef.id, ...newJob, ownerId: user.uid, createdAt: new Date() } as Job, ...jobs]);
      setShowAdd(false);
      setNewJob({ title: '', companyName: '', city: ES_CITIES[0], neighborhood: '', description: '', salary: '', contact: '', whatsapp: '', email: '', bannerImage: '' });
    } catch (error: any) {
      console.error("Error adding job:", error instanceof Error ? error.message : String(error));
      let errorMessage = "Erro ao publicar vaga. Tente novamente.";
      
      if (error.message) {
        try {
          const errorInfo = JSON.parse(error.message);
          if (errorInfo.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Erro de Permissão: Os dados não conferem com as regras do sistema. Preencha todos os campos corretamente.";
          } else {
            errorMessage = `Erro: ${errorInfo.error}`;
          }
        } catch (e) {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      alert(errorMessage);
    }
  };

  const handleApply = (job: Job) => {
    setApplyingTo(job);
  };

  const getWhatsAppLink = (job: Job) => {
    const text = encodeURIComponent(`Olá, vi sua vaga de "${job.title}" no VIX Guia e gostaria de me candidatar.`);
    return `https://wa.me/${job.whatsapp?.replace(/\D/g, '')}?text=${text}`;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'jobs', id));
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (error) {
      console.error("Error deleting job:", error instanceof Error ? error.message : String(error));
    }
  };

  const isBoosted = (job: Job) => {
    if (!job.boostExpiresAt) return false;
    const expiry = job.boostExpiresAt.seconds 
      ? new Date(job.boostExpiresAt.seconds * 1000) 
      : new Date(job.boostExpiresAt);
    return expiry > new Date();
  };

  const filteredJobs = useMemo(() => {
    const normSearch = normalize(searchQuery);
    const filtered = jobs.filter(job => 
      normalize(job.title).includes(normSearch) ||
      normalize(job.companyName || '').includes(normSearch) ||
      normalize(job.description || '').includes(normSearch)
    );

    return [...filtered].sort((a, b) => {
      const aBoosted = isBoosted(a);
      const bBoosted = isBoosted(b);

      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      const aTime = (a.createdAt as any)?.seconds || 0;
      const bTime = (b.createdAt as any)?.seconds || 0;
      return bTime - aTime;
    });
  }, [jobs, searchQuery]);

  return (
    <div className="p-4 relative min-h-full pb-14">
      <div className="flex items-center justify-between gap-4 mb-6 px-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all"
          >
            <ChevronRight className="rotate-180" size={18} />
          </button>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Vagas</h2>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
        >
          <Plus size={16} /> Postar Vaga
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar por cargo ou palavra-chave..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium text-slate-600 placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-white/50 rounded-[32px] animate-pulse" />)}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobs.map((job) => (
            <motion.div
              layout
              key={job.id}
              className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-all group"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                      {isBoosted(job) && (
                        <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                          <Star size={10} fill="currentColor" />
                        </div>
                      )}
                      {user && job.ownerId === user.uid && (
                        <div className="flex items-center gap-1 ml-2">
                          <Link to={`/edit-job/${job.id}`} className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors">
                            <Edit2 size={12} />
                          </Link>
                          <button onClick={() => handleDelete(job.id)} className="p-1.5 bg-rose-50 rounded-lg text-rose-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-0.5">{job.companyName}</p>
                    <div className="flex items-center gap-3 mt-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-green-600" />
                        <span>{job.salary || 'A combinar'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{job.neighborhood ? `${job.neighborhood}, ` : ''}{job.city || 'Vitória'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                    <Briefcase size={24} />
                  </div>
                </div>
                
                <div className="mt-4 relative">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed line-clamp-3">
                    {job.description}
                  </p>
                  
                  <Link
                    to={`/job/${job.id}`}
                    className="text-primary text-[10px] font-black uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
                  >
                    Mais detalhes...
                  </Link>
                </div>
                
                <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Publicado recentemente</span>
                  <button 
                    onClick={() => handleApply(job)}
                    className="bg-primary text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
                  >
                    Candidatar-se
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 glass rounded-[32px] px-6">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={32} />
          </div>
          <p className="text-slate-500 font-bold">
            {searchQuery 
              ? `Nenhum resultado para "${searchQuery}"`
              : "Nenhuma vaga disponível no momento."}
          </p>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            {searchQuery 
              ? "Tente buscar por termos mais genéricos."
              : "Seja o primeiro a postar uma vaga!"}
          </p>
        </div>
      )}

      {/* Contact Choice Modal */}
      <AnimatePresence>
        {applyingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setApplyingTo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-4">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Candidatar-se</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Como você deseja entrar em contato?</p>
              </div>

              <div className="space-y-4">
                {applyingTo.whatsapp && (
                  <a
                    href={getWhatsAppLink(applyingTo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 w-full bg-emerald-500 text-white p-5 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-200"
                  >
                    <div className="bg-white/20 p-2 rounded-xl">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs opacity-80 font-black uppercase tracking-widest">Via WhatsApp</span>
                      <span className="text-sm">Enviar Mensagem</span>
                    </div>
                  </a>
                )}

                {applyingTo.email && (
                  <a
                    href={`mailto:${applyingTo.email}?subject=Candidatura: ${applyingTo.title}`}
                    className="flex items-center gap-4 w-full bg-blue-600 text-white p-5 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg shadow-blue-200"
                  >
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Mail size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs opacity-80 font-black uppercase tracking-widest">Via E-mail</span>
                      <span className="text-sm">Enviar Currículo</span>
                    </div>
                  </a>
                )}

                {!applyingTo.whatsapp && !applyingTo.email && (
                  <a
                    href={`tel:${applyingTo.contact}`}
                    className="flex items-center gap-4 w-full bg-slate-800 text-white p-5 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg shadow-slate-200"
                  >
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Phone size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs opacity-80 font-black uppercase tracking-widest">Via Telefone</span>
                      <span className="text-sm">Ligar Agora</span>
                    </div>
                  </a>
                )}
              </div>

              <button 
                onClick={() => setApplyingTo(null)}
                className="w-full mt-6 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Job Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Nova Vaga</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Publique sua oportunidade</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Vaga</label>
                      <input
                        type="text"
                        placeholder="Ex: Gerente de Loja"
                        value={newJob.title}
                        onChange={e => setNewJob({...newJob, title: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                      <div className="relative mt-1">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                          type="text"
                          placeholder="Nome da empresa"
                          value={newJob.companyName}
                          onChange={e => setNewJob({...newJob, companyName: e.target.value})}
                          className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                      <div className="relative mt-1">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                        <select
                          value={newJob.city}
                          onChange={e => setNewJob({...newJob, city: e.target.value})}
                          className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 appearance-none"
                          required
                        >
                          {ES_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                      <input
                        type="text"
                        placeholder="Nome do bairro"
                        value={newJob.neighborhood}
                        onChange={e => setNewJob({...newJob, neighborhood: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição e Requisitos</label>
                    <textarea
                      placeholder="Descreva as atividades..."
                      value={newJob.description}
                      onChange={e => setNewJob({...newJob, description: e.target.value})}
                      className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-slate-700 min-h-[120px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salário (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 2.500"
                        value={newJob.salary}
                        onChange={e => setNewJob({...newJob, salary: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="27999887766"
                        value={newJob.whatsapp}
                        onChange={e => setNewJob({...newJob, whatsapp: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input
                        type="email"
                        placeholder="rh@vix.com"
                        value={newJob.email}
                        onChange={e => setNewJob({...newJob, email: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Geral</label>
                      <input
                        type="tel"
                        placeholder="(27) 3000-0000"
                        value={newJob.contact}
                        onChange={e => setNewJob({...newJob, contact: e.target.value})}
                        className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-relaxed">Imagem em Destaque (Vaga/Logo)</label>
                    <div className="mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50 gap-3">
                      {newJob.bannerImage ? (
                        <div className="relative group w-full">
                          <img src={newJob.bannerImage} alt="Banner Preview" className="w-full h-32 object-cover rounded-2xl shadow-sm" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setNewJob(prev => ({...prev, bannerImage: ''}))}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <Store size={32} />
                          <p className="text-[8px] font-black uppercase tracking-widest">Clique abaixo para enviar</p>
                        </div>
                      )}
                      
                      <label className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        Selecionar Imagem
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setNewJob(prev => ({...prev, bannerImage: reader.result as string}));
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[0.98] transition-all"
                >
                  Publicar Oportunidade
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
