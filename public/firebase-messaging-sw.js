importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  "projectId": "post-1501187181313",
  "appId": "1:112180991401:web:288df4c4e8cb4203b8e0b8",
  "apiKey": "AIzaSyA8hp0x0sWPi9veQPLsbCKJF33WTca0NW4",
  "authDomain": "post-1501187181313.firebaseapp.com",
  "messagingSenderId": "112180991401"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Update';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
