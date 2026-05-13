import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, setDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MapPin, Phone, MessageCircle, Share2, Star, Globe, Clock, Info, Send, User as UserIcon, Mail, X, Heart, Edit2, Trash2, Save, Landmark, Instagram, Facebook, Linkedin } from 'lucide-react';
import { Business, Review } from '../types';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { shareItem } from '../lib/share';
import BoostHighlight from '../components/BoostHighlight';
import { useFavorites } from '../hooks/useFavorites';
import SEO from '../components/SEO';

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
  const [editingPersonalReview, setEditingPersonalReview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const personalReview = useMemo(() => {
    return user ? reviews.find(r => r.userId === user.uid) : null;
  }, [user, reviews]);

  useEffect(() => {
    if (personalReview && !editingPersonalReview) {
      setUserRating(personalReview.rating);
      setComment(personalReview.comment);
    }
  }, [personalReview, editingPersonalReview]);

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
    return !!personalReview;
  }, [personalReview]);

  const handleDeleteReview = async () => {
    if (!user || !id || !business || !personalReview) return;
    if (!confirm("Tem certeza que deseja excluir sua avaliação?")) return;

    setSubmittingReview(true);
    try {
      await deleteDoc(doc(db, 'businesses', id, 'reviews', user.uid));

      // Recalculate Business Rating
      const newReviews = reviews.filter(r => r.userId !== user.uid);
      const newCount = newReviews.length;
      const newRating = newCount > 0 
        ? newReviews.reduce((acc, r) => acc + r.rating, 0) / newCount 
        : 0;

      await updateDoc(doc(db, 'businesses', id), {
        rating: newRating,
        reviewCount: newCount
      }).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `businesses/${id}`); });

      setUserRating(0);
      setComment('');
      setEditingPersonalReview(false);
      alert("Avaliação excluída com sucesso!");
    } catch (error: any) {
      console.error("Error deleting review:", error instanceof Error ? error.message : String(error));
      let errorMessage = "Erro ao excluir avaliação.";
      
      if (error.message) {
        try {
          const errorInfo = JSON.parse(error.message);
          if (errorInfo.error && errorInfo.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Erro de Permissão: Você não tem permissão para esta ação ou as regras do sistema bloquearam a exclusão (talvez o negócio original estivesse com dados inválidos).";
          } else if (errorInfo.error) {
            errorMessage = `Erro detalhado: ${errorInfo.error}`;
          }
        } catch (e) {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      alert(errorMessage);
    } finally {
      setSubmittingReview(false);
    }
  };

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
        createdAt: personalReview ? (personalReview.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: personalReview ? serverTimestamp() : null
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
      }).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `businesses/${id}`); });

      if (!personalReview) {
        setUserRating(0);
        setComment('');
      }
      setEditingPersonalReview(false);
      alert(personalReview ? "Avaliação atualizada!" : "Avaliação enviada com sucesso!");
    } catch (error: any) {
      console.error("Error submitting review:", error instanceof Error ? error.message : String(error));
      let errorMessage = "Erro ao enviar avaliação.";
      
      if (error.message) {
        try {
          const errorInfo = JSON.parse(error.message);
          if (errorInfo.error && errorInfo.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Erro de Permissão: Você não tem permissão ou as regras de negócio bloquearam (talvez o negócio tenha dados inválidos ou faltando informações legadas).";
          } else if (errorInfo.error) {
            errorMessage = `Erro detalhado: ${errorInfo.error}`;
          }
        } catch (e) {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      alert(errorMessage);
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
      <SEO 
        title={`${business.name} | Guia VIX`}
        description={business.description?.substring(0, 160)}
        ogImage={business.bannerImage}
        keywords={`${business.category}, ${business.name}, ${business.neighborhood}, vitória, es, guia comercial`}
        type="business.business"
      />
      <BoostHighlight expiresAt={business.boostExpiresAt} />
      
      {/* Header Image */}
      <div className="relative h-72 md:h-[450px]">
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
            className="p-1 px-1.5 bg-black/30 backdrop-blur-md rounded-xl text-white hover:bg-black/50 transition-all border border-white/20 active:scale-95 shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => toggleFavorite(business)}
              className={cn(
                "p-1 px-2 backdrop-blur-md rounded-xl transition-all border active:scale-95 shadow-sm",
                favorites[business.id] 
                  ? "bg-white text-red-500 border-white shadow-md" 
                  : "bg-black/30 text-white border-white/20 hover:bg-black/50"
              )}
            >
              <Heart size={18} fill={favorites[business.id] ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>

            <button 
              onClick={() => shareItem(business.name, business.description)}
              className="p-1 px-2 bg-black/30 backdrop-blur-md rounded-xl text-white hover:bg-black/50 transition-all border border-white/20 active:scale-95 shadow-sm"
            >
              <Share2 size={18} />
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
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md mb-2">{business.name}</h1>
          <div className="flex items-center gap-2 drop-shadow-md">
            <span className="text-white font-black text-sm">{Number(avgRating) > 0 ? avgRating : 'Novo'}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  size={14} 
                  className={s <= Number(avgRating) ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-300"} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 pb-28">
        
        {/* Left Column: Info & Content */}
        <div className="md:col-span-8 flex flex-col gap-8">
          
          {/* Quick Info Card */}
          <div className="bg-white rounded-[32px] p-4 sm:p-6 shadow-xl shadow-slate-200 border border-slate-100 flex flex-wrap items-start sm:items-center justify-center gap-x-1 sm:gap-x-6 gap-y-6 md:gap-x-8">
            <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
              <div className={`w-12 h-12 ${isOpen === true ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} rounded-2xl flex items-center justify-center shadow-inner`}>
                <Clock size={24} />
              </div>
              <span className={`text-[9px] sm:text-xs font-black uppercase tracking-widest ${isOpen === true ? 'text-emerald-600' : 'text-rose-600'} text-center scale-90 sm:scale-100 w-full truncate`}>
                {isOpen === true ? 'Aberto' : isOpen === false ? 'Fechado' : 'Checar'}
              </span>
            </div>

            {business.phone && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={`tel:${business.phone}`}
                  className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner hover:text-primary transition-colors"
                >
                  <Phone size={24} />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-slate-400 text-center scale-90 sm:scale-100 w-full truncate">Ligar</span>
              </div>
            )}

            {business.whatsapp && (
              <div className="flex flex-col items-center gap-1.5 group w-[64px] sm:w-[84px]">
                <a 
                  href={`https://wa.me/55${business.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#25D366]/20 hover:scale-110 transition-all transform duration-300"
                  title="WhatsApp"
                >
                  {/* WhatsApp Original Logo SVG */}
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-[#25D366] text-center scale-90 sm:scale-100 w-full truncate">WhatsApp</span>
              </div>
            )}

            {business.email && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={`mailto:${business.email}`}
                  className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner hover:scale-105 transition-all text-center"
                >
                  <Mail size={24} />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-blue-500 text-center scale-90 sm:scale-100 w-full truncate">E-mail</span>
              </div>
            )}

            {business.ifoodUrl && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={business.ifoodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#ea1d2c] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ea1d2c]/20 hover:scale-110 transition-all text-white p-2"
                >
                  <img 
                    src="https://cdn-1.webcatalog.io/catalog/ifood/ifood-icon-filled-256.webp?v=1714774711502" 
                    alt="iFood" 
                    className="w-full h-full object-contain" 
                  />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-[#ea1d2c] text-center scale-90 sm:scale-100 w-full truncate">iFood</span>
              </div>
            )}

            {business.instagram && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={business.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20 hover:scale-110 transition-all text-center"
                >
                  <Instagram size={24} />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-pink-600 text-center scale-90 sm:scale-100 w-full truncate">Instagram</span>
              </div>
            )}

            {business.facebook && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={business.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#1877F2] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1877F2]/20 hover:scale-110 transition-all text-center p-2"
                >
                  <Facebook size={24} className="fill-current" />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-[#1877F2] text-center scale-90 sm:scale-100 w-full truncate">Facebook</span>
              </div>
            )}

            {business.linkedin && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={business.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#0A66C2] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#0A66C2]/20 hover:scale-110 transition-all text-center p-2"
                >
                  <Linkedin size={24} className="fill-current" />
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-[#0A66C2] text-center scale-90 sm:scale-100 w-full truncate">LinkedIn</span>
              </div>
            )}

            {business.tiktok && (
              <div className="flex flex-col items-center gap-1.5 w-[64px] sm:w-[84px]">
                <a 
                  href={business.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 hover:scale-110 transition-all text-white p-2.5"
                >
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-white" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.08z"/></svg>
                </a>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-black text-center scale-90 sm:scale-100 w-full truncate">TikTok</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* About */}
            {business.description && (
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <Info size={18} />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Sobre o Negócio</h2>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed font-medium break-words whitespace-pre-wrap">
                  {business.description}
                </p>
              </section>
            )}

            {/* Gallery */}
            {business.images && business.images.length > 0 && (
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 tracking-tight mb-4">Galeria de Fotos</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {business.images.map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      className="w-full h-44 object-cover rounded-2xl shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in" 
                      referrerPolicy="no-referrer"
                      onClick={() => setSelectedImage(img)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Opening Hours */}
            {business.openingHours && (
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                    <Clock size={22} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Horários</h2>
                </div>
                
                {scheduleData ? (
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayInfo = scheduleData[day.key];
                      const isToday = new Date().getDay() === (DAYS_OF_WEEK.findIndex(d => d.key === day.key) + 1) % 7;
                      
                      return (
                        <div key={day.key} className={cn(
                          "flex justify-between items-center text-sm py-2.5 px-4 rounded-2xl transition-colors",
                          isToday ? "bg-primary/5 text-primary" : "text-slate-600 border border-transparent"
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
                    {business.openingHours}
                  </p>
                )}
              </section>
            )}

            {/* Location Area */}
            {business.address && (
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                    <MapPin size={22} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Endereço</h2>
                </div>
                <div className="space-y-5">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p className="text-slate-700 font-bold text-sm leading-relaxed mb-1">
                      {business.address}
                    </p>
                    <p className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
                      <Landmark size={12} /> {business.neighborhood}, {business.city || 'Vitória'}
                    </p>
                  </div>
                  {business.mapsUrl && (
                    <a 
                      href={business.mapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-white border border-slate-200 text-slate-800 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-center shadow-sm hover:bg-slate-50 transition-all block"
                    >
                      Abrir no Google Maps
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Mobile Contact Actions */}
            {(business.phone || business.whatsapp || business.website || business.ifoodUrl) && (
              <div className={cn(
                "md:hidden grid gap-3 py-4",
                (business.phone && business.whatsapp) || (business.phone && business.website) || (business.whatsapp && business.website) ? "grid-cols-2" : "grid-cols-1"
              )}>
                {business.phone && (
                  <a 
                    href={`tel:${business.phone}`}
                    className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 transition-all text-xs"
                  >
                    <Phone size={18} /> Ligar
                  </a>
                )}
                {business.whatsapp && (
                  <a 
                    href={`https://wa.me/55${business.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30 active:scale-95 transition-all text-xs"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg> WhatsApp
                  </a>
                )}
                {business.ifoodUrl && (
                  <a 
                    href={business.ifoodUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="col-span-full bg-[#ea1d2c] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ea1d2c]/20 active:scale-95 transition-all text-xs"
                  >
                    <img 
                      src="https://cdn-1.webcatalog.io/catalog/ifood/ifood-icon-filled-256.webp?v=1714774711502" 
                      alt="iFood" 
                      className="w-6 h-6 object-contain" 
                    /> Pedir no iFood
                  </a>
                )}
                {business.website && (
                  <a 
                    href={business.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="col-span-full bg-white border border-slate-200 text-slate-800 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-xs"
                  >
                    <Globe size={18} /> Visitar Site
                  </a>
                )}
              </div>
            )}

            {/* Reviews Section */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Avaliações</h2>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-black uppercase">
                  {reviews.length} Feedbacks
                </span>
              </div>

              {user ? (
                hasReviewed && !editingPersonalReview ? (
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black">
                          {user.displayName?.charAt(0) || profile?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-amber-900 text-sm font-black uppercase tracking-tight">Sua Avaliação</p>
                          <div className="flex text-amber-400 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={12} fill={s <= (personalReview?.rating || 0) ? 'currentColor' : 'none'} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingPersonalReview(true)}
                          className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={handleDeleteReview}
                          disabled={submittingReview}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="text-amber-800 text-sm font-medium italic bg-white/50 p-4 rounded-2xl border border-amber-100/50">
                      "{personalReview?.comment}"
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReview} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                      {editingPersonalReview && (
                        <button 
                          type="button"
                          onClick={() => setEditingPersonalReview(false)}
                          className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                        >
                          Cancelar Edição
                        </button>
                      )}
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
                        {editingPersonalReview ? <Save size={18} /> : <Send size={18} />}
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
                  <div key={r.id} className="flex gap-4 items-start border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                      <UserIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{r.userName}</h4>
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} fill={s <= r.rating ? 'currentColor' : 'none'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm font-medium leading-relaxed">{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <aside className="md:col-span-4 flex flex-col gap-6">
          {/* Desktop Contact Card */}
          <div className="hidden md:flex flex-col gap-6 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Contato e Reservas</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fale agora mesmo</p>
            </div>

            <div className="space-y-3">
              {business.whatsapp && (
                <a 
                  href={`https://wa.me/55${business.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg> WhatsApp
                </a>
              )}
              {business.phone && (
                <a 
                  href={`tel:${business.phone}`}
                  className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Phone size={20} /> Ligar
                </a>
              )}
              {business.ifoodUrl && (
                <a 
                  href={business.ifoodUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-[#ea1d2c] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-[#ea1d2c]/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <img 
                    src="https://cdn-1.webcatalog.io/catalog/ifood/ifood-icon-filled-256.webp?v=1714774711502" 
                    alt="iFood" 
                    className="w-7 h-7 object-contain" 
                  /> Pedir no iFood
                </a>
              )}
              {business.website && (
                <a 
                  href={business.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-white border border-slate-200 text-slate-800 p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold"
                >
                  <Globe size={20} /> Visitar Site
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center p-2 md:p-10 pointer-events-none"
            >
              <img 
                src={selectedImage} 
                className="max-w-full max-h-full object-contain pointer-events-auto shadow-2xl rounded-lg md:rounded-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10 pointer-events-auto"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
