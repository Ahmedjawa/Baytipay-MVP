import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';

export default function NotificationCenter() {
  useEffect(() => {
    const messaging = getMessaging();
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message reçu:', payload);
      // Exemple: Afficher toast et mettre à jour le state global
    });

    return () => unsubscribe();
  }, []);

  return null;
}