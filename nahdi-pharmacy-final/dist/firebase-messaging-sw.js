// Import and configure Firebase
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf4FUHcErictwyMdOMFt_HWxs5hlWpAKw",
  authDomain: "almatamed-11a07.firebaseapp.com",
  projectId: "almatamed-11a07",
  storageBucket: "almatamed-11a07.firebasestorage.app",
  messagingSenderId: "418460842186",
  appId: "1:418460842186:web:66c0100d2465c851719c33"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo192.png',
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((windowClients) => {
        const matchingClient = windowClients.find(
          (client) => client.url === urlToOpen
        );
        
        if (matchingClient) {
          return matchingClient.focus();
        } else {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
