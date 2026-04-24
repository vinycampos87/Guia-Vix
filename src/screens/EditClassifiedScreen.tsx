import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, X, Camera, ShoppingBag, Upload, Box, Cog, Plus } from 'lucide-react';
import { Classified } from '../types';
import ImageCropper from '../components/ImageCropper';

export default function EditClassifiedScreen() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    contact: '',
    type: 'produto' as 'produto' | 'serviço',
    images: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [cropperImage, setCropperImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAd = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'classifieds', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ownerId !== user?.uid && !isAdmin) {
            navigate('/profile');
            return;
          }
          setFormData({
            title: data.title,
            description: data.description,
            price: data.price || '',
            contact: data.contact,
            type: data.type || 'produto',
            images: data.images || [],
          });
        } else {
          navigate('/profile');
        }
      } catch (e) {
        console.error("Error fetching classified:", e);
      } finally {
        setFetching(false);
      }
    };
    fetchAd();
  }, [id, user, navigate]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10000000) { // 10MB limit
        alert("A imagem é muito grande. Escolha uma imagem de até 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setFormData(prev => ({ ...prev, images: [...prev.images, croppedImage] }));
    setCropperImage(null);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    if (formData.images.length === 0) {
      alert("Por favor, adicione pelo menos uma foto do seu produto.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'classifieds', id), {
        ...formData,
        updatedAt: serverTimestamp(),
      }).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `classifieds/${id}`); });
      navigate('/profile');
    } catch (error) {
      console.error("Error updating ad:", error);
      alert("Erro ao atualizar o anúncio.");
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
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Editar Anúncio</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Atualize seu produto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Anúncio</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'produto'})}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${
                  formData.type === 'produto' 
                    ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                    : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
                }`}
              >
                <Box size={18} /> Produto
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'serviço'})}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${
                  formData.type === 'serviço' 
                    ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                    : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
                }`}
              >
                <Cog size={18} /> Serviço
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fotos do Produto (Até 5)</label>
              <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black">
                {formData.images.length}/5
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
              {formData.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full shadow-lg transition-transform active:scale-95"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {formData.images.length < 5 && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all text-slate-400 shadow-sm"
                >
                  <Plus size={24} />
                  <span className="text-[8px] font-black uppercase mt-1">Add</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg, image/png"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">⚠️ Adicione até 5 fotos para detalhar bem seu produto</p>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Anúncio</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-slate-700 min-h-[120px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (Somente números)</label>
              <input
                type="number"
                inputMode="numeric"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                placeholder="Ex: 50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contato (WhatsApp)</label>
              <input
                type="tel"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800"
                required
              />
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

      <AnimatePresence>
        {cropperImage && (
          <ImageCropper
            image={cropperImage}
            aspect={4 / 3}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropperImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
