import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, query } from 'firebase/firestore';
import { useAuth } from '../App';
import { Favorite, Business } from '../types';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [favoriteList, setFavoriteList] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites({});
      setFavoriteList([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'favorites'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs: Record<string, boolean> = {};
      const list: Favorite[] = [];
      snapshot.forEach((doc) => {
        favs[doc.id] = true;
        list.push({ id: doc.id, ...doc.data() } as Favorite);
      });
      setFavorites(favs);
      setFavoriteList(list);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to favorites:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleFavorite = async (business: Business) => {
    if (!user) return;

    const favRef = doc(db, 'users', user.uid, 'favorites', business.id);
    const isFav = !!favorites[business.id];

    try {
      if (isFav) {
        await deleteDoc(favRef);
      } else {
        const favoriteData: Partial<Favorite> = {
          businessId: business.id,
          businessName: business.name,
          category: business.category,
          bannerImage: business.bannerImage,
          createdAt: serverTimestamp(),
        };
        await setDoc(favRef, favoriteData);
      }
    } catch (e) {
      throw handleFirestoreError(e, isFav ? OperationType.DELETE : OperationType.CREATE, `users/${user.uid}/favorites/${business.id}`);
    }
  };

  const removeFavorite = async (businessId: string) => {
    if (!user) return;
    const favRef = doc(db, 'users', user.uid, 'favorites', businessId);
    try {
      await deleteDoc(favRef);
    } catch (e) {
      throw handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/favorites/${businessId}`);
    }
  };

  return { favorites, favoriteList, toggleFavorite, removeFavorite, loading };
}
