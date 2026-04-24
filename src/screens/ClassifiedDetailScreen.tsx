import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Phone, MapPin, Tag, Share2, User, UserCircle, Edit2, Trash2, X } from 'lucide-react';
import { Classified } from '../types';
import { cn } from '../lib/utils';
import { shareItem } from '../lib/share';
import BoostHighlight from '../components/BoostHighlight';

export default function ClassifiedDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad, setAd] = useState<Classified | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchAd = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'classifieds', id));
        if (docSnap.exists()) {
          const adData = { id: docSnap.id, ...docSnap.data() } as Classified;
          setAd(adData);
          
          // Fetch owner details
          if (adData.ownerId) {
            const ownerSnap = await getDoc(doc(db, 'users', adData.ownerId));
            if (ownerSnap.exists()) {
              setOwnerProfile(ownerSnap.data());
            }
          }
        }
      } catch (e) {
        console.error("Error fetching ad:", e);
      }
      setLoading(false);
    };

    fetchAd();
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!ad) return <div className="p-8 text-center text-slate-500 font-medium">Anúncio não encontrado.</div>;

  const handleShare = async () => {
    shareItem(ad.title, ad.description);
  };

  const handleDelete = async () => {
    if (!id || !user || ad.ownerId !== user.uid) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'classifieds', id));
      navigate('/classifieds');
    } catch (error) {
      console.error("Error deleting:", error instanceof Error ? error.message : String(error));
      alert("Erro ao excluir anúncio.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative pb-32">
      <BoostHighlight expiresAt={ad.boostExpiresAt} />
      {/* Fixed Header area (Buttons only) */}
      <div className={cn(
        "absolute left-0 right-0 z-40 p-6 flex justify-between items-center pointer-events-none transition-all duration-300",
        ad.boostExpiresAt ? "top-12" : "top-0"
      )}>
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 px-1.5 bg-black/30 backdrop-blur-md rounded-xl text-white shadow-sm pointer-events-auto active:scale-95 transition-transform border border-white/20"
        >
          <ChevronLeft size={18} />
        </button>
        
        <button 
          onClick={handleShare}
          className="p-1 px-1.5 bg-black/30 backdrop-blur-md rounded-xl text-white shadow-sm pointer-events-auto active:scale-95 transition-transform border border-white/20"
        >
          <Share2 size={18} />
        </button>
      </div>

      <div>
        {/* Header Image */}
        <div className="relative h-80 sm:h-96 bg-slate-200">
          {ad.images?.[activeImage] ? (
            <img
              src={ad.images[activeImage]}
              alt={ad.title}
              className="w-full h-full object-cover cursor-zoom-in"
              referrerPolicy="no-referrer"
              onClick={() => setSelectedImage(ad.images[activeImage])}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Tag size={64} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto w-full px-6 -mt-8 relative z-20 flex flex-col gap-4">
          {/* Main Info Card */}
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-white/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                  Classificado
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                  {ad.type || 'Produto'}
                </span>
              </div>
              {user && ad.ownerId === user.uid && (
                <div className="flex gap-2">
                  <Link 
                    to={`/edit-classified/${id}`}
                    className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:text-primary transition-colors"
                  >
                    <Edit2 size={16} />
                  </Link>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 bg-red-50 rounded-xl text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <span className="text-2xl font-black text-primary block">
                {ad.price ? `R$ ${ad.price}` : 'A combinar'}
              </span>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                {ad.title}
              </h1>
            </div>
          </div>

          {/* Seller Card */}
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">
              {ownerProfile?.photoURL ? (
                <img src={ownerProfile.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle className="text-slate-300" size={32} />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendido por</p>
              <p className="font-bold text-slate-800">{ownerProfile?.name || 'Vendedor VIX'}</p>
            </div>
          </div>

          {/* Description Card */}
          {ad.description && (
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Descrição
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words">
                {ad.description}
              </p>
            </div>
          )}

          {/* Gallery Card - Styled exactly like business page */}
          {ad.images && ad.images.length > 0 && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 tracking-tight mb-4">Galeria de Fotos</h2>
              <div className="grid grid-cols-2 gap-3">
                {ad.images.map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    className="w-full h-40 object-cover rounded-2xl shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in" 
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      setActiveImage(i);
                      setSelectedImage(img);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contact Actions */}
          {ad.contact && (
            <div className="grid grid-cols-1 gap-3 py-2">
              <a
                href={`https://wa.me/${ad.contact.replace(/\D/g, '')}?text=Olá,%20tenho%20interesse%20no%20anúncio%20"${encodeURIComponent(ad.title)}"%20que%20vi%20no%20Guia%20VIX.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.446-4.435 9.877-9.885 9.877m8.415-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg> WhatsApp
              </a>
              <a
                href={`tel:${ad.contact}`}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
              >
                <Phone size={18} /> Ligar Agora
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.
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
