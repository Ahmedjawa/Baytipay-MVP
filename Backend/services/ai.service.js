// services/ai.service.js
const axios = require('axios');

// Fonction simple pour analyser les requêtes et générer des réponses basées sur des règles
function generateResponse(question) {
  question = question.toLowerCase();
  
  // Réponses prédéfinies pour certaines questions fréquentes
  const responses = {
    'bonjour': 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
    'salut': 'Salut ! En quoi puis-je vous être utile ?',
    'merci': 'Je vous en prie ! N\'hésitez pas si vous avez d\'autres questions.',
    'au revoir': 'Au revoir ! Passez une excellente journée.',
    'comment ça va': 'Je vais bien, merci de demander ! Comment puis-je vous aider ?',
    'qui es-tu': 'Je suis l\'assistant virtuel de BaytiPay, conçu pour vous aider avec vos questions sur notre plateforme.',
    'aide': 'Je peux vous aider sur plusieurs sujets comme la gestion de vos dossiers, transactions, et informations sur votre compte. Que souhaitez-vous savoir ?',
    'contact': 'Vous pouvez contacter notre équipe support à support@baytipay.com ou au +212 5XX-XXXXXX du lundi au vendredi, de 9h à 18h.',
  };

  // Vérifier les correspondances partielles
  for (const [key, value] of Object.entries(responses)) {
    if (question.includes(key)) {
      return value;
    }
  }

  // Réponses par catégorie en fonction de mots-clés
  if (question.includes('dossier') || question.includes('projet')) {
    return 'Pour gérer vos dossiers, vous pouvez accéder à la section "Dossiers" de notre application. Vous pourrez y créer de nouveaux dossiers, consulter ceux existants, et suivre leur progression.';
  }
  
  if (question.includes('paiement') || question.includes('transaction') || question.includes('argent')) {
    return 'Les transactions peuvent être effectuées dans l\'onglet "Transactions". Vous pouvez y voir l\'historique de vos opérations et en initier de nouvelles.';
  }
  
  if (question.includes('compte') || question.includes('profil') || question.includes('paramètres')) {
    return 'Vous pouvez gérer votre compte dans la section "Paramètres". Vous y trouverez des options pour modifier vos informations personnelles, définir vos préférences, et configurer les notifications.';
  }
  
  if (question.includes('client') || question.includes('fournisseur')) {
    return 'Vous pouvez gérer vos clients et fournisseurs dans leurs sections respectives. Cela vous permet d\'organiser vos contacts et de suivre vos relations commerciales.';
  }

  // Réponse par défaut si aucune correspondance n'est trouvée
  return 'Je ne suis pas sûr de comprendre votre question. Pourriez-vous reformuler ou me demander quelque chose concernant la gestion de dossiers, les transactions, ou les paramètres de votre compte ?';
}

module.exports = {
  // Version simple basée sur des règles
  askAI: (question) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const response = generateResponse(question);
        resolve(response);
      }, 500); // Délai simulé pour un effet plus naturel
    });
  },
  
  // OPTION: Version avancée avec API externe (à décommenter et configurer)
  /*
  askAI: async (question) => {
    try {
      // Remplacer par l'URL de votre API d'IA (OpenAI, Claude, etc.)
      const response = await axios.post(
        'https://api.votre-service-ia.com/chat',
        {
          prompt: question,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Erreur lors de la requête à l\'API IA:', error);
      return 'Désolé, je rencontre un problème technique. Veuillez réessayer plus tard.';
    }
  }
  */
};