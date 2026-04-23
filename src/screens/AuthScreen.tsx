import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, Phone, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para redefinir a senha.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/user-not-found).' ? 'Usuário não encontrado.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Profile creation is handled in App.tsx onAuthStateChanged
      navigate('/profile');
    } catch (err: any) {
      console.error("Google Auth Error:", err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado.');
      } else {
        setError('Erro ao entrar com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user document
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name,
          email,
          phone: whatsapp,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
          break;
        case 'auth/user-not-found':
          setError('Usuário não encontrado. Verifique o e-mail ou cadastre-se.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta. Tente novamente ou use "Esqueci minha senha".');
          break;
        case 'auth/email-already-in-use':
          setError('Este e-mail já está em uso por outra conta.');
          break;
        case 'auth/weak-password':
          setError('A senha deve ter pelo menos 6 caracteres.');
          break;
        case 'auth/invalid-email':
          setError('Por favor, insira um e-mail válido.');
          break;
        case 'auth/operation-not-allowed':
          setError('O login por e-mail e senha não está habilitado no Console do Firebase.');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
          break;
        default:
          setError('Ocorreu um erro ao tentar autenticar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="absolute top-6 left-6 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-3 bg-white rounded-2xl text-slate-500 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
      >
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              !isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          )}
          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                placeholder="WhatsApp (ex: 27999998888)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required={!loading}
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-[10px] font-bold mt-2 text-center uppercase tracking-tight">{error}</p>}
          {message && <p className="text-emerald-500 text-[10px] font-bold mt-2 text-center uppercase tracking-tight">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-4 text-slate-400">Ou entre com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3.5 rounded-xl font-bold text-slate-700 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            <span className="text-sm">Google</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
