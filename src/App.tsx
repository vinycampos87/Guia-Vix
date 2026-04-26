/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Home, ShoppingBag, Briefcase, Bus, User as UserIcon, LogIn, PlusCircle, Store, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Screens
import HomeScreen from './screens/HomeScreen';
import ClassifiedsScreen from './screens/ClassifiedsScreen';
import JobsScreen from './screens/JobsScreen';
import BusSchedulesScreen from './screens/BusSchedulesScreen';
import ProfileScreen from './screens/ProfileScreen';
import BusinessDetailScreen from './screens/BusinessDetailScreen';
import AuthScreen from './screens/AuthScreen';
import RegisterBusinessScreen from './screens/RegisterBusinessScreen';
import EditJobScreen from './screens/EditJobScreen';
import EditClassifiedScreen from './screens/EditClassifiedScreen';
import AdminScreen from './screens/AdminScreen';
import BusinessesScreen from './screens/BusinessesScreen';
import ClassifiedDetailScreen from './screens/ClassifiedDetailScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { usePushNotifications } from './hooks/usePushNotifications';

import { UserProfile, AppSettings } from './types';

// Context
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  settings: AppSettings | null;
  isAdmin: boolean;
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  settings: null,
  isAdmin: false, 
  loading: true, 
  setProfile: () => {},
  refreshSettings: async () => {}
});

export const useAuth = () => useContext(AuthContext);

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, profile, settings } = useAuth();

  if (profile?.status === 'blocked' || profile?.status === 'banned') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <UserIcon size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Acesso Restrito</h1>
        <p className="text-slate-500 font-medium mb-8">
          Sua conta foi {profile.status === 'blocked' ? 'bloqueada temporariamente' : 'banida permanentemente'}. 
          Entre em contato com o administrador para mais informações.
        </p>
        <button 
          onClick={() => auth.signOut()}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]"
        >
          Sair da Conta
        </button>
      </div>
    );
  }

  const shouldHideHeader = [
    '/auth',
    '/register-business',
    '/edit-business',
    '/edit-job',
    '/edit-classified',
    '/job/',
    '/classified/',
    '/business/'
  ].some(path => location.pathname.startsWith(path));

  const navItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/businesses', icon: Store, label: 'Empresas' },
    { path: '/classifieds', icon: ShoppingBag, label: 'Classificados' },
    { path: '/jobs', icon: Briefcase, label: 'Vagas' },
    { path: '/bus', icon: Bus, label: 'Ônibus' },
    { path: '/profile', icon: UserIcon, label: 'Perfil' },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 relative">
      <header className={cn(
        "bg-white/80 backdrop-blur-md border-b border-white/10 px-6 py-4 items-center justify-between sticky top-0 z-[60] shadow-sm",
        shouldHideHeader ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center gap-8 max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-2">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-h-12 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <h1 className="text-2xl font-black text-primary tracking-tighter">Guia VIX</h1>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    isActive ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-700 hober:bg-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200/50 items-center gap-1.5">
              <MapPin size={12} className="text-primary" /> Vitória, ES
            </div>
            {user ? (
              <Link to="/register-business" className="p-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl transition-all shadow-sm">
                <PlusCircle size={24} />
              </Link>
            ) : (
              <Link to="/auth" className="px-5 py-2.5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto md:px-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/30 px-2 py-2 flex justify-around items-center z-50 rounded-t-[32px] shadow-[0_-15px_40px_-5px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 transition-all duration-300 relative",
                isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 3 : 2} />
              <span className={cn(
                "text-[7px] font-black uppercase tracking-tight text-center",
                isActive ? "text-primary" : "text-slate-400"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-dot-active"
                  className="w-1.5 h-1.5 bg-primary rounded-full absolute -bottom-1"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  usePushNotifications();

  const fetchSettings = async () => {
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'app_config'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as AppSettings);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  useEffect(() => {
    if (settings?.faviconUrl) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = settings.faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings?.faviconUrl]);

  useEffect(() => {
    fetchSettings();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsAdmin(firebaseUser.email === 'marcusvinicius.itj@gmail.com');
        const docRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            setProfile(profileData);
            if (profileData.role === 'admin') {
              setIsAdmin(true);
            }
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              role: 'user',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            } catch (error) {
              throw handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
          }
        } catch (error) {
          // If it was already thrown by setDoc, don't wrap it again
          if (error instanceof Error && error.message.startsWith('{')) {
            throw error;
          }
          throw handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full shadow-sm"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, settings, isAdmin, loading, setProfile, refreshSettings: fetchSettings }}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/business/:id" element={<BusinessDetailScreen />} />
              <Route path="/classified/:id" element={<ClassifiedDetailScreen />} />
              <Route path="/job/:id" element={<JobDetailScreen />} />
              <Route path="/privacidade" element={<PrivacyPolicyScreen />} />
              <Route path="/classifieds" element={<ClassifiedsScreen />} />
              <Route path="/jobs" element={<JobsScreen />} />
              <Route path="/bus" element={<BusSchedulesScreen />} />
              <Route path="/profile" element={user ? <ProfileScreen /> : <Navigate to="/auth" />} />
              <Route path="/auth" element={!user ? <AuthScreen /> : <Navigate to="/profile" />} />
              <Route path="/register-business" element={user ? <RegisterBusinessScreen /> : <Navigate to="/auth" />} />
              <Route path="/edit-business/:id" element={user ? <RegisterBusinessScreen /> : <Navigate to="/auth" />} />
              <Route path="/edit-job/:id" element={user ? <EditJobScreen /> : <Navigate to="/auth" />} />
              <Route path="/edit-classified/:id" element={user ? <EditClassifiedScreen /> : <Navigate to="/auth" />} />
              <Route path="/businesses" element={<BusinessesScreen />} />
              <Route path="/admin" element={isAdmin ? <AdminScreen /> : <Navigate to="/" />} />
            </Routes>
          </Layout>
        </Router>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

