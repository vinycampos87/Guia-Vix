import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, setDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MapPin, Phone, MessageCircle, Share2, Star, Globe, Clock, Info, Send, User as UserIcon, Mail, X, Heart } from 'lucide-react';
import { Business, Review } from '../types';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import BoostHighlight from '../components/BoostHighlight';
import { useFavorites } from '../hooks/useFavorites';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

export default function BusinessDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBusiness = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'businesses', id));
        if (docSnap.exists()) {
          setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
        }
      } catch (e) {
        console.error("Error fetching business:", e);
      }
      setLoading(false);
    };

    const q = query(collection(db, 'businesses', id, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    });

    fetchBusiness();
    return () => unsubscribe();
  }, [id]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const scheduleData = useMemo(() => {
    if (!business?.openingHours) return null;
    try {
      const parsed = JSON.parse(business.openingHours);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }, [business?.openingHours]);

  const isOpen = useMemo(() => {
    if (!business?.openingHours) return null;
    
    const now = new Date();
    const time = now.getHours() * 60 + now.getMinutes();
    
    if (scheduleData) {
      const daysMap: Record<number, string> = {
        0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
      };
      const todayKey = daysMap[now.getDay()];
      const dayInfo = scheduleData[todayKey];
      
      if (!dayInfo || !dayInfo.isOpen || !dayInfo.hours) return false;
      
      const match = dayInfo.hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match) {
        const start = parseInt(match[1]) * 60 + parseInt(match[2]);
        const end = parseInt(match[3]) * 60 + parseInt(match[4]);
        return time >= start && time <= end;
      }
      return true;
    }

    try {
      // Basic parser for "HH:mm - HH:mm" fallback
      const match = business.openingHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match) {
        const start = parseInt(match[1]) * 60 + parseInt(match[2]);
        const end = parseInt(match[3]) * 60 + parseInt(match[4]);
        return time >= start && time <= end;
      }
      return null;
    } catch {
      return null;
    }
  }, [business?.openingHours, scheduleData]);

  const hasReviewed = useMemo(() => {
    return user && reviews.some(r => r.userId === user.uid);
  }, [user, reviews]);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || userRating === 0 || !id || !business) return;
    
    if (hasReviewed) {
      alert("Você já avaliou esta empresa! Você pode editar ou excluir sua avaliação no seu perfil.");
      return;
    }

    setSubmittingReview(true);

    try {
      const reviewData = {
        userId: user.uid,
        userName: profile?.name || 'Usuário',
        rating: userRating,
        comment,
        businessId: id,
        businessName: business.name,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'businesses', id, 'reviews', user.uid), reviewData);

      // Refresh Average Rating
      const newReviews = [...reviews.filter(r => r.userId !== user.uid), { ...reviewData, id: user.uid, createdAt: new Date() } as Review];
      const newCount = newReviews.length;
      const sum = newReviews.reduce((acc, r) => acc + r.rating, 0);
      const newRating = sum / newCount;

      await updateDoc(doc(db, 'businesses', id), {
        rating: newRating,
        reviewCount: newCount
      });

      setUserRating(0);
      setComment('');
      alert("Avaliação enviada com sucesso!");
    } catch (e) {
      console.error("Error submitting review:", e);
      alert("Erro ao enviar avaliação.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!business) return <div className="p-8 text-center text-slate-500 font-medium">Negócio não encontrado.</div>;

  return (
    <div className="relative pb-10">
      <BoostHighlight expiresAt={business.boostExpiresAt} />
      <div>
        {/* Header Image */}
        <div className="relative h-72">
          <img
            src={business.bannerImage}
            alt={business.name}
            className="w-full h-full object-cover cursor-zoom-in"
            referrerPolicy="no-referrer"
            onClick={() => setSelectedImage(business.bannerImage)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/20 pointer-events-none" />
          
          <div className={cn(
            "absolute left-6 right-6 flex justify-between items-center z-40 transition-all duration-300",
            business.boostExpiresAt ? "top-14" : "top-6"
          )}>
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white/20 backdrop-blur-lg rounded-2xl text-white hover:bg-white/40 transition-all border border-white/30 active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (business) toggleFavorite(business);
                }}
                className={cn(
                  "p-2.5 backdrop-blur-lg rounded-2xl transition-all border active:scale-95",
                  favorites[business.id] 
                    ? "bg-white text-red-500 border-white shadow-lg" 
                    : "bg-white/20 text-white border-white/30 hover:bg-white/40"
                )}
              >
                <Heart size={24} fill={favorites[business.id] ? "currentColor" : "none"} strokeWidth={2.5} />
              </button>

              <button className="p-2.5 bg-white/20 backdrop-blur-lg rounded-2xl text-white hover:bg-white/40 transition-all border border-white/30 active:scale-95">
                <Share2 size={24} />
              </button>
            </div>
          </div>
  
          <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
            <div className="flex gap-2 mb-2 items-center">
              <span className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">
                {business.category}
              </span>
              {business.isFeatured && (
                <span className="bg-amber-400 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-400/30 flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Premium
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none drop-shadow-md">{business.name}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 -mt-6 relative z-10 flex flex-col gap-6 pb-28">
        {/* Quick Info Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200 border border-slate-100 flex items-center justify-around">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
              <Star size={24} fill="currentColor" />
            </div>
            <span className="text-sm font-black text-slate-800">{Number(avgRating) > 0 ? avgRating : 'Novo'}</span>
          </div>

          <div className="w-[1px] h-12 bg-slate-100" />

          <div className="flex flex-col items-center gap-1">
            <div className={`w-12 h-12 ${isOpen === true ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} rounded-2xl flex items-center justify-center shadow-inner`}>
              <Clock size={24} />
            </div>
            <span className={`text-sm font-black ${isOpen === true ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isOpen === true ? 'Aberto' : isOpen === false ? 'Fechado' : 'Checar'}
            </span>
          </div>

          <div className="w-[1px] h-12 bg-slate-100" />

          <div className="flex flex-col items-center gap-1">
            <a 
              href={`https://wa.me/55${business.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner hover:scale-105 active:scale-95 transition-all"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Zap</span>
          </div>

          <div className="w-[1px] h-12 bg-slate-100" />

          <div className="flex flex-col items-center gap-1">
            {business.email ? (
              <a 
                href={`mailto:${business.email}`}
                className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner hover:scale-105 active:scale-95 transition-all"
              >
                <Mail size={24} />
              </a>
            ) : (
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner">
                <Mail size={24} />
              </div>
            )}
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</span>
          </div>
        </div>

        {/* Business Hours */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Clock size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Horários</h2>
          </div>
          
          {scheduleData ? (
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayInfo = scheduleData[day.key];
                const isToday = new Date().getDay() === (DAYS_OF_WEEK.findIndex(d => d.key === day.key) + 1) % 7;
                
                return (
                  <div key={day.key} className={cn(
                    "flex justify-between items-center text-sm py-1 px-3 rounded-xl transition-colors",
                    isToday ? "bg-primary/5 text-primary" : "text-slate-600"
                  )}>
                    <span className={cn("font-bold", isToday ? "font-black" : "")}>{day.label}</span>
                    <span className={cn("font-medium", dayInfo?.isOpen ? "text-slate-800" : "text-slate-400")}>
                      {dayInfo?.isOpen ? dayInfo.hours : 'Fechado'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm font-medium">
              {business.openingHours || 'Consulte o estabelecimento para informações de horários.'}
            </p>
          )}
        </section>

        {/* About */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Info size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Sobre o Negócio</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed font-medium break-words">
            {business.description}
          </p>
        </section>

        {/* Gallery */}
        {business.images && business.images.length > 0 && (
          <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-4">Galeria de Fotos</h2>
            <div className="grid grid-cols-2 gap-3">
              {business.images.map((img, i) => (
                <img 
                  key={i} 
                  src={img} 
                  className="w-full h-40 object-cover rounded-2xl shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in" 
                  referrerPolicy="no-referrer"
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Location */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <MapPin size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Onde Encontrar</h2>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700 font-bold bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-snug">
              {business.address}
            </p>
            {business.mapsUrl && (
              <a 
                href={business.mapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-primary/5 text-primary py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center border border-primary/10 active:scale-95 transition-all"
              >
                Abrir no Google Maps
              </a>
            )}
          </div>
        </section>

        {/* Action Buttons - Moved here from fixed footer */}
        <div className="flex gap-3 py-4">
          <a 
            href={`tel:${business.phone}`}
            className="flex-1 bg-white border border-slate-200 text-slate-800 py-4 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-[10px]"
          >
            <Phone size={18} /> Ligar
          </a>
          <a 
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
            className="flex-[2] bg-emerald-500 text-white py-4 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-[10px]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg> WhatsApp
          </a>
        </div>

        {/* Reviews Section */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Avaliações</h2>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-black uppercase">
              {reviews.length} Feedbacks
            </span>
          </div>

          {user ? (
            hasReviewed ? (
              <div className="bg-amber-50 p-6 rounded-3xl text-center border border-amber-100">
                <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star size={24} fill="currentColor" />
                </div>
                <p className="text-amber-800 text-sm font-bold leading-tight">Você já avaliou esta empresa.</p>
                <p className="text-amber-600 text-[10px] mt-1 uppercase font-black tracking-widest">Gerencie através do seu perfil</p>
                <button 
                  onClick={() => navigate('/profile')}
                  className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20"
                >
                  Ir para o Perfil
                </button>
              </div>
            ) : (
              <form onSubmit={handleReview} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className={`transition-all hover:scale-110 ${star <= userRating ? 'text-amber-400' : 'text-slate-300'}`}
                  >
                    <Star size={24} fill={star <= userRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea
                  placeholder="Escreva sua avaliação..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-white border-none rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary h-24 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={submittingReview || userRating === 0}
                  className="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-xl shadow-lg disabled:opacity-50 hover:bg-primary/90 active:scale-90 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          )
        ) : (
            <div className="bg-slate-50 p-6 rounded-3xl text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Faça login para avaliar</p>
              <button 
                onClick={() => navigate('/auth')}
                className="bg-primary text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Logar Agora
              </button>
            </div>
          )}

          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <UserIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 text-xs truncate uppercase tracking-tight">{r.userName}</h4>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={10} fill={s <= r.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 text-[11px] font-medium leading-relaxed mt-1">{r.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>

    {/* Image Preview Modal */}
    <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md aspect-square rounded-[32px] overflow-hidden shadow-2xl"
            >
              <img 
                src={selectedImage} 
                className="w-full h-full object-contain bg-slate-800"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all border border-white/20"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
