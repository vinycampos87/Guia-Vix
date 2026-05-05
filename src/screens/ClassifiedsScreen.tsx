import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Plus, X, Camera, Tag, Phone, MessageCircle, Upload, ChevronRight, Search, Box, Cog, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Classified } from '../types';
import ImageCropper from '../components/ImageCropper';

export default function ClassifiedsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ads, setAds] = useState<Classified[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  const normalize = (text: string) => 
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    price: '',
    city: 'Vitória',
    neighborhood: '',
    contact: '',
    type: 'produto' as 'produto' | 'serviço',
    images: [] as string[],
  });

  useEffect(() => {
    const fetchAds = async () => {
      const q = query(collection(db, 'classifieds'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classified)));
      setLoading(false);
    };
    fetchAds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newAd.images.length === 0) {
      alert("Por favor, adicione pelo menos uma foto do seu produto.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'classifieds'), {
        ...newAd,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setAds([{ id: docRef.id, ...newAd, ownerId: user.uid, createdAt: new Date() } as Classified, ...ads]);
      setShowAdd(false);
      setNewAd({ title: '', description: '', price: '', city: 'Vitória', neighborhood: '', contact: '', type: 'produto', images: [] });
    } catch (error) {
      console.error("Error adding ad:", error);
    }
  };

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
    setNewAd(prev => ({ ...prev, images: [...prev.images, croppedImage] }));
    setCropperImage(null);
  };

  const removeImage = (index: number) => {
    setNewAd(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const isBoosted = (ad: Classified) => {
    if (!ad.boostExpiresAt) return false;
    const expiry = ad.boostExpiresAt.seconds 
      ? new Date(ad.boostExpiresAt.seconds * 1000) 
      : new Date(ad.boostExpiresAt);
    return expiry > new Date();
  };

  const filteredAds = useMemo(() => {
    const normSearch = normalize(searchTerm);
    const filtered = ads.filter(ad => 
      normalize(ad.title).includes(normSearch) ||
      normalize(ad.description || '').includes(normSearch) ||
      normalize(ad.type || '').includes(normSearch)
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
  }, [ads, searchTerm]);

  return (
    <div className="p-4 relative min-h-full pb-14">
      <div className="flex flex-col gap-4 mb-6 px-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all"
            >
              <ChevronRight className="rotate-180" size={18} />
            </button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Classificados</h2>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <Plus size={16} /> Anunciar
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar produtos ou serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 text-sm shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => <div key={i} className="h-40 bg-white/50 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredAds.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredAds.map((ad) => (
            <motion.div
              layout
              key={ad.id}
              className="bg-white rounded-2xl shadow-sm border border-white/40 overflow-hidden flex flex-col active:scale-[0.98] transition-all h-full"
            >
              <Link to={`/classified/${ad.id}`} className="flex flex-col flex-1 h-full">
                <div className="h-28 bg-slate-100 relative group shrink-0">
                  {ad.images?.[0] ? (
                    <img src={ad.images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <ShoppingBag size={24} />
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 bg-slate-900/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[6px] font-black text-white uppercase tracking-tighter border border-white/20">
                    {ad.type || 'Prod'}
                  </div>

                  {isBoosted(ad) && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-10">
                      <Star size={8} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col flex-1 justify-between">
                  <div>
                    {ad.price && (
                      <span className="text-[8px] font-black text-primary mb-0.5 block">R$ {ad.price}</span>
                    )}
                    <h3 className="font-bold text-slate-800 text-[10px] line-clamp-1 leading-tight">{ad.title}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded-full w-fit">Detalhes</span>
                      <span className="text-[6px] text-slate-400 font-bold mt-1 uppercase tracking-tighter truncate max-w-[60px]">
                        {ad.neighborhood || ad.city || 'Vitória'}
                      </span>
                    </div>
                    <Phone size={8} className="text-slate-400" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 glass rounded-[32px]">
          <p className="text-slate-400 text-sm font-medium">Nenhum anúncio no momento.</p>
        </div>
      )}

      {/* Add Ad Modal */}
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
              className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Novo Anúncio</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewAd({...newAd, type: 'produto'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all border-2 ${
                      newAd.type === 'produto' 
                        ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                        : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
                    }`}
                  >
                    <Box size={16} /> Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAd({...newAd, type: 'serviço'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all border-2 ${
                      newAd.type === 'serviço' 
                        ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                        : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
                    }`}
                  >
                    <Cog size={16} /> Serviço
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Título do anúncio"
                  value={newAd.title}
                  onChange={e => setNewAd({...newAd, title: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <textarea
                  placeholder="Descrição detalhada"
                  value={newAd.description}
                  onChange={e => setNewAd({...newAd, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                    <select
                      value={newAd.city}
                      onChange={e => setNewAd({...newAd, city: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                      required
                    >
                      {['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Guarapari', 'Viana', 'Fundão'].map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Nome do bairro"
                      value={newAd.neighborhood}
                      onChange={e => setNewAd({...newAd, neighborhood: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (Opcional)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Somente números"
                      value={newAd.price}
                      onChange={e => setNewAd({...newAd, price: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="27999887766"
                      value={newAd.contact}
                      onChange={e => setNewAd({...newAd, contact: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fotos (Até 5)</label>
                    <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black">
                      {newAd.images.length}/5
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {newAd.images.map((img, index) => (
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
                    {newAd.images.length < 5 && (
                      <label className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all text-slate-400">
                        <Plus size={24} />
                        <span className="text-[8px] font-black uppercase mt-1 text-center px-1">Add Foto</span>
                        <input
                          type="file"
                          accept="image/jpeg, image/png"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>

                  {newAd.images.length === 0 && (
                    <div className="flex flex-col items-center p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Camera size={48} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Nenhuma foto selecionada</p>
                      </div>
                    </div>
                  )}

                  <div className="w-full space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">⚠️ Regras para Fotos</p>
                    <ul className="text-[9px] font-bold text-slate-400 space-y-1 bg-white/50 p-4 rounded-xl list-disc list-inside">
                      <li>Extensão permitida: .jpg ou .png</li>
                      <li>Tamanho máximo: 10MB por foto</li>
                      <li>Envie até 5 fotos para detalhar bem seu anúncio</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {uploading ? 'Aguarde o upload...' : 'Publicar Anúncio'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
