importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || "/";
  event.waitUntil(self.clients.openWindow(link));
});
