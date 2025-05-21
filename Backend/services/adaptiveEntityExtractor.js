// services/adaptiveEntityExtractor.js
const { NlpManager } = require('node-nlp');
const moment = require('moment');

/**
 * Version évolutive de l'extracteur d'entités qui intègre l'apprentissage
 * à partir des retours utilisateurs
 */
class AdaptiveEntityExtractor {
  constructor() {
    this.manager = new NlpManager({ languages: ['fra'], forceNER: true });
    this.trainingData = [];
    this.modelVersion = 1;
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
    console.log(`Modèle initialisé: version ${this.modelVersion}`);
  }

  /**
   * Enregistre les corrections utilisateur et les utilise pour l'apprentissage
   * @param {string} originalText - Texte original
   * @param {object} extractedEntities - Entités extraites automatiquement
   * @param {object} correctedEntities - Entités corrigées par l'utilisateur
   */
  async recordFeedback(originalText, extractedEntities, correctedEntities) {
    this.trainingData.push({
      text: originalText,
      original: extractedEntities,
      corrected: correctedEntities,
      timestamp: new Date()
    });

    // Si suffisamment de nouvelles données, déclencher un réentraînement
    if (this.trainingData.length >= 50) {
      await this.trainModel();
    }
    
    return {
      pendingTrainingData: this.trainingData.length,
      modelVersion: this.modelVersion
    };
  }

  /**
   * Réentraîne le modèle avec les nouvelles données
   */
  async trainModel() {
    try {
      console.log(`Début de l'entraînement du modèle avec ${this.trainingData.length} échantillons...`);
      
      // Logique de réentraînement du modèle NLP avec les nouvelles données
      for (const sample of this.trainingData) {
        // Ajouter des patterns basés sur les corrections
        for (const [entityName, value] of Object.entries(sample.corrected)) {
          if (value && (!sample.original[entityName] || JSON.stringify(value) !== JSON.stringify(sample.original[entityName]))) {
            // Créer un nouveau pattern pour cette entité
            await this.addPatternForEntity(entityName, sample.text, value);
          }
        }
      }
      
      await this.manager.train();
      this.modelVersion++;
      this.trainingData = []; // Réinitialiser après entraînement
      
      console.log(`Modèle réentraîné: version ${this.modelVersion}`);
      return this.modelVersion;
    } catch (error) {
      console.error('Erreur lors du réentraînement du modèle:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau pattern pour une entité basé sur un feedback utilisateur
   * @param {string} entityName - Nom de l'entité
   * @param {string} context - Texte complet
   * @param {any} value - Valeur correcte de l'entité
   */
  async addPatternForEntity(entityName, context, value) {
    if (Array.isArray(value)) {
      // Si value est un tableau, on utilise la première valeur pour le pattern
      value = value[0].value || value[0];
    } else if (typeof value === 'object') {
      // Si value est un objet, on extrait sa propriété "value"
      value = value.value || JSON.stringify(value);
    }
    
    // Conversion en chaîne si nécessaire
    const strValue = String(value);
    
    // Créer un pattern robuste basé sur le contexte et la valeur
    const escapedValue = strValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = this.generateContextualPattern(context, escapedValue);
    
    try {
      // Ajouter le pattern au manager
      this.manager.addRegexEntity(entityName, 'fra', new RegExp(pattern, 'i'));
      console.log(`Nouveau pattern ajouté pour ${entityName}: ${pattern}`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'ajout du pattern pour ${entityName}:`, error);
      return false;
    }
  }

  /**
   * Génère un pattern contextuel basé sur le contexte autour de la valeur
   * @param {string} context - Texte complet 
   * @param {string} value - Valeur à rechercher
   * @returns {string} - Pattern contextuel
   */
  generateContextualPattern(context, value) {
    const valuePos = context.indexOf(value);
    
    if (valuePos === -1) {
      // Si la valeur n'est pas trouvée dans le contexte, retourner un pattern simple
      return `${value}`;
    }
    
    // Extraire le contexte avant et après la valeur (10 caractères)
    const beforeContext = context.substring(Math.max(0, valuePos - 20), valuePos).trim();
    
    if (beforeContext) {
      // Échapper les caractères spéciaux regex dans le contexte
      const escapedBefore = beforeContext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Créer un pattern avec lookbehind pour capturer la valeur après un certain contexte
      return `${escapedBefore}\\s*${value}`;
    } else {
      return `\\b${value}\\b`;
    }
  }

  /**
   * Détecte le type de document basé sur son contenu
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
   * @param {string} text - Texte du document
   * @returns {object} - Entités extraites avec informations de confiance
   */
  async extractEntities(text) {
    try {
      const cleanedText = this.cleanText(text);
      
      // Ajouter un prétraitement supplémentaire
      const enhancedText = cleanedText
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Séparation des mots collés
        .replace(/[|¦]/g, 'I'); // Correction de caractères mal OCRisés

      const result = await this.manager.process('fra', enhancedText);
      
      // Transformez les entités en format attendu avec metadata
      const entities = {};
      
      result.entities.forEach(entity => {
        if (!entities[entity.entity]) {
          entities[entity.entity] = [];
        }
        
        entities[entity.entity].push({
          value: entity.sourceText,
          confidence: entity.accuracy || 0.8,
          source: 'nlp_model'
        });
      });

      // Extraction secondaire pour les cas non couverts par le NLP
      this.extractWithRegex(enhancedText, entities);
      
      // Normalisation des entités communes
      const normalizedEntities = {
        fournisseur: entities.tiers || this.findVendorEntities(enhancedText),
        reference: entities.reference || this.findReferenceEntities(enhancedText),
        date: entities.date ? entities.date.map(e => ({
          ...e,
          value: this.formatDate(e.value)
        })) : null,
        montantHT: entities.montantHT ? entities.montantHT.map(e => ({
          ...e,
          value: this.formatAmount(e.value)
        })) : null,
        tva: entities.tva ? entities.tva.map(e => ({
          ...e,
          value: this.formatAmount(e.value)
        })) : null,
        montantTTC: entities.montantTTC ? entities.montantTTC.map(e => ({
          ...e,
          value: this.formatAmount(e.value)
        })) : null
      };
      
      // Filtrer les entités null
      return Object.fromEntries(
        Object.entries(normalizedEntities)
        .filter(([_, value]) => value !== null && value.length > 0)
      );
    } catch (error) {
      console.error('Erreur lors de l\'extraction des entités:', error);
      return {};
    }
  }

  /**
   * Recherche des fournisseurs dans le texte et les retourne au format entité
   * @param {string} text - Texte du document
   * @returns {Array} - Liste d'entités fournisseur
   */
  findVendorEntities(text) {
    const vendors = ['STEG', 'Tunisie Telecom', 'Orange', 'Ooredoo', 'SONEDE'];
    const found = vendors.find(vendor => 
      new RegExp(`\\b${vendor}\\b`, 'i').test(text)
    );
    
    return found ? [{
      value: found,
      confidence: 0.9,
      source: 'rule_based'
    }] : null;
  }

  /**
   * Recherche des références dans le texte et les retourne au format entité
   * @param {string} text - Texte du document
   * @returns {Array} - Liste d'entités référence
   */
  findReferenceEntities(text) {
    const refPatterns = [
      /(?:REF|Réf|Facture|FAC)[\s:-]*([A-Z0-9]{4,}[-\/][A-Z0-9]{4,})/i,
      /\b(?:[A-Z]{2,5}-\d{3,8}-\d{2,4}|[A-Z]{3,}\d{4,})\b/
    ];

    for (const pattern of refPatterns) {
      const match = text.match(pattern);
      if (match) {
        return [{
          value: match[1] || match[0],
          confidence: 0.85,
          source: 'rule_based'
        }];
      }
    }
    return null;
  }

  /**
   * Extraction de secours par expressions régulières
   * @param {string} text - Texte nettoyé
   * @param {object} entities - Objet d'entités à compléter
   */
  extractWithRegex(text, entities) {
    // Extraction de la date si non détectée
    if (!entities.date) {
      const dateRegex = /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/;
      const dateMatch = text.match(dateRegex);
      if (dateMatch) {
        entities.date = [{
          value: dateMatch[1],
          confidence: 0.7,
          source: 'regex'
        }];
      }
    }
    
    // Extraction du montant total si non détecté
    if (!entities.montantTTC) {
      const totalRegex = /total(?:\s+ttc)?[\s:]+(\d+[.,]\d{2})/i;
      const totalMatch = text.match(totalRegex);
      if (totalMatch) {
        entities.montantTTC = [{
          value: totalMatch[1],
          confidence: 0.75,
          source: 'regex'
        }];
      }
    }
    
    // Extraction du montant HT si non détecté
    if (!entities.montantHT) {
      const htRegex = /total(?:\s+ht)[\s:]+(\d+[.,]\d{2})/i;
      const htMatch = text.match(htRegex);
      if (htMatch) {
        entities.montantHT = [{
          value: htMatch[1],
          confidence: 0.75,
          source: 'regex'
        }];
      }
    }
    
    // Extraction de la TVA si non détectée
    if (!entities.tva) {
      const tvaRegex = /tva[\s:]+(\d+[.,]\d{2})/i;
      const tvaMatch = text.match(tvaRegex);
      if (tvaMatch) {
        entities.tva = [{
          value: tvaMatch[1],
          confidence: 0.75,
          source: 'regex'
        }];
      }
    }
  }

  /**
   * Obtient les statistiques actuelles du modèle
   * @returns {Object} - Informations sur le modèle
   */
  getModelStats() {
    return {
      modelVersion: this.modelVersion,
      pendingTrainingData: this.trainingData.length,
      lastUpdated: new Date(),
      entityTypes: Object.keys(this.manager.nlp.ner.rules['fra'] || {})
    };
  }
}

module.exports = new AdaptiveEntityExtractor();
