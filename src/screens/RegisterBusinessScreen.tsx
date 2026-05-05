import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Store, MapPin, Phone, MessageCircle, Image as ImageIcon, ChevronLeft, Save, Plus, X, Camera, Landmark, Clock, Check } from 'lucide-react';
import { BUSINESS_CATEGORIES, ES_CITIES } from '../types';
import ImageCropper from '../components/ImageCropper';
import { cn, safeStringify } from '../lib/utils';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export default function RegisterBusinessScreen() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    neighborhood: '',
    city: '',
    mapsUrl: '',
    openingHours: '',
    bannerImage: '',
    images: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [daySchedules, setDaySchedules] = useState<Record<string, { isOpen: boolean; openHour: string; openMinute: string; closeHour: string; closeMinute: string }>>(
    DAYS_OF_WEEK.reduce((acc, day) => ({ 
      ...acc, 
      [day.key]: { 
        isOpen: false, 
        openHour: '08', 
        openMinute: '00', 
        closeHour: '18', 
        closeMinute: '00' 
      } 
    }), {})
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [cropper, setCropper] = useState<{ image: string; type: 'banner' | 'gallery' } | null>(null);
  const [cropQueue, setCropQueue] = useState<string[]>([]);

  useEffect(() => {
    if (isEdit) {
      const fetchBusiness = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'businesses', id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.ownerId !== user?.uid && !isAdmin) {
              navigate('/profile');
              return;
            }
            setFormData({
              name: data.name,
              category: data.category,
              description: data.description,
              phone: data.phone,
              whatsapp: data.whatsapp,
              email: data.email || '',
              address: data.address,
              neighborhood: data.neighborhood || '',
              city: data.city || '',
              mapsUrl: data.mapsUrl || '',
              openingHours: data.openingHours || '',
              bannerImage: data.bannerImage,
              images: data.images || [],
              latitude: data.latitude,
              longitude: data.longitude,
            });

            // Parse opening hours if they are in JSON format
            if (data.openingHours) {
              try {
                const parsed = JSON.parse(data.openingHours);
                if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const transformed = { ...daySchedules };
                  Object.keys(parsed).forEach(key => {
                    const info = parsed[key];
                    if (info.hours) {
                      const match = info.hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
                      if (match) {
                        transformed[key] = {
                          isOpen: !!info.isOpen,
                          openHour: match[1].padStart(2, '0'),
                          openMinute: match[2].padStart(2, '0'),
                          closeHour: match[3].padStart(2, '0'),
                          closeMinute: match[4].padStart(2, '0')
                        };
                      } else {
                        transformed[key] = { ...transformed[key], isOpen: !!info.isOpen };
                      }
                    } else {
                      transformed[key] = { ...transformed[key], isOpen: !!info.isOpen };
                    }
                  });
                  setDaySchedules(transformed);
                }
              } catch (e) {
                // Fallback for simple string if needed
              }
            }
          }
        } catch (e) {
          throw handleFirestoreError(e, OperationType.GET, `businesses/${id}`);
        }
        setFetching(false);
      };
      fetchBusiness();
    }
  }, [id, isEdit, user, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBanner: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isBanner) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropper({ image: reader.result as string, type: 'banner' });
      };
      reader.readAsDataURL(file);
    } else {
      const remainingSlots = 5 - formData.images.length;
      if (remainingSlots <= 0) {
        alert("Máximo de 5 fotos da galeria permitidas.");
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const newPendingImages: string[] = [];

      let processedCount = 0;
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          newPendingImages.push(reader.result as string);
          processedCount++;
          
          if (processedCount === filesToProcess.length) {
            // Start cropping the first one from the new batch
            setCropQueue(prev => [...prev, ...newPendingImages]);
            if (!cropper) {
              setCropper({ image: newPendingImages[0], type: 'gallery' });
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    if (cropper?.type === 'banner') {
      setFormData(prev => ({ ...prev, bannerImage: croppedImage }));
      setCropper(null);
    } else if (cropper?.type === 'gallery') {
      setFormData(prev => ({ ...prev, images: [...prev.images, croppedImage] }));
      
      // Handle queue
      const nextQueue = cropQueue.slice(1);
      setCropQueue(nextQueue);
      
      if (nextQueue.length > 0) {
        setCropper({ image: nextQueue[0], type: 'gallery' });
      } else {
        setCropper(null);
      }
    }
  };

  const cancelCrop = () => {
    setCropper(null);
    setCropQueue([]);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setLoading(false);
          alert("Sua localização foi detectada com sucesso!");
        },
        (error) => {
          setLoading(false);
          console.error("Error detecting location:", error);
          alert("Não foi possível detectar sua localização. Certifique-se de que a permissão foi concedida.");
        }
      );
    } else {
      alert("Seu navegador não suporta geolocalização.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.bannerImage) {
      alert("O banner da empresa é obrigatório.");
      return;
    }

    if (!formData.category) {
      alert("Por favor, selecione uma categoria.");
      return;
    }

    if (!formData.city) {
      alert("Por favor, selecione uma cidade.");
      return;
    }

    if (!formData.neighborhood) {
      alert("Por favor, digite o bairro.");
      return;
    }

    setLoading(true);

    try {
      // Serialize opening hours
      const transformedSchedules: Record<string, any> = {};
      Object.keys(daySchedules).forEach(key => {
        const day = daySchedules[key];
        transformedSchedules[key] = {
          isOpen: day.isOpen,
          hours: `${day.openHour}:${day.openMinute} - ${day.closeHour}:${day.closeMinute}`
        };
      });
      const openingHoursJson = safeStringify(transformedSchedules);

      const dataToSave = {
        ...formData,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        openingHours: openingHoursJson,
        ownerId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'businesses', id), dataToSave).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `businesses/${id}`); });
      } else {
        await addDoc(collection(db, 'businesses'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        }).catch(e => { throw handleFirestoreError(e, OperationType.CREATE, 'businesses'); });
      }
      navigate('/profile');
    } catch (error: any) {
      console.error("Error saving business:", error);
      let errorMessage = "Ocorreu um erro ao salvar os dados. Por favor, tente novamente.";
      
      if (error.message) {
        try {
          const errorInfo = JSON.parse(error.message);
          const rawError = errorInfo.error || '';
          
          if (rawError.includes('Missing or insufficient permissions')) {
            errorMessage = "Erro de Permissão: Os dados não conferem com as regras de segurança ou você não tem permissão para esta ação. Certifique-se de que todos os campos obrigatórios estão preenchidos corretamente.";
          } else if (rawError.includes('Unsupported field value: undefined')) {
            errorMessage = "Erro de Dados: Algum campo obrigatório não foi preenchido corretamente (valor indefinido). Tente recarregar a página.";
          } else if (rawError.includes('quota exceeded')) {
            errorMessage = "Limite Excedido: O limite diário de uso do sistema foi atingido. Tente novamente amanhã.";
          } else {
            errorMessage = `Detalhes do erro: ${rawError}`;
          }
        } catch (e) {
          if (error.message.includes('addDoc() called with invalid data')) {
            errorMessage = "Erro de Dados: Existem campos vazios ou inválidos no formulário. Verifique as fotos e a localização.";
          } else {
            errorMessage = `Erro: ${error.message}`;
          }
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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">{isEdit ? 'Editar Negócio' : 'Cadastrar Negócio'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner Section - Top as requested */}
        <section className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Banner Principal</label>
          <div 
            onClick={() => bannerInputRef.current?.click()}
            className="relative h-48 bg-slate-100 rounded-[32px] border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:bg-slate-200 transition-all flex flex-col items-center justify-center group"
          >
            {formData.bannerImage ? (
              <>
                <img src={formData.bannerImage} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera size={24} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <Camera size={32} strokeWidth={1.5} />
                <span className="text-[10px] font-black uppercase tracking-widest mt-2">Toque para selecionar</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={bannerInputRef} 
            onChange={(e) => handleImageUpload(e, true)} 
            className="hidden" 
            accept="image/*"
          />
        </section>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Negócio</label>
              <div className="relative mt-1">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all text-slate-800 font-bold"
                  placeholder="Ex: Padaria do João"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all font-bold text-slate-800 appearance-none"
                required
              >
                <option value="" disabled>Selecione a Categoria</option>
                {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all min-h-[120px] text-slate-700 font-medium"
                placeholder="Conte um pouco sobre seu negócio..."
                required
              />
            </div>
          </div>

          {/* Photos Gallery - Max 5 */}
          <section className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Galeria de Fotos (Até 5)</label>
              <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black">
                {formData.images.length}/5
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
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
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all text-slate-400"
                >
                  <Plus size={24} />
                  <span className="text-[8px] font-black uppercase mt-1">Add</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={galleryInputRef} 
              onChange={(e) => handleImageUpload(e, false)} 
              className="hidden" 
              accept="image/*"
              multiple
            />
          </section>

          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary font-bold text-slate-800"
                  placeholder="(27) 3222-2222"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                  className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary font-bold text-slate-800"
                  placeholder="27999887766"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail (Opcional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary font-bold text-slate-800 shadow-inner"
                placeholder="exemplo@email.com"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary text-slate-800 font-bold"
                  placeholder="Ex: R. Paschoal Apóstolo Páschoal, 370"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
              <div className="relative mt-1">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all font-bold text-slate-800 appearance-none"
                  required
                >
                  <option value="" disabled>Selecione a Cidade</option>
                  {ES_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
              <div className="relative mt-1">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 disabled:opacity-50" size={18} />
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all font-bold text-slate-800 disabled:opacity-50"
                  placeholder="Digite o nome do bairro"
                  required
                  disabled={!formData.city}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização (GPS)</label>
              <div className="mt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="w-full py-4 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-all font-bold text-xs"
                >
                  <MapPin size={18} />
                  {formData.latitude ? 'Atualizar Localização GPS' : 'Detectar Minha Localização'}
                </button>
                
                {formData.latitude && (
                  <div className="flex gap-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Coordenadas Ativas</p>
                      <p className="text-[9px] text-emerald-600 font-medium">Lat: {formData.latitude.toFixed(6)} | Lng: {formData.longitude?.toFixed(6)}</p>
                    </div>
                  </div>
                )}
                
                <p className="text-[9px] text-slate-400 font-medium px-1">
                  Recomendado: Ative o GPS no local do estabelecimento para que os usuários saibam a distância exata.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Maps (Opcional)</label>
              <input
                type="url"
                value={formData.mapsUrl}
                onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })}
                className="w-full mt-1 px-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-primary text-slate-600 font-medium"
                placeholder="https://goo.gl/maps/..."
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12} /> Horário de Funcionamento
              </label>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDaySchedules(prev => ({
                        ...prev,
                        [day.key]: { ...prev[day.key], isOpen: !prev[day.key].isOpen }
                      }))}
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                        daySchedules[day.key].isOpen 
                          ? "bg-primary border-primary text-white shadow-sm" 
                          : "bg-white border-slate-100 text-slate-300"
                      )}
                    >
                      <Check size={20} className={cn("transition-transform", daySchedules[day.key].isOpen ? "scale-100" : "scale-0")} />
                    </button>
                    
                    <div className="flex-1">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors",
                        daySchedules[day.key].isOpen ? "text-slate-800" : "text-slate-300"
                      )}>
                        {day.label}
                      </p>
                      
                      <AnimatePresence>
                        {daySchedules[day.key].isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 mt-1.5">
                              {/* Open Time */}
                              <div className="flex-1 flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">De</span>
                                <div className="flex-1 flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                                  <select
                                    value={daySchedules[day.key].openHour}
                                    onChange={(e) => setDaySchedules(prev => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key], openHour: e.target.value }
                                    }))}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none appearance-none w-full text-center"
                                  >
                                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                  </select>
                                  <span className="text-slate-300 font-bold mx-0.5">:</span>
                                  <select
                                    value={daySchedules[day.key].openMinute}
                                    onChange={(e) => setDaySchedules(prev => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key], openMinute: e.target.value }
                                    }))}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none appearance-none w-full text-center"
                                  >
                                    {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div className="w-1.5 h-0.5 bg-slate-200 rounded-full shrink-0" />

                              {/* Close Time */}
                              <div className="flex-1 flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Até</span>
                                <div className="flex-1 flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                                  <select
                                    value={daySchedules[day.key].closeHour}
                                    onChange={(e) => setDaySchedules(prev => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key], closeHour: e.target.value }
                                    }))}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none appearance-none w-full text-center"
                                  >
                                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                  </select>
                                  <span className="text-slate-300 font-bold mx-0.5">:</span>
                                  <select
                                    value={daySchedules[day.key].closeMinute}
                                    onChange={(e) => setDaySchedules(prev => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key], closeMinute: e.target.value }
                                    }))}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none appearance-none w-full text-center"
                                  >
                                    {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-[9px] font-bold text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                ⚠️ Marque os dias que seu negócio abre e preencha o horário de cada dia.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-5 rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} /> {loading ? 'Salvando...' : 'Finalizar e Publicar'}
        </button>
      </form>

      <AnimatePresence>
        {cropper && (
          <ImageCropper
            image={cropper.image}
            aspect={cropper.type === 'banner' ? 16 / 9 : 1}
            onCropComplete={handleCropComplete}
            onCancel={cancelCrop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
