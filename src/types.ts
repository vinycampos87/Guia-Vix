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
  // SEO Fields
  siteTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogImage?: string;
  googleAnalyticsId?: string;
  indexingEnabled?: boolean;
  homeBanners?: HomeBanner[];
}

export interface HomeBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
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
  city?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  ifoodUrl?: string;
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
  city?: string;
  neighborhood?: string;
  ownerId: string;
  createdAt: any;
}

export interface Job {
  id: string;
  title: string;
  companyName: string;
  city: string;
  neighborhood?: string;
  description: string;
  salary?: string;
  contact: string;
  whatsapp?: string;
  email?: string;
  bannerImage?: string;
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
  "Bebidas",
  "Sorveteria & Açaí",
  "Outros"
];

export const ES_CITIES = [
  "Vitória",
  "Vila Velha",
  "Serra",
  "Cariacica",
  "Guarapari",
  "Viana",
  "Fundão"
];
