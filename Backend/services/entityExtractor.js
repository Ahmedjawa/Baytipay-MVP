// server/services/entityExtractor.js
const { NlpManager } = require('node-nlp');
const moment = require('moment');

/**
 * Service d'extraction d'entités à partir de texte OCR
 * Utilise des techniques de NLP pour identifier des informations pertinentes
 */
class EntityExtractor {
  constructor() {
    this.manager = new NlpManager({ languages: ['fra'], forceNER: true });
    this.initialize();
  }

  /**
   * Initialise le modèle NLP avec des entités spécifiques
   */
  async initialize() {
    // Définir les entités et modèles à reconnaître
    // Référence - Patterns plus complets
this.manager.addRegexEntity('reference', 'fra', 
  /(?:REF|Réf|Facture|FAC)[\s:-]*([A-Z0-9]{4,}[-\/][A-Z0-9]{4,})/i
);
this.manager.addRegexEntity('reference', 'fra', 
  /\b(?:[A-Z]{2,5}-\d{3,8}-\d{2,4}|[A-Z]{3,}\d{4,})\b/
);

// Dates - Meilleure gestion des formats
this.manager.addRegexEntity('date', 'fra', 
  /(?:date|échéance|le)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
);

// Montants - Capture plus robuste
this.manager.addRegexEntity('montantTTC', 'fra', 
  /total\s+(?:ttc|à\s+payer)[\s:]+([\d\s]+[.,]\d{2})/i
);
this.manager.addRegexEntity('montantHT', 'fra', 
  /montant\s+ht[\s:]+([\d\s]+[.,]\d{2})/i
);

    // Entraîner le modèle
    await this.manager.train();
  }

  /**
   * Détecte le type de document basé sur son contenu
   * 
   * @param {string} text - Texte extrait du document
   * @returns {string} - Type de document détecté
   */
  detectDocumentType(text) {
    const normalizedText = text.toLowerCase();
    
    if (normalizedText.includes('facture') || normalizedText.includes('invoice')) {
      return 'facture';
    } else if (normalizedText.includes('reçu') || normalizedText.includes('ticket') || 
               normalizedText.includes('caisse')) {
      return 'reçu';
    } else if (normalizedText.includes('devis') || normalizedText.includes('estimation')) {
      return 'devis';
    } else if (normalizedText.includes('bon de livraison') || normalizedText.includes('livré')) {
      return 'bon_livraison';
    } else if (normalizedText.includes('commande')) {
      return 'bon_commande';
    } else {
      return 'document';
    }
  }

  /**
   * Nettoie et normalise le texte avant extraction
   * 
   * @param {string} text - Texte brut
   * @returns {string} - Texte nettoyé
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalise une date extraite au format YYYY-MM-DD
   * 
   * @param {string} dateStr - Date extraite brute
   * @returns {string} - Date normalisée ou null si invalide
   */
formatDate(dateStr) {
  // Nettoyage préalable
  const cleaned = dateStr
    ?.replace(/[^0-9\/\-.]/g, '')
    .replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3'); // Correction des dates collées
  
  const formats = [
    'DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD',
    'DD.MM.YYYY', 'YYYY/MM/DD', 'DD/MM/YY'
  ];

  const date = moment(cleaned, formats, true);
  return date.isValid() ? date.format('YYYY-MM-DD') : null;
}

  /**
   * Normalise un montant extrait
   * 
   * @param {string} amountStr - Montant extrait brut
   * @returns {string} - Montant normalisé ou null si invalide
   */
 
formatAmount(amountStr) {
  if (!amountStr) return null;
  
  // Gestion des séparateurs de milliers
  const normalized = amountStr
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');

  const amount = parseFloat(normalized);
  return isNaN(amount) ? null : amount.toFixed(2);
}

  /**
   * Extrait toutes les entités pertinentes du texte
   * 
   * @param {string} text - Texte du document
   * @returns {object} - Entités extraites
   */
 async extractEntities(text) {
  try {
    const cleanedText = this.cleanText(text);
    
    // Ajouter un prétraitement supplémentaire
    const enhancedText = cleanedText
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Séparation des mots collés
      .replace(/[|¦]/g, 'I'); // Correction de caractères mal OCRisés

    const result = await this.manager.process('fra', enhancedText);
    
    // Nouvelle logique de priorisation des entités
    const entities = result.entities.reduce((acc, entity) => {
      if (!acc[entity.entity] || entity.score > acc[entity.entity].score) {
        acc[entity.entity] = {
          value: entity.sourceText,
          score: entity.score
        };
      }
      return acc;
    }, {});

    // Extraction secondaire améliorée
    this.extractWithRegex(enhancedText, entities);

    return {
      fournisseur: entities.tiers?.value || this.findVendor(enhancedText),
      reference: entities.reference?.value || this.findReference(enhancedText),
      date: this.formatDate(entities.date?.value),
      montantHT: this.formatAmount(entities.montantHT?.value),
      tva: this.formatAmount(entities.tva?.value),
      montantTTC: this.formatAmount(entities.montantTTC?.value)
    };
  } catch (error) {
    console.error('Erreur lors de l\'extraction des entités:', error);
    return {};
  }
}

// Nouvelle méthode de recherche des fournisseurs
findVendor(text) {
  const vendors = ['STEG', 'Tunisie Telecom', 'Orange', 'Ooredoo', 'SONEDE'];
  return vendors.find(vendor => 
    new RegExp(`\\b${vendor}\\b`, 'i').test(text)
  ) || null;
}
findReference(text) {
  const refPatterns = [
    /(?:REF|Réf|Facture|FAC)[\s:-]*([A-Z0-9]{4,}[-\/][A-Z0-9]{4,})/i,
    /\b(?:[A-Z]{2,5}-\d{3,8}-\d{2,4}|[A-Z]{3,}\d{4,})\b/
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}

  /**
   * Extraction de secours par expressions régulières
   * 
   * @param {string} text - Texte nettoyé
   * @param {object} entities - Objet d'entités à compléter
   */
  extractWithRegex(text, entities) {
    // Extraction de la date si non détectée
    if (!entities.date) {
      const dateRegex = /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/;
      const dateMatch = text.match(dateRegex);
      if (dateMatch) {
        entities.date = dateMatch[1];
      }
    }
    
    // Extraction du montant total si non détecté
    if (!entities.montantTTC) {
      const totalRegex = /total(?:\s+ttc)?[\s:]+(\d+[.,]\d{2})/i;
      const totalMatch = text.match(totalRegex);
      if (totalMatch) {
        entities.montantTTC = totalMatch[1];
      }
    }
    
    // Extraction du montant HT si non détecté
    if (!entities.montantHT) {
      const htRegex = /total(?:\s+ht)[\s:]+(\d+[.,]\d{2})/i;
      const htMatch = text.match(htRegex);
      if (htMatch) {
        entities.montantHT = htMatch[1];
      }
    }
    
    // Extraction de la TVA si non détectée
    if (!entities.tva) {
      const tvaRegex = /tva[\s:]+(\d+[.,]\d{2})/i;
      const tvaMatch = text.match(tvaRegex);
      if (tvaMatch) {
        entities.tva = tvaMatch[1];
      }
    }
  }
}

module.exports = new EntityExtractor();