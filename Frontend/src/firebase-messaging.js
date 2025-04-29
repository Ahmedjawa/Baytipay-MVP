const vapidKey = "BL0ceYKL_nJZ8sZuDXK0YXzIGRh66qiIM8EwPackIvsSTQHnO_ET_EeP_5CrEr9Jt5kt10rwMvVmAEv1jTGOjLU";

// Configuration de Firebase Messaging
function requestNotificationPermission() {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      getToken(messaging, { vapidKey }).then((currentToken) => {
        console.log('Token FCM:', currentToken);
        // Envoyez ce token à votre backend pour le stocker
      });
    }
  });
}