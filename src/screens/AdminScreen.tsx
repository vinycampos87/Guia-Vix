import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, deleteDoc, serverTimestamp, getDoc, setDoc, collectionGroup, addDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Store, Star, ChevronLeft, Search, CheckCircle2, XCircle, 
  Briefcase, ShoppingBag, Trash2, Users, Settings, UserMinus, 
  UserCheck, ShieldCheck, Mail, Phone, ExternalLink, Image as ImageIcon, Save,
  Edit2, Upload, X, MessageSquare, Database, RefreshCcw, AlertTriangle
} from 'lucide-react';
import { Business, Classified, Job, UserProfile, AppSettings, Review } from '../types';

type AdminTab = 'businesses' | 'jobs' | 'classifieds' | 'users' | 'settings' | 'reviews';

export default function AdminScreen() {
  const { isAdmin, refreshSettings, settings: currentSettings, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('businesses');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [classifieds, setClassifieds] = useState<Classified[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, coll: string } | null>(null);
  const [itemToBoost, setItemToBoost] = useState<{ id: string, name: string, coll: string, isFeatured?: boolean } | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [boostDays, setBoostDays] = useState('7');
  const [seeding, setSeeding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Settings state
  const [tempSettings, setTempSettings] = useState<AppSettings>({
    logoUrl: '',
    adminWhatsApp: '',
    welcomeMessage: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'businesses') {
        const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'businesses'); });
        setBusinesses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business)));
      } else if (activeTab === 'jobs') {
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'jobs'); });
        setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      } else if (activeTab === 'classifieds') {
        const q = query(collection(db, 'classifieds'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'classifieds'); });
        setClassifieds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classified)));
      } else if (activeTab === 'users') {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'users'); });
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } else if (activeTab === 'reviews') {
        const q = query(collectionGroup(db, 'reviews'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(e => { throw handleFirestoreError(e, OperationType.LIST, 'reviews'); });
        setReviews(snap.docs.map(doc => {
          const data = doc.data() as any;
          return { 
            id: doc.id, 
            ...data,
            businessId: data.businessId || doc.ref.parent.parent?.id 
          } as Review;
        }));
      } else if (activeTab === 'settings') {
        if (currentSettings) {
          setTempSettings(currentSettings);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate, activeTab]);

  useEffect(() => {
    if (currentSettings) {
      setTempSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleBoost = async () => {
    if (!itemToBoost) return;
    const { id, coll } = itemToBoost;
    setUpdatingId(id);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(boostDays));
      
      const updateData: any = {
        boostExpiresAt: expiresAt,
        updatedAt: serverTimestamp()
      };

      if (coll === 'businesses') {
        updateData.isFeatured = true;
      }

      await updateDoc(doc(db, coll, id), updateData);
      
      // Local update
      if (coll === 'businesses') setBusinesses(prev => prev.map(b => b.id === id ? { ...b, ...updateData, boostExpiresAt: expiresAt } : b));
      if (coll === 'jobs') setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updateData, boostExpiresAt: expiresAt } : j));
      if (coll === 'classifieds') setClassifieds(prev => prev.map(c => c.id === id ? { ...c, ...updateData, boostExpiresAt: expiresAt } : c));
      
      setItemToBoost(null);
      alert("Item impulsionado com sucesso!");
    } catch (error) {
      console.error("Error boosting item:", error instanceof Error ? error.message : String(error));
      alert("Erro ao impulsionar item.");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeBoost = async (id: string, coll: string) => {
    setUpdatingId(id);
    try {
      const updateData: any = {
        boostExpiresAt: null,
        updatedAt: serverTimestamp()
      };
      if (coll === 'businesses') updateData.isFeatured = false;

      await updateDoc(doc(db, coll, id), updateData);
      
      // Local update
      if (coll === 'businesses') setBusinesses(prev => prev.map(b => b.id === id ? { ...b, ...updateData, boostExpiresAt: null } : b));
      if (coll === 'jobs') setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updateData, boostExpiresAt: null } : j));
      if (coll === 'classifieds') setClassifieds(prev => prev.map(c => c.id === id ? { ...c, ...updateData, boostExpiresAt: null } : c));
    } catch (e) {
      console.error("Error removing boost:", e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingId(null);
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'blocked' | 'banned') => {
    setUpdatingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, status } : u));
    } catch (e) {
      console.error("Error updating user status:", e instanceof Error ? e.message : String(e));
      alert("Erro ao atualizar status do usuário.");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    setUpdatingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role } : u));
    } catch (e) {
      console.error("Error updating user role:", e instanceof Error ? e.message : String(e));
      alert("Erro ao atualizar cargo do usuário.");
    } finally {
      setUpdatingId(null);
    }
  };

  const editUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setLoading(true);
    try {
      const { uid, ...data } = userToEdit;
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.uid === uid ? userToEdit : u));
      setUserToEdit(null);
      alert("Usuário atualizado com sucesso!");
    } catch (error) {
      console.error("Error editing user:", error instanceof Error ? error.message : String(error));
      alert("Erro ao editar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTempSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTempSettings(prev => ({ ...prev, faviconUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'app_config'), tempSettings, { merge: true });
      await refreshSettings();
      alert("Configurações salvas com sucesso!");
    } catch (e) {
      console.error("Error saving settings:", e instanceof Error ? e.message : String(e));
      alert("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!user || seeding) return;
    setSeeding(true);
    try {
      // Create Businesses (10)
      const businessData = [
        {
          name: 'Ilha do Caranguejo',
          category: 'Restaurante',
          description: 'O melhor caranguejo e frutos do mar da região de Camburi. Ambiente familiar e barulhento, tipicamente capixaba.',
          phone: '(27) 3223-0101',
          whatsapp: '552732230101',
          address: 'Rua Paschoal Apóstolo Páschoal, 370 - Camburi',
          bannerImage: 'https://images.unsplash.com/photo-1596436805346-4356a30b8e66?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          isFeatured: true,
          boostExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          latitude: -20.2741,
          longitude: -40.2855
        },
        {
          name: 'Vix Fitness Camburi',
          category: 'Saúde',
          description: 'Academia completa com vista para o mar, equipamentos modernos e acompanhamento profissional de alta qualidade.',
          phone: '(27) 99988-1234',
          whatsapp: '5527999881234',
          address: 'Av. Dante Michelini, 1200 - Camburi',
          bannerImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.2583,
          longitude: -40.2708
        },
        {
          name: 'Café do Porto',
          category: 'Restaurante',
          description: 'Cafés especiais, tortas artesanais e um ambiente perfeito para reuniões de trabalho na Enseada do Suá.',
          phone: '(27) 3020-4050',
          whatsapp: '552730204050',
          address: 'Praça do Papa - Enseada do Suá',
          bannerImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3117,
          longitude: -40.2942
        },
        {
          name: 'Moda Vix Boutique',
          category: 'Moda',
          description: 'As últimas tendências da moda feminina e masculina com atendimento personalizado no coração da Praia do Canto.',
          phone: '(27) 3344-5566',
          whatsapp: '552733445566',
          address: 'Rua Aleixo Netto, 450 - Praia do Canto',
          bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3015,
          longitude: -40.2912
        },
        {
          name: 'Auto Mecânica Vitória',
          category: 'Automotivo',
          description: 'Reparos mecânicos, alinhamento, balanceamento e troca de óleo com profissionais certificados e rapidez.',
          phone: '(27) 3222-1111',
          whatsapp: '552732221111',
          address: 'Av. Vitória, 2500 - Jucutuquara',
          bannerImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3150,
          longitude: -40.3120
        },
        {
          name: 'Escola Primeiros Passos',
          category: 'Educação',
          description: 'Educação infantil de qualidade com método inovador e ambiente seguro para o desenvolvimento do seu filho.',
          phone: '(27) 3322-8899',
          whatsapp: '552733228899',
          address: 'Rua das Palmeiras, 15 - Jardim da Penha',
          bannerImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.2850,
          longitude: -40.2980
        },
        {
          name: 'Clínica Sorriso Real',
          category: 'Saúde',
          description: 'Dentistas especializados em implantes, ortodontia e estética dental. Tecnologia de ponta para o seu sorriso.',
          phone: '(27) 3030-2020',
          whatsapp: '552730302020',
          address: 'Ed. Wall Street - Enseada do Suá',
          bannerImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3130,
          longitude: -40.2890
        },
        {
          name: 'Pet Shop Auau Vix',
          category: 'Serviços',
          description: 'Banho e tosa, consultas veterinárias e as melhores rações para o seu melhor amigo. Temos serviço de busca.',
          phone: '(27) 3232-4455',
          whatsapp: '552732324455',
          address: 'Rua da Lama, 100 - Jardim da Penha',
          bannerImage: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.2820,
          longitude: -40.2950
        },
        {
          name: 'Imobiliária Capixaba',
          category: 'Imobiliária',
          description: 'Aluguel e venda de imóveis de alto padrão em Vitória e Vila Velha. Encontre o lar dos seus sonhos conosco.',
          phone: '(27) 3050-6070',
          whatsapp: '552730506070',
          address: 'Av. Nossa Senhora da Penha, 2000 - Santa Lúcia',
          bannerImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3050,
          longitude: -40.2980
        },
        {
          name: 'Beleza & Estilo Salão',
          category: 'Beleza',
          description: 'Cortes modernos, coloração, manicure e tratamentos estéticos. O cuidado que você merece com os melhores produtos.',
          phone: '(27) 3444-1122',
          whatsapp: '552734441122',
          address: 'Shopping Vitória - 2º Piso',
          bannerImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600',
          images: [],
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          latitude: -20.3190,
          longitude: -40.2910
        }
      ];

      for (const b of businessData) {
        await addDoc(collection(db, 'businesses'), b);
      }

      // Create Classifieds (10)
      const classifiedData = [
        {
          title: 'iPhone 13 128GB Azul',
          description: 'Aparelho em excelente estado, bateria 89%, com todos os acessórios originais e nota fiscal brasileira.',
          price: 'R$ 3.100',
          city: 'Vitória',
          neighborhood: 'Praia do Canto',
          contact: '27999887766',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Bicicleta Caloi Aro 29',
          description: 'Bicicleta semi-nova, pouco uso, ideal para lazer ou transporte urbano. Revisada recentemente.',
          price: 'R$ 950',
          city: 'Vila Velha',
          neighborhood: 'Praia da Costa',
          contact: '27998881122',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Mesa de Jantar 6 Cadeiras',
          description: 'Mesa de madeira maciça com tampo de vidro. Cadeiras em laca branca. Muito conservada.',
          price: 'R$ 1.500',
          city: 'Serra',
          neighborhood: 'Laranjeiras',
          contact: '27997773344',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1577146333355-630f875320a5?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Notebook Dell i7 16GB',
          description: 'Notebook potente para trabalho ou estudos. SSD 512GB, placa de vídeo dedicada. Modelo 2022.',
          price: 'R$ 4.200',
          city: 'Cariacica',
          neighborhood: 'Campo Grande',
          contact: '27996665544',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Violão Yamaha C40',
          description: 'Violão acústico em perfeito estado. Acompanha capa protetora e encordoamento novo.',
          price: 'R$ 600',
          city: 'Vitória',
          neighborhood: 'Jardim da Penha',
          contact: '27995554433',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'PlayStation 5 com 2 Controles',
          description: 'Console versão com disco. Inclui 3 jogos físicos e case de proteção para os controles.',
          price: 'R$ 3.800',
          city: 'Vila Velha',
          neighborhood: 'Itapuã',
          contact: '27994443322',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Sofá 3 Lugares Retrátil',
          description: 'Sofá cinza escuro, tecido suede premium. Super confortável e em ótimo estado de limpeza.',
          price: 'R$ 1.200',
          city: 'Guarapari',
          neighborhood: 'Centro',
          contact: '27993332211',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Geladeira Brastemp Frost Free',
          description: 'Geladeira 440 litros inox. Funcionando perfeitamente, sem detalhes estéticos.',
          price: 'R$ 2.400',
          city: 'Viana',
          neighborhood: 'Marcílio de Noronha',
          contact: '27992221100',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Tênis Nike Air Jordan (Novo)',
          description: 'Tênis original, nunca usado. Tamanho 41. Cor clássica preto e vermelho.',
          price: 'R$ 800',
          city: 'Fundão',
          neighborhood: 'Praia Grande',
          contact: '27991110099',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        },
        {
          title: 'Smart TV Samsung 55" 4K',
          description: 'TV de última geração com controle remoto por voz. 1 ano de uso, impecável.',
          price: 'R$ 2.100',
          city: 'Vitória',
          neighborhood: 'Jardim Camburi',
          contact: '27990009988',
          type: 'produto',
          images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=600'],
          ownerId: user.uid,
          createdAt: serverTimestamp()
        }
      ];

      for (const c of classifiedData) {
        await addDoc(collection(db, 'classifieds'), c);
      }

      // Create Jobs (20 as requested)
      const jobsData = [
        // Batch 1 (10)
        { title: 'Desenvolvedor Frontend Senior', companyName: 'VixTech', city: 'Vitória', neighborhood: 'Enseada do Suá', description: 'Atuar no desenvolvimento de novas interfaces utilizando React e Tailwind.', salary: 'R$ 8.000 - R$ 12.000', contact: 'recrutamento@vixtech.com.br', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Vendedor de Loja', companyName: 'Moda Praia', city: 'Vila Velha', neighborhood: 'Shopping Vila Velha', description: 'Vagas para as unidades do Shopping Vitória e Shopping Vila Velha.', salary: 'Comercial + Comissão', contact: 'cv@modapraia.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Recepcionista de Hotel', companyName: 'Ibis Vitória', city: 'Vitória', neighborhood: 'Praia do Canto', description: 'Atendimento ao público, check-in e check-out de hóspedes. Inglês básico desejável.', salary: 'R$ 1.800', contact: 'vagas@ibis-vix.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Gerente Comercial', companyName: 'Porto Seguro', city: 'Vitória', neighborhood: 'Centro', description: 'Gestão de equipe de vendas e prospecção de novos parceiros corporativos.', salary: 'R$ 5.000 + Bônus', contact: 'talentos@portoseguro.com.br', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Auxiliar de Cozinha', companyName: 'Pizza Vix', city: 'Serra', neighborhood: 'Laranjeiras', description: 'Auxílio no preparo de massas e recheios. Horário noturno.', salary: 'R$ 1.600', contact: 'rh@pizzavix.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Estagiário de Direito', companyName: 'Lopes Advocacia', city: 'Vitória', neighborhood: 'Santa Lúcia', description: 'Auxiliar na redação de peças e acompanhamento processual. 5º período em diante.', salary: 'Bolsa de R$ 1.000', contact: 'contato@lopesadv.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Ajudante de Carga e Descarga', companyName: 'LogExpress', city: 'Serra', neighborhood: 'Civit II', description: 'Trabalho pesado com transporte de mercadorias. Disponibilidade imediata.', salary: 'R$ 1.500', contact: 'contratacao@logexpress.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Analista de Marketing Digital', companyName: 'Social Vix', city: 'Vila Velha', neighborhood: 'Itapuã', description: 'Gestão de redes sociais e tráfego pago (Google Ads/Meta Ads).', salary: 'R$ 3.500', contact: 'vagas@socialvix.agency', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Manicure e Pedicure', companyName: 'Studio Beleza', city: 'Cariacica', neighborhood: 'Campo Grande', description: 'Contrata-se profissional com experiência em unhas em gel.', salary: 'A combinar (Comissão)', contact: 'studiobeleza@whatsapp.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Vendedor Externo', companyName: 'Ambev', city: 'Viana', neighborhood: 'Marcílio de Noronha', description: 'Visitação a pontos de venda e gestão de pedidos na região metropolitana.', salary: 'Salário fixo + Carro + Vale', contact: 'rh@ambev.com.br', ownerId: user.uid, createdAt: serverTimestamp() },
        // Batch 2 (10)
        { title: 'Cozinheiro Líder', companyName: 'Restaurante Sabor', city: 'Guarapari', neighborhood: 'Praia do Morro', description: 'Responsável pela cozinha e elaboração de cardápios semanais.', salary: 'R$ 3.000', contact: 'sabor@vagas.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Atendente de Farmácia', companyName: 'Drogasil', city: 'Fundão', neighborhood: 'Sede', description: 'Atendimento ao balcão e organização de medicamentos. Necessário formação técnica.', salary: 'R$ 2.100', contact: 'rh@drogasil.com.br', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Motorista de Entrega (Categoria B)', companyName: 'Mercado Livre', city: 'Viana', neighborhood: 'Areinha', description: 'Entregas residenciais na região de Vitória e arredores. Veículo próprio.', salary: 'Ganhos por entrega', contact: 'entregadores@mercadolivre.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Auxiliar Administrativo Júnior', companyName: 'Unimed Vitória', city: 'Vitória', neighborhood: 'Bento Ferreira', description: 'Suporte na organização de documentos e atendimento telefônico.', salary: 'R$ 1.950', contact: 'vagas@unimedvitoria.coop.br', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Operador de Caixa', companyName: 'Supermercado EPA', city: 'Serra', neighborhood: 'Barcelona', description: 'Fechamento de caixa e suporte ao cliente no PDV.', salary: 'R$ 1.700', contact: 'vagas@epa.com.br', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Corretor de Imóveis', companyName: 'RealEstate Vix', city: 'Vitória', neighborhood: 'Praia do Canto', description: 'Venda de empreendimentos na planta. Treinamento incluso.', salary: 'Comissão agressiva', contact: 'rh@realestate.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Estoquista', companyName: 'Nike Factory', city: 'Vila Velha', neighborhood: 'Glória', description: 'Organização de estoque e recebimento de mercadorias.', salary: 'R$ 1.850', contact: 'cv@nikefactory.vix', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Bartender', companyName: 'Sky Bar Camburi', city: 'Vitória', neighborhood: 'Jardim Camburi', description: 'Experiência em coquetelaria clássica e moderna. Noite.', salary: 'R$ 2.500', contact: 'vagas@skybarvix.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Designer Gráfico Pleno', companyName: 'Agência Criativa', city: 'Vila Velha', neighborhood: 'Centro', description: 'Criação de marcas e peças publicitárias off-line e on-line.', salary: 'R$ 4.000', contact: 'portfolio@agenciacriativa.com', ownerId: user.uid, createdAt: serverTimestamp() },
        { title: 'Mecânico de Motos', companyName: 'Moto Vix', city: 'Serra', neighborhood: 'Laranjeiras', description: 'Especialista em motos de alta cilindrada. Reparos mecânicos e elétricos.', salary: 'R$ 3.500', contact: 'vagas@motovix.com.br', ownerId: user.uid, createdAt: serverTimestamp() }
      ];

      for (const j of jobsData) {
        await addDoc(collection(db, 'jobs'), j);
      }

      alert('Dados de demonstração carregados com sucesso! (10 Empresas, 10 Anúncios e 20 Vagas)');
      fetchData();
    } catch (e) {
      console.error("Seed error:", e instanceof Error ? e.message : String(e));
      alert('Erro ao carregar dados de demonstração.');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearAllContent = async () => {
    setClearing(true);
    try {
      const collections = ['businesses', 'classifieds', 'jobs'];
      for (const collName of collections) {
        const snap = await getDocs(collection(db, collName));
        for (const docItem of snap.docs) {
          if (collName === 'businesses') {
            const reviewsSnap = await getDocs(collection(db, 'businesses', docItem.id, 'reviews'));
            for (const reviewDoc of reviewsSnap.docs) {
              await deleteDoc(reviewDoc.ref);
            }
          }
          await deleteDoc(docItem.ref);
        }
      }

      const reviewsSnap = await getDocs(query(collectionGroup(db, 'reviews')));
      for (const reviewDoc of reviewsSnap.docs) {
        await deleteDoc(reviewDoc.ref);
      }

      alert("Todo o conteúdo foi apagado com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error clearing content:", error instanceof Error ? error.message : String(error));
      alert("Erro ao apagar conteúdo.");
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const { id, coll } = itemToDelete;
    setUpdatingId(id);
    try {
      if (coll === 'reviews') {
        const businessId = (itemToDelete as any).extra;
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
        if (coll === 'jobs') setJobs(prev => prev.filter(j => j.id !== id));
        if (coll === 'classifieds') setClassifieds(prev => prev.filter(c => c.id !== id));
        if (coll === 'users') setUsers(prev => prev.filter(u => u.uid !== id));
      }
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error instanceof Error ? error.message : String(error));
      alert("Erro ao excluir item.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredData = () => {
    const term = searchTerm.toLowerCase();
    if (activeTab === 'businesses') return businesses.filter(b => b.name.toLowerCase().includes(term));
    if (activeTab === 'jobs') return jobs.filter(j => j.title.toLowerCase().includes(term));
    if (activeTab === 'classifieds') return classifieds.filter(c => c.title.toLowerCase().includes(term));
    if (activeTab === 'users') return users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.phone?.includes(term));
    if (activeTab === 'reviews') return reviews.filter(r => 
      r.userName.toLowerCase().includes(term) || 
      r.businessName.toLowerCase().includes(term) || 
      r.comment.toLowerCase().includes(term)
    );
    return [];
  };

  if (!isAdmin) return null;

  const isBoosted = (item: any) => {
    if (!item.boostExpiresAt) return false;
    const expiry = item.boostExpiresAt.seconds 
      ? new Date(item.boostExpiresAt.seconds * 1000) 
      : new Date(item.boostExpiresAt);
    return expiry > new Date();
  };

  return (
    <div className="p-4 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="text-primary" size={20} /> Painel Administrador
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Controle total da plataforma</p>
        </div>
      </div>

      <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-2xl mb-6 gap-1 no-scrollbar">
        {[
          { id: 'businesses', icon: Store, label: 'Negócios' },
          { id: 'jobs', icon: Briefcase, label: 'Vagas' },
          { id: 'classifieds', icon: ShoppingBag, label: 'Anúncios' },
          { id: 'reviews', icon: MessageSquare, label: 'Avaliações' },
          { id: 'users', icon: Users, label: 'Usuários' },
          { id: 'settings', icon: Settings, label: 'Geral' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'settings' && (
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={`Buscar por nome, email ou telefone...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
          />
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/50 rounded-[32px] animate-pulse" />)
        ) : activeTab === 'settings' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={16} className="text-primary" /> Logotipo do App
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50 gap-4">
                  {tempSettings.logoUrl ? (
                    <div className="relative group">
                      <img src={tempSettings.logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain rounded-lg" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setTempSettings(prev => ({...prev, logoUrl: ''}))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">JPG ou PNG</p>
                    <label className="bg-white px-6 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                      <Upload size={14} /> Enviar Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 pt-4">
                <Shield size={16} className="text-primary" /> Favicon do Site
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50 gap-4">
                  {tempSettings.faviconUrl ? (
                    <div className="relative group">
                      <img src={tempSettings.faviconUrl} alt="Favicon Preview" className="h-8 w-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setTempSettings(prev => ({...prev, faviconUrl: ''}))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">JPG ou PNG (Sugerido 32x32)</p>
                    <label className="bg-white px-6 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                      <Upload size={14} /> Enviar Favicon
                      <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Phone size={16} className="text-primary" /> Suporte / Impulsionamento
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Admin</label>
                <input 
                  type="text"
                  value={tempSettings.adminWhatsApp || ''}
                  onChange={e => setTempSettings({...tempSettings, adminWhatsApp: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm"
                  placeholder="27999999999"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Database size={16} className="text-primary" /> Gerenciamento de Dados
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleSeedData}
                  disabled={seeding || clearing}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  <Database size={16} /> {seeding ? 'Gerando...' : 'Gerar Conteúdo de Exemplo'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={seeding || clearing}
                  className="w-full bg-rose-50 text-rose-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  <Trash2 size={16} /> {clearing ? 'Apagando...' : 'Limpar Todo Conteúdo'}
                </button>
              </div>
            </div>

            <button
              onClick={saveSettings}
              className="w-full bg-primary text-white py-4 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
            >
              <Save size={18} /> Salvar Configurações
            </button>
          </motion.div>
        ) : filteredData().length > 0 ? (
          filteredData().map((item: any) => (
            <div 
              key={item.uid || item.id} 
              className={`bg-white p-4 rounded-[32px] border transition-all duration-300 ${activeTab === 'users' && item.role === 'admin' ? 'border-primary/20 bg-primary/[0.02]' : 'border-slate-100 shadow-sm'}`}
            >
              {activeTab === 'users' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 overflow-hidden border border-slate-100">
                      {item.photoURL ? <img src={item.photoURL} className="w-full h-full object-cover" /> : <Users size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{item.name}</h3>
                        {item.role === 'admin' && <ShieldCheck size={14} className="text-primary" />}
                        {(item.whatsapp || item.phone) && (
                          <a 
                            href={`https://wa.me/${(item.whatsapp || item.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white p-1 rounded-full hover:scale-110 transition-transform hidden sm:flex"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare size={10} fill="currentColor" />
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{item.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          item.status === 'blocked' ? 'bg-amber-100 text-amber-600' : 
                          item.status === 'banned' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {item.status || 'Ativo'}
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Desde {new Date(item.createdAt).toLocaleDateString()}</span>
                        {(item.whatsapp || item.phone) && (
                          <a 
                            href={`https://wa.me/${(item.whatsapp || item.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex sm:hidden items-center gap-1 text-[8px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                    <div className="flex gap-2">
                       <button
                        onClick={() => updateUserRole(item.uid, item.role === 'admin' ? 'user' : 'admin')}
                        disabled={updatingId === item.uid}
                        className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          item.role === 'admin' ? 'bg-slate-100 text-slate-500' : 'bg-primary/5 text-primary'
                        }`}
                      >
                        {item.role === 'admin' ? 'Revogar Admin' : 'Tornar Admin'}
                      </button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setUserToEdit(item)}
                        className="p-2 bg-primary/5 text-primary rounded-xl"
                        title="Editar Usuário"
                      >
                        <Edit2 size={18} />
                      </button>
                      {item.status !== 'active' ? (
                         <button
                         onClick={() => updateUserStatus(item.uid, 'active')}
                         disabled={updatingId === item.uid}
                         className="p-2 bg-green-50 text-green-600 rounded-xl"
                         title="Ativar Usuário"
                       >
                         <UserCheck size={18} />
                       </button>
                      ) : (
                        <button
                          onClick={() => updateUserStatus(item.uid, 'blocked')}
                          disabled={updatingId === item.uid}
                          className="p-2 bg-amber-50 text-amber-600 rounded-xl"
                          title="Bloquear Usuário"
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setItemToDelete({ id: item.uid, name: item.name, coll: 'users' })}
                        className="p-2 bg-rose-50 text-rose-500 rounded-xl"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'reviews' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                          Avaliação
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">
                          {new Date(item.createdAt?.seconds * 1000 || item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        <span className="text-slate-400">De:</span> {item.userName}
                      </h3>
                      <h3 className="font-bold text-slate-800 text-sm">
                        <span className="text-slate-400">Para:</span> {item.businessName}
                      </h3>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} fill={s <= item.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-2xl italic text-slate-600 text-xs border border-slate-100">
                    "{item.comment}"
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                    <button
                      onClick={() => setItemToDelete({ id: item.id, name: `Avaliação de ${item.userName}`, coll: 'reviews', extra: item.businessId } as any)}
                      disabled={updatingId === item.id}
                      className="p-2.5 bg-rose-50 text-rose-300 hover:text-rose-500 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                    <Link 
                      to={`/business/${item.businessId}`}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary rounded-2xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <ExternalLink size={16} /> Ver Empresa
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                      {(activeTab === 'businesses' && item.bannerImage) ? (
                        <img src={item.bannerImage} className="w-full h-full object-cover" />
                      ) : (activeTab === 'classifieds' && item.images?.[0]) ? (
                        <img src={item.images[0]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-200">
                          {activeTab === 'jobs' ? <Briefcase size={24} /> : activeTab === 'classifieds' ? <ShoppingBag size={24} /> : <Store size={24} />}
                        </div>
                      )}
                    </div>
                    {activeTab === 'businesses' && item.isFeatured && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                        <Star size={10} className="fill-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-sm">{item.name || item.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">
                      {activeTab === 'businesses' ? item.category : activeTab === 'jobs' ? item.companyName : (item.price || 'A combinar')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Link to={`/${activeTab === 'businesses' ? 'business' : activeTab === 'jobs' ? 'job' : 'classified'}/${item.id}`} className="text-primary text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        Ver <ExternalLink size={10} />
                      </Link>
                      {isBoosted(item) && (
                        <span className="text-emerald-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Star size={8} fill="currentColor" /> Ativo até {
                            (item.boostExpiresAt.seconds 
                              ? new Date(item.boostExpiresAt.seconds * 1000) 
                              : new Date(item.boostExpiresAt)).toLocaleDateString()
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/edit-${activeTab === 'businesses' ? 'business' : activeTab === 'jobs' ? 'job' : 'classified'}/${item.id}`}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary rounded-2xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </Link>
                    {(activeTab === 'businesses' || activeTab === 'jobs' || activeTab === 'classifieds') && (
                      <button
                        onClick={() => {
                          if (isBoosted(item)) {
                            removeBoost(item.id, activeTab);
                          } else {
                            setItemToBoost({ id: item.id, name: item.name || item.title, coll: activeTab });
                          }
                        }}
                        disabled={updatingId === item.id}
                        className={`p-2.5 rounded-2xl transition-all ${
                          isBoosted(item)
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-2 ring-white' 
                            : 'bg-slate-50 text-slate-300 hover:text-emerald-500'
                        } disabled:opacity-50`}
                        title={isBoosted(item) ? 'Remover Impulso' : 'Impulsionar'}
                      >
                        <Star size={18} fill={isBoosted(item) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    <button
                      onClick={() => setItemToDelete({ id: item.id, name: item.name || item.title, coll: activeTab })}
                      disabled={updatingId === item.id}
                      className="p-2.5 bg-rose-50 text-rose-300 hover:text-rose-500 rounded-2xl transition-all disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 glass rounded-[32px]">
            <XCircle className="mx-auto text-slate-200 mb-4" size={40} />
            <p className="text-slate-400 text-sm font-medium">Nenhum item encontrado.</p>
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Apagar TUDO?</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Esta ação irá excluir <span className="text-rose-500 font-bold">TODAS</span> as empresas, vagas, anúncios e avaliações do aplicativo.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearAllContent}
                  disabled={clearing}
                  className="flex-1 bg-rose-500 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {clearing ? 'Apagando...' : 'Sim, Apagar Tudo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                  disabled={updatingId === itemToDelete.id}
                  className="flex-1 bg-rose-500 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {updatingId === itemToDelete.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Boost Modal */}
      <AnimatePresence>
        {itemToBoost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToBoost(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Impulsionar Item</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Escolha por quanto tempo deseja impulsionar <span className="text-slate-800 font-bold">"{itemToBoost.name}"</span>.
              </p>
              
              <div className="space-y-3 mb-8">
                {['1', '7', '15', '30'].map(days => (
                  <button
                    key={days}
                    onClick={() => setBoostDays(days)}
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-between ${
                      boostDays === days 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <span>{days} {parseInt(days) === 1 ? 'Dia' : 'Dias'}</span>
                    {boostDays === days && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setItemToBoost(null)}
                  className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBoost}
                  disabled={updatingId === itemToBoost.id}
                  className="flex-1 bg-emerald-500 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  {updatingId === itemToBoost.id ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {userToEdit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToEdit(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Editar Usuário</h3>
                  <button onClick={() => setUserToEdit(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={editUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                    <input 
                      type="text"
                      value={userToEdit.name}
                      onChange={e => setUserToEdit({...userToEdit, name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email"
                      value={userToEdit.email}
                      onChange={e => setUserToEdit({...userToEdit, email: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input 
                      type="text"
                      value={userToEdit.phone || ''}
                      onChange={e => setUserToEdit({...userToEdit, phone: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                      <select 
                        value={userToEdit.role}
                        onChange={e => setUserToEdit({...userToEdit, role: e.target.value as any})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none appearance-none"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        value={userToEdit.status}
                        onChange={e => setUserToEdit({...userToEdit, status: e.target.value as any})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none appearance-none"
                      >
                        <option value="active">Ativo</option>
                        <option value="blocked">Bloqueado</option>
                        <option value="banned">Banido</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setUserToEdit(null)}
                      className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
