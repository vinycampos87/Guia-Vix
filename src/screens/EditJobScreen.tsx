import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Save, X, Briefcase, Store, Landmark } from 'lucide-react';
import { Job, ES_CITIES } from '../types';
import { compressImage } from '../lib/imageUtils';

export default function EditJobScreen() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
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

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'jobs', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ownerId !== user?.uid && !isAdmin) {
            navigate('/profile');
            return;
          }
          setFormData({
            title: data.title,
            companyName: data.companyName || '',
            city: data.city || ES_CITIES[0],
            neighborhood: data.neighborhood || '',
            description: data.description,
            salary: data.salary || '',
            contact: data.contact,
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            bannerImage: data.bannerImage || '',
          });
        } else {
          navigate('/profile');
        }
      } catch (e) {
        console.error("Error fetching job:", e);
      } finally {
        setFetching(false);
      }
    };
    fetchJob();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        updatedAt: serverTimestamp(),
      };
      Object.keys(payload).forEach(k => {
        if ((payload as any)[k] === undefined) delete (payload as any)[k];
      });

      await updateDoc(doc(db, 'jobs', id), payload).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `jobs/${id}`); });
      navigate('/profile');
    } catch (error: any) {
      console.error("Error updating job:", error instanceof Error ? error.message : String(error));
      let errorMessage = "Erro ao atualizar a vaga.";
      
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
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="p-4 max-w-lg mx-auto pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Editar Vaga</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Atualize sua oportunidade</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
              <div className="relative mt-1">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
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
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
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
                value={formData.neighborhood}
                onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-slate-700 min-h-[150px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salário (Opcional)</label>
              <input
                type="text"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                placeholder="27999887766"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
              <input
                type="tel"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-relaxed">Imagem em Destaque (Vaga/Logo)</label>
            <div className="mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50 gap-3">
              {formData.bannerImage ? (
                <div className="relative group w-full">
                  <img src={formData.bannerImage} alt="Banner Preview" className="w-full h-32 object-cover rounded-2xl shadow-sm" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, bannerImage: ''}))}
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
                      compressImage(file, 1200, 800, 'image/webp', 0.8)
                        .then(compressed => setFormData(prev => ({...prev, bannerImage: compressed})))
                        .catch(err => console.error("Error compressing image", err));
                    }
                  }} 
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-5 rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}
