import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, collectionGroup, getDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { LogOut, User, Settings, Plus, Edit2, Trash2, Store, ShoppingBag, Briefcase, Database, Shield, Star, X, Save, Camera, Phone, FileText, Upload, MessageSquare, ChevronRight, Heart } from 'lucide-react';
import { Business, Classified, Job, Review } from '../types';
import { useFavorites } from '../hooks/useFavorites';

export default function ProfileScreen() {
  const { user, profile, isAdmin, setProfile } = useAuth();
  const navigate = useNavigate();
  const { favoriteList, removeFavorite } = useFavorites();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [classifieds, setClassifieds] = useState<Classified[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, coll: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    photoURL: '',
    bio: '',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit Review State
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit for Firestore doc size safety
        alert("A imagem é muito grande. Escolha uma imagem de até 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        photoURL: profile.photoURL || '',
        bio: profile.bio || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bQuery = query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
      const cQuery = query(collection(db, 'classifieds'), where('ownerId', '==', user.uid));
      const jQuery = query(collection(db, 'jobs'), where('ownerId', '==', user.uid));
      const rQuery = query(collectionGroup(db, 'reviews'), where('userId', '==', user.uid));

      const [bSnap, cSnap, jSnap, rSnap] = await Promise.all([
        getDocs(bQuery).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'businesses'); }),
        getDocs(cQuery).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'classifieds'); }),
        getDocs(jQuery).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'jobs'); }),
        getDocs(rQuery).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'reviews'); })
      ]);

      setBusinesses(bSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business)));
      setClassifieds(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classified)));
      setJobs(jSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setReviews(rSnap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          businessId: data.businessId || doc.ref.parent.parent?.id 
        } as Review;
      }));
    } catch (error) {
      console.error("Error fetching user data:", error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const { coll, id, extra } = itemToDelete as any;
    setIsDeleting(true);
    try {
      if (coll === 'reviews') {
        const businessId = extra;
        await deleteDoc(doc(db, 'businesses', businessId, 'reviews', id)).catch(e => { throw handleFirestoreError(e, OperationType.DELETE, `businesses/${businessId}/reviews/${id}`); });
        
        // Recalculate Business Rating
        const reviewsSnap = await getDocs(collection(db, 'businesses', businessId, 'reviews'));
        const remainingReviews = reviewsSnap.docs.map(d => d.data() as Review);
        const newCount = remainingReviews.length;
        const newRating = newCount > 0 
          ? remainingReviews.reduce((acc, r) => acc + r.rating, 0) / newCount 
          : 0;

        await updateDoc(doc(db, 'businesses', businessId), {
          rating: newRating,
          reviewCount: newCount
        });

        setReviews(prev => prev.filter(r => r.id !== id || r.businessId !== businessId));
      } else {
        await deleteDoc(doc(db, coll, id)).catch(e => { throw handleFirestoreError(e, OperationType.DELETE, `${coll}/${id}`); });
        if (coll === 'businesses') setBusinesses(prev => prev.filter(b => b.id !== id));
        if (coll === 'classifieds') setClassifieds(prev => prev.filter(c => c.id !== id));
        if (coll === 'jobs') setJobs(prev => prev.filter(j => j.id !== id));
      }
      setItemToDelete(null);
      alert("Excluido com sucesso!");
    } catch (error) {
      console.error("Error deleting item:", error instanceof Error ? error.message : String(error));
      alert("Erro ao excluir item.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setSavingReview(true);
    try {
      const { businessId, userId, rating, comment } = editingReview;
      const reviewRef = doc(db, 'businesses', businessId, 'reviews', userId);
      
      await updateDoc(reviewRef, {
        rating,
        comment,
        updatedAt: serverTimestamp()
      });

      // Recalculate Business Rating
      const reviewsSnap = await getDocs(collection(db, 'businesses', businessId, 'reviews'));
      const allReviews = reviewsSnap.docs.map(d => d.data() as Review);
      const newRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

      await updateDoc(doc(db, 'businesses', businessId), {
        rating: newRating
      });

      setReviews(prev => prev.map(r => r.userId === userId && r.businessId === businessId ? editingReview : r));
      setEditingReview(null);
      alert("Avaliação atualizada com sucesso!");
    } catch (error) {
      console.error("Error updating review:", error instanceof Error ? error.message : String(error));
      alert("Erro ao atualizar avaliação.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...editForm,
        updatedAt: serverTimestamp()
      }).catch(e => { throw handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`); });

      setProfile(prev => ({ ...prev, ...editForm }));
      setIsEditingProfile(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating profile:", error instanceof Error ? error.message : String(error));
      alert('Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border-b border-slate-100 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2.5 bg-slate-50 rounded-2xl text-slate-500 hover:bg-slate-100 transition-all"
        >
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Meu Perfil</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gerencie suas atividades</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
      {/* Profile Header */}
      <div className="bg-white/60 backdrop-blur-md p-8 rounded-[32px] shadow-sm border border-white/40 flex flex-col items-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-5 overflow-hidden border-4 border-white shadow-xl">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <User className="text-primary" size={40} />
          )}
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{profile?.name || 'Usuário'}</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{user?.email}</p>
        
        <div className="flex flex-col gap-3 mt-8 w-full">
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="flex-1 bg-white/80 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-center gap-2 border border-white/50 shadow-sm hover:bg-white transition-all"
            >
              <Settings size={16} /> Editar
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 bg-red-50/50 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-red-600 flex items-center justify-center gap-2 border border-red-100/50 shadow-sm hover:bg-red-50 transition-all"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
          
          {isAdmin && (
            <Link 
              to="/admin"
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-slate-200 hover:scale-[0.98] transition-all"
            >
              <Shield size={16} className="text-primary" /> Painel Admin
            </Link>
          )}
        </div>
      </div>

      {/* My Businesses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Heart size={20} className="text-red-500 fill-red-500" /> Meus Favoritos
          </h3>
        </div>
        <div className="space-y-3">
          {favoriteList.length > 0 ? favoriteList.map(fav => (
            <div key={fav.id} className="relative group">
              <Link to={`/business/${fav.businessId}`}>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-3 hover:shadow-md transition-shadow">
                  <img src={fav.bannerImage} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{fav.businessName}</h4>
                    <p className="text-gray-500 text-xs">{fav.category}</p>
                  </div>
                  <ChevronRight className="text-slate-300" size={18} />
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFavorite(fav.businessId);
                }}
                className="absolute -top-1 -right-1 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 shadow-sm transition-all active:scale-90"
                title="Remover favorito"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )) : (
            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Nenhuma empresa favoritada.</p>
            </div>
          )}
        </div>
      </section>

      {/* My Businesses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Store size={20} className="text-blue-600" /> Meus Negócios
          </h3>
          <Link to="/register-business" className="text-blue-600 text-sm font-bold flex items-center gap-1">
            <Plus size={16} /> Novo
          </Link>
        </div>
        <div className="space-y-3">
          {businesses.length > 0 ? businesses.map(b => (
            <div key={b.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <img src={b.bannerImage} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-800 text-sm truncate">{b.name}</h4>
                  {b.isFeatured && <Star size={12} className="text-amber-400 fill-amber-400" />}
                </div>
                <p className="text-gray-500 text-xs">{b.category}</p>
              </div>
              <div className="flex gap-1 items-center">
                <button 
                  onClick={() => window.open(`https://wa.me/5527996063520?text=${encodeURIComponent(`Olá! Gostaria de impulsionar meu negócio: ${b.name}`)}`, '_blank')}
                  className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors mr-2 flex items-center gap-1"
                  title="Impulsionar Negócio"
                >
                  🚀 <span className="hidden min-[400px]:inline">Impulsionar</span>
                </button>
                <Link to={`/edit-business/${b.id}`} className="p-2 text-gray-400 hover:text-blue-600">
                  <Edit2 size={18} />
                </Link>
                <button onClick={() => setItemToDelete({ id: b.id, name: b.name, coll: 'businesses' })} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Nenhum negócio cadastrado.</p>
            </div>
          )}
        </div>
      </section>

      {/* My Classifieds */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" /> Meus Classificados
          </h3>
        </div>
        <div className="space-y-3">
          {classifieds.length > 0 ? classifieds.map(c => (
            <div key={c.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {c.images?.[0] ? <img src={c.images[0]} className="w-full h-full object-cover rounded-lg" /> : <ShoppingBag size={20} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm">{c.title}</h4>
                <p className="text-blue-600 font-bold text-xs">{c.price || 'A combinar'}</p>
              </div>
              <div className="flex gap-1 items-center">
                <button 
                  onClick={() => window.open(`https://wa.me/5527996063520?text=${encodeURIComponent(`Olá! Gostaria de impulsionar meu anúncio: ${c.title}`)}`, '_blank')}
                  className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors mr-2 flex items-center gap-1"
                  title="Impulsionar Anúncio"
                >
                  🚀 <span className="hidden min-[400px]:inline">Impulsionar</span>
                </button>
                <Link to={`/edit-classified/${c.id}`} className="p-2 text-gray-400 hover:text-blue-600">
                  <Edit2 size={18} />
                </Link>
                <button onClick={() => setItemToDelete({ id: c.id, name: c.title, coll: 'classifieds' })} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Nenhum anúncio cadastrado.</p>
            </div>
          )}
        </div>
      </section>

      {/* My Jobs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600" /> Minhas Vagas
          </h3>
        </div>
        <div className="space-y-3">
          {jobs.length > 0 ? jobs.map(j => (
            <div key={j.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Briefcase size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm">{j.title}</h4>
                <p className="text-gray-500 text-xs">{j.salary || 'Salário não informado'}</p>
              </div>
              <div className="flex gap-1 items-center">
                <button 
                  onClick={() => window.open(`https://wa.me/5527996063520?text=${encodeURIComponent(`Olá! Gostaria de impulsionar minha vaga: ${j.title}`)}`, '_blank')}
                  className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors mr-2 flex items-center gap-1"
                  title="Impulsionar Vaga"
                >
                  🚀 <span className="hidden min-[400px]:inline">Impulsionar</span>
                </button>
                <Link to={`/edit-job/${j.id}`} className="p-2 text-gray-400 hover:text-blue-600">
                  <Edit2 size={18} />
                </Link>
                <button onClick={() => setItemToDelete({ id: j.id, name: j.title, coll: 'jobs' })} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Nenhuma vaga cadastrada.</p>
            </div>
          )}
        </div>
      </section>

      {/* My Reviews Section */}
      <section className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-500" /> Minhas Avaliações
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-black uppercase">
            {reviews.length} total
          </span>
        </div>
        <div className="space-y-4">
          {reviews.length > 0 ? reviews.map((r) => (
            <div key={`${r.businessId}-${r.id}`} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{r.businessName}</h4>
                  <div className="flex text-amber-400 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} fill={s <= r.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setEditingReview(r)}
                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setItemToDelete({ id: r.id, name: `Sua avaliação em ${r.businessName}`, coll: 'reviews', extra: r.businessId } as any)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p className="text-slate-600 text-[11px] font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl italic">
                "{r.comment}"
              </p>
            </div>
          )) : (
            <div className="text-center py-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma avaliação enviada.</p>
            </div>
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
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
                Tem certeza que deseja excluir <span className="text-slate-800 font-bold">"{itemToDelete.name}"</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
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

      {/* Edit Review Modal */}
      <AnimatePresence>
        {editingReview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReview(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="bg-amber-400 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest">Editar Avaliação</h3>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Sua experiência em {editingReview.businessName}</p>
                </div>
                <button onClick={() => setEditingReview(null)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateReview} className="p-6 space-y-6">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditingReview({ ...editingReview, rating: star })}
                      className={`transition-all hover:scale-110 ${star <= editingReview.rating ? 'text-amber-400' : 'text-slate-200'}`}
                    >
                      <Star size={36} fill={star <= editingReview.rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comentário</label>
                  <textarea
                    required
                    value={editingReview.comment}
                    onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 font-medium text-slate-600 text-sm min-h-[120px] resize-none"
                    placeholder="Conte como foi sua experiência..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingReview}
                    className="flex-1 bg-amber-400 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Save size={16} /> {savingReview ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest">Editar Perfil</h3>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Atualize suas informações</p>
                </div>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-700 text-sm"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Foto de Perfil</label>
                    <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-full overflow-hidden border-2 border-white shadow-md">
                        {editForm.photoURL ? (
                          <img src={editForm.photoURL} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User size={32} />
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Upload size={14} /> Selecionar Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Máximo 800KB</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bio / Descrição</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-slate-600 text-sm min-h-[100px] resize-none"
                        placeholder="Fale um pouco sobre você..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp / Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-slate-700 text-sm"
                        placeholder="(27) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Save size={16} /> {savingProfile ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
