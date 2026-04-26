import { useEffect, useState } from 'react';
import { messaging, db, auth, handleFirestoreError, OperationType } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && messaging) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging);
            if (token) {
              setFcmToken(token);
              // Save token under the user's document or a subcollection
              await setDoc(doc(db, `users/${user.uid}/fcmTokens`, token), {
                token,
                createdAt: new Date().toISOString(),
                device: navigator.userAgent
              }).catch(e => {
                throw handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/fcmTokens/${token}`);
              });
            }
          }
        } catch (error) {
          console.error('Error getting push token', error);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // We could use a toast notification here
        if (payload.notification && payload.notification.title) {
          // Check if the browser supports standard Notifications and request permission if needed
          if (Notification.permission === 'granted') {
             new Notification(payload.notification.title, {
               body: payload.notification.body,
               icon: '/icon.svg'
             });
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  return { fcmToken };
};
