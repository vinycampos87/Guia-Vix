import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getDocFromServer, doc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import { safeStringify } from './lib/utils';

const appConfig = { ...firebaseConfig };

// Se estiver rodando no Netlify, usa o domínio do Netlify para o painel de Auth (Remove o post-15... do consentimento)
if (window.location.hostname === 'guiavix.netlify.app' || window.location.hostname === 'www.guiavix.netlify.app') {
  appConfig.authDomain = window.location.hostname;
}

const app = initializeApp(appConfig);

// Using standard initialization with memory cache to resolve assertion errors
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export let messaging: any = null;

isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuth();
  
  // Safely extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  // Convert to string before logging to prevent circular structure errors
  // with some environment's console.error implementations
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Firestore Error] ${operationType} on ${path}:`, errorMessage);
    // Log details as a stringified JSON safely
    console.error('Error Details:', safeStringify(errInfo));
  }

  // Return stringified JSON for ErrorBoundary to consume
  try {
    return new Error(safeStringify(errInfo));
  } catch (e) {
    return new Error(errorMessage || "An unknown error occurred");
  }
}

// Simple connection test as per guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client is offline. Config may be incorrect.");
    }
  }
}
testConnection();
