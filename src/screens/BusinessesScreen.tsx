import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  ChevronLeft, 
  Filter, 
  Star, 
  Utensils, 
  Store, 
  HeartPulse, 
  GraduationCap, 
  ShoppingBag, 
  Sparkles, 
  Car, 
  Building2, 
  MoreHorizontal,
  Landmark,
  X,
  Heart
} from 'lucide-react';
import { Business, BUSINESS_CATEGORIES, ES_CITIES } from '../types';
import { cn, isBoosted, calculateDistance, formatDistance } from '../lib/utils';
import { useFavorites } from '../hooks/useFavorites';

const CATEGORY_EMOJIS: Record<string, string> = {
  "Restaurante": "🍽️",
  "Lanchonete": "🍔",
  "Serviços": "🛠️",
  "Saúde": "🏥",
  "Educação": "🎓",
  "Moda": "🛍️",
  "Beleza": "✨",
  "Automotivo": "🚗",
  "Imobiliária": "🏢",
  "Outros": "📍"
};

export default function BusinessesScreen() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('Todas as Cidades');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  const normalize = (text: string) => 
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'businesses'); });
        setBusinesses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business)));
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Error getting user location:", error)
      );
    }
  }, []);

  const filteredBusinesses = useMemo(() => {
    const filtered = businesses.filter(b => {
      const normSearch = normalize(searchTerm);
      const matchesSearch = !searchTerm || 
                            normalize(b.name).includes(normSearch) || 
                            normalize(b.description || '').includes(normSearch) ||
                            normalize(b.neighborhood || '').includes(normSearch);
      const matchesCategory = !selectedCategory || b.category === selectedCategory;
      const matchesCity = selectedCity === 'Todas as Cidades' || b.city === selectedCity;
      return matchesSearch && matchesCategory && matchesCity;
    });

    return [...filtered].sort((a, b) => {
      const aBoosted = isBoosted(a);
      const bBoosted = isBoosted(b);

      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      // If user location is available, sort items within the same category (premium/regular) by distance
      if (userLocation) {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        if (distA !== distB) return distA - distB;
      }

      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [businesses, searchTerm, selectedCategory, selectedCity, userLocation]);

  return (
    <div className="flex flex-col min-h-full bg-slate-50 overflow-x-hidden pb-32">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-4 shadow-sm relative z-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Empresas na Grande Vitória</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Explore o comércio local</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="O que você está procurando?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-slate-700 text-sm"
          />
        </div>

        {/* City/Neighborhood Selector Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-black text-[11px] uppercase tracking-widest text-primary appearance-none"
            >
              <option value="Todas as Cidades">Todas as Cidades</option>
              {ES_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Categories Scroll */}
      <div className="bg-white border-b border-slate-100 pb-2 sticky top-0 z-10 overflow-x-auto no-scrollbar">
        <div className="flex px-6 gap-3 py-4 min-w-max">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
              !selectedCategory ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
            )}
          >
            Todos
          </button>
          {BUSINESS_CATEGORIES.map((cat) => {
            const emoji = CATEGORY_EMOJIS[cat] || "📍";
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                  selectedCategory === cat ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                )}
              >
                <span>{emoji}</span>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 bg-white rounded-[32px] animate-pulse" />
          ))
        ) : filteredBusinesses.length > 0 ? (
          filteredBusinesses.map((b) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={b.id}
              className="h-full"
            >
              <Link to={`/business/${b.id}`} className="block h-full">
                <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group active:scale-[0.98] h-full flex flex-col">
                  <div className="flex p-3 gap-4 flex-1">
                    <div className="relative shrink-0">
                      <img 
                        src={b.bannerImage} 
                        className="w-24 h-24 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {isBoosted(b) && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                          <Star size={10} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                            {b.category}
                          </span>
                          {isBoosted(b) && (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              Destaque
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(b);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            favorites[b.id] ? "bg-red-50 text-red-500 shadow-sm" : "bg-slate-50 text-slate-300 hover:text-slate-400"
                          )}
                        >
                          <Heart size={16} fill={favorites[b.id] ? "currentColor" : "none"} strokeWidth={2.5} />
                        </button>
                      </div>
                      <h3 className="text-sm font-black text-slate-800 truncate leading-tight group-hover:text-primary transition-colors">{b.name}</h3>
                      <div className="flex items-center gap-1 text-slate-400 mt-1">
                        <MapPin size={10} className="shrink-0" />
                        <span className="text-[10px] font-bold truncate opacity-80">
                          {userLocation && b.latitude ? (
                            <span className="text-primary font-black">{formatDistance(calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude))} • </span>
                          ) : null}
                          {b.neighborhood || b.city || 'ES'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= (b.rating || 0) ? 'currentColor' : 'none'} className="stroke-[3px]" />)}
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">({b.reviewCount || 0})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full border-2 border-dashed border-slate-200 py-20 text-center glass rounded-[40px]">
            <div className="w-16 h-16 bg-slate-100 mx-auto rounded-full flex items-center justify-center mb-4 text-slate-300">
              <Search size={32} />
            </div>
            <h3 className="font-black text-slate-800 tracking-tight">Nenhum resultado</h3>
            <p className="text-xs font-medium text-slate-400 mt-1 px-8">Não encontramos nenhuma empresa que corresponda aos filtros selecionados.</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory(null);
                setSelectedCity('Todas as Cidades');
              }}
              className="mt-6 text-primary font-black text-[10px] uppercase tracking-widest underline underline-offset-4"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
