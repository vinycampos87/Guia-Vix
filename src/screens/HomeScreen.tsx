import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, getDocs, limit, where, orderBy } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Phone, 
  Star, 
  ChevronRight, 
  Utensils, 
  Store, 
  HeartPulse, 
  GraduationCap, 
  ShoppingBag, 
  Sparkles, 
  Car, 
  Building2, 
  MoreHorizontal,
  ChevronLeft,
  Wrench,
  Pizza,
  Home as HomeIcon,
  Heart
} from 'lucide-react';
import { Business, BUSINESS_CATEGORIES } from '../types';
import { isBoosted, calculateDistance, formatDistance, cn } from '../lib/utils';
import { useFavorites } from '../hooks/useFavorites';
import LocationPermissionModal from '../components/LocationPermissionModal';

const CATEGORY_ICONS: Record<string, any> = {
  "Restaurante": Utensils,
  "Lanchonete": Pizza,
  "Serviços": Wrench,
  "Saúde": HeartPulse,
  "Educação": GraduationCap,
  "Moda": ShoppingBag,
  "Beleza": Sparkles,
  "Automotivo": Car,
  "Imobiliária": Building2,
  "Outros": MapPin
};

export default function HomeScreen() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [banners, setBanners] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const normalize = (text: string) => 
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch more to ensure we have enough featured and regular
        const q = query(collection(db, 'businesses'), limit(40));
        const querySnapshot = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'businesses'); });
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
        setBusinesses(data);
        
        // Random selection logic: 5 Premium + 5 Regular
        const allPremium = data.filter(b => isBoosted(b)).sort(() => 0.5 - Math.random());
        const allRegular = data.filter(b => !isBoosted(b)).sort(() => 0.5 - Math.random());
        
        const selectedPremium = allPremium.slice(0, 5);
        const selectedRegular = allRegular.slice(0, 5);
        
        // Ensure Premiums are the first 5 slides as requested
        const combinedBanners = [...selectedPremium, ...selectedRegular];
        setBanners(combinedBanners);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Check if we should show the location explanation modal
    const hasPrompted = localStorage.getItem('location_prompted');
    if (!hasPrompted && "geolocation" in navigator) {
      // Small delay for better UX
      setTimeout(() => {
        setShowLocationModal(true);
      }, 1500);
    } else if ("geolocation" in navigator) {
      // If already prompted or refused before, we can try to get it quietly if permission exists
      // or just wait. Here we'll try to get it if they already gave permission once.
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {}, // Silently fail if they previously denied
        { timeout: 5000 }
      );
    }
  }, []);

  const handleRequestLocation = () => {
    localStorage.setItem('location_prompted', 'true');
    setShowLocationModal(false);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  const filteredData = businesses.filter(b => {
    const normSearch = normalize(searchTerm);
    const matchesSearch = !searchTerm || 
      normalize(b.name).includes(normSearch) || 
      normalize(b.description || '').includes(normSearch);
    
    const matchesCategory = !selectedCategory || b.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredList = filteredData.filter(b => isBoosted(b));
  const regularBusinesses = filteredData
    .filter(b => !isBoosted(b))
    .sort((a, b) => {
      if (userLocation) {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      }
      return 0;
    });

  return (
    <div className="flex flex-col gap-6 p-4 overflow-x-hidden pb-32">
      <LocationPermissionModal 
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          localStorage.setItem('location_prompted', 'true');
        }}
        onConfirm={handleRequestLocation}
      />
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="O que você procura em Vitória?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
        />
      </div>

      {/* Banner Carousel */}
      {!loading && banners.length > 0 && (
        <div className="relative h-44 md:h-72 lg:h-96 rounded-[28px] overflow-hidden shadow-xl border border-white/20 bg-slate-100">
          {banners.map((banner, index) => (
            index === currentBanner && (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Link to={`/business/${banner.id}`} className="block w-full h-full">
                  <img
                    src={banner.bannerImage}
                    alt={banner.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2 mb-1">
                      {banner.isFeatured ? (
                        <>
                          <Star size={10} className="text-accent fill-accent" />
                          <span className="text-accent text-[10px] font-black uppercase tracking-[2px]">Anunciante Premium</span>
                        </>
                      ) : (
                        <span className="text-white/60 text-[10px] font-black uppercase tracking-[2px]">Recomendado</span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">{banner.name}</h3>
                  </div>
                </Link>
              </motion.div>
            )
          ))}
          <div className="absolute bottom-4 right-5 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentBanner === i ? 'bg-white w-4' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categories Horizontal Scroll */}
      <section className="bg-white/60 backdrop-blur-sm -mx-4 px-4 py-4 md:mx-0 md:rounded-[32px] md:border border-y border-white/20">
        <div className="flex overflow-x-auto md:justify-center gap-6 no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all border ${!selectedCategory ? 'bg-primary border-primary text-white' : 'bg-white border-slate-50 text-slate-400'}`}>
              <HomeIcon size={24} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${!selectedCategory ? 'text-primary' : 'text-slate-600'}`}>Tudo</span>
          </button>

          {BUSINESS_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || MapPin;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(prev => prev === cat ? null : cat)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all border ${isActive ? 'bg-primary border-primary text-white' : 'bg-white border-slate-50 text-slate-400'}`}>
                  <Icon size={24} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-primary' : 'text-slate-600'}`}>{cat}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Premium Featured Section */}
      {!loading && featuredList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 text-primary">
              <Star size={16} className="fill-primary" /> Parceiros Premium
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
            {featuredList.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Link
                  to={`/business/${b.id}`}
                  className="block group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 h-full"
                >
                  <div className="relative h-40">
                    <img
                      src={b.bannerImage}
                      alt={b.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(b);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/20 backdrop-blur-md text-white border border-white/40",
                          favorites[b.id] && "bg-white text-red-500 border-white shadow-lg"
                        )}
                      >
                        <Heart size={16} fill={favorites[b.id] ? "currentColor" : "none"} strokeWidth={2.5} />
                      </button>
                      <div className="bg-accent text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg self-center">
                        Destaque
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{b.name}</h3>
                    <p className="text-slate-400 text-[10px] font-medium mt-1 truncate">{b.category} • Vitória</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Businesses */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" /> Próximo a você
          </h2>
          <Link to="/businesses" className="text-primary text-[11px] font-bold uppercase tracking-tight">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-40 bg-white/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : regularBusinesses.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {regularBusinesses.map((b, index) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/business/${b.id}`}
                  className="bg-white p-2.5 rounded-2xl shadow-sm border border-white/30 flex flex-col gap-2.5 hover:shadow-md transition-all active:scale-[0.98] h-full"
                >
                  <div className="relative">
                    <img
                      src={b.bannerImage}
                      alt={b.name}
                      className="w-full h-32 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(b);
                      }}
                      className={cn(
                        "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-md",
                        favorites[b.id] ? "bg-white text-red-500 shadow-lg" : "bg-black/20 text-white border border-white/20"
                      )}
                    >
                      <Heart size={14} fill={favorites[b.id] ? "currentColor" : "none"} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="px-1 pb-1">
                    <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-1">{b.name}</h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="text-[10px] text-slate-400 font-bold">
                        {userLocation && b.latitude ? (
                          <>
                            {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude))} • ⭐ {b.rating?.toFixed(1) || '4.0'}
                          </>
                        ) : (
                          <>⭐ {b.rating?.toFixed(1) || '4.0'}</>
                        )}
                      </div>
                      <div className="text-primary">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass rounded-[32px]">
            <p className="text-slate-400 text-sm font-medium">Nenhum negócio encontrado.</p>
          </div>
        )}
      </section>
    </div>
  );
}
