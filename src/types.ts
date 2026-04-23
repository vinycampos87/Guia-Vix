export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  bio?: string;
  photoURL?: string;
  whatsapp?: string;
  phone?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'blocked' | 'banned';
  createdAt: any;
}

export interface AppSettings {
  logoUrl?: string;
  faviconUrl?: string;
  adminWhatsApp?: string;
  welcomeMessage?: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  mapsUrl?: string;
  bannerImage: string;
  images: string[];
  openingHours?: string;
  ownerId: string;
  createdAt: any;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  boostExpiresAt?: any;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
  updatedAt?: any;
  businessId: string;
  businessName: string;
}

export interface Classified {
  id: string;
  title: string;
  description: string;
  price?: string;
  contact: string;
  type: 'produto' | 'serviço';
  images: string[];
  boostExpiresAt?: any;
  ownerId: string;
  createdAt: any;
}

export interface Job {
  id: string;
  title: string;
  companyName: string;
  city: string;
  description: string;
  salary?: string;
  contact: string;
  whatsapp?: string;
  email?: string;
  boostExpiresAt?: any;
  ownerId: string;
  createdAt: any;
}

export interface Favorite {
  id: string;
  businessId: string;
  businessName: string;
  category: string;
  bannerImage: string;
  createdAt: any;
}

export const BUSINESS_CATEGORIES = [
  "Restaurante",
  "Lanchonete",
  "Serviços",
  "Saúde",
  "Educação",
  "Moda",
  "Beleza",
  "Automotivo",
  "Imobiliária",
  "Outros"
];

export const ES_CITIES = [
  "Vitória",
  "Vila Velha",
  "Serra",
  "Cariacica",
  "Viana",
  "Guarapari",
  "Fundão",
  "Anchieta",
  "Outra"
];

export const VITORIA_NEIGHBORHOODS = [
  "Aeroporto",
  "Andorinhas",
  "Antônio Honório",
  "Ariovaldo Favalessa",
  "Barro Vermelho",
  "Bela Vista",
  "Bento Ferreira",
  "Boa Vista",
  "Bonfim",
  "Caratoíra",
  "Centro",
  "Comdusa",
  "Conquista",
  "Consolação",
  "Cruzamento",
  "Da Penha",
  "De Lourdes",
  "Do Cabral",
  "Do Quadro",
  "Enseada do Suá",
  "Estrelinha",
  "Fonte Grande",
  "Forte São João",
  "Fradinhos",
  "Goiabeiras",
  "Grand Vitória",
  "Guruigica",
  "Horário de Verão",
  "Ilha das Caieiras",
  "Ilha de Santa Maria",
  "Ilha do Boi",
  "Ilha do Frade",
  "Ilha do Príncipe",
  "Inhanguetá",
  "Itararé",
  "Jabour",
  "Jardim Camburi",
  "Jardim da Penha",
  "Jesus de Nazareth",
  "Joana D'Arc",
  "Jucutuquara",
  "Maria Ortiz",
  "Maruípe",
  "Mata da Praia",
  "Monte Belo",
  "Morada de Camburi",
  "Mário Cypreste",
  "Nazareth",
  "Nova Palestina",
  "Parque Moscoso",
  "Piedade",
  "Pontal de Camburi",
  "Praia do Canto",
  "Praia do Suá",
  "Redenção",
  "República",
  "Resistência",
  "Romão",
  "Santa Cecília",
  "Santa Clara",
  "Santa Helena",
  "Santa Lúcia",
  "Santa Luíza",
  "Santa Martha",
  "Santa Teresa",
  "Santo Antônio",
  "Santos Dumont",
  "São Benedito",
  "São Cristóvão",
  "São José",
  "São Pedro",
  "Solon Borges",
  "Tabuazeiro",
  "Universitário",
  "Vila Rubim"
];
