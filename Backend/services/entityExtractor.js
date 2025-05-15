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
    this.manager.addNamedEntityText('tiers', 'fournisseur', ['fra'], [
      'STEG', 'Tunisie Telecom', 'Orange', 'Ooredoo', 'SONEDE',
      'Carrefour', 'Monoprix', 'Géant', 'MG', 'Total', 'Shell'
    ]);

    this.manager.addRegexEntity('reference', 'fra', /([A-Z]{2,3}[-\s]?\d{8}[-\s]?\d{3})/i);
    this.manager.addRegexEntity('reference', 'fra', /(facture|FACTURE|FAC)[-\s]?\d{8}[-\s]?\d{3}/i);
    this.manager.addRegexEntity('reference', 'fra', /\b([A-Z0-9]{2,10}[-/]\d{2,8})\b/);

    this.manager.addRegexEntity('montantTTC', 'fra', /total(?:\s+TTC)?[\s:]+(\d+[.,]\d{2})/i);
    this.manager.addRegexEntity('montantTTC', 'fra', /montant(?:\s+à\s+payer)?[\s:]+(\d+[.,]\d{2})/i);
    this.manager.addRegexEntity('montantTTC', 'fra', /(?:^|\s)(\d+[.,]\d{2})(?:\s+€|\s+EUR|\s+DT|\s+TND)/);

    this.manager.addRegexEntity('montantHT', 'fra', /(?:montant|total)(?:\s+HT)[\s:]+(\d+[.,]\d{2})/i);
    this.manager.addRegexEntity('montantHT', 'fra', /prix\s+HT[\s:]+(\d+[.,]\d{2})/i);

    this.manager.addRegexEntity('tva', 'fra', /TVA[\s:]+(\d+[.,]\d{2})/i);
    this.manager.addRegexEntity('tva', 'fra', /(?:TVA|T\.V\.A\.)\s+\d{1,2}(?:%|pour cent)[\s:]+(\d+[.,]\d{2})/i);

    this.manager.addRegexEntity('date', 'fra', /date[\s:]+(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i);
    this.manager.addRegexEntity('date', 'fra', /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/);
    this.manager.addRegexEntity('date', 'fra', /(\d{2,4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2})/);

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
    if (!dateStr) return null;
    
    // Essayer différents formats de date courants
    const formats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY', 
                     'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY.MM.DD',
                     'DD/MM/YY', 'DD-MM-YY', 'DD.MM.YY'];
    
    for (const format of formats) {
      const date = moment(dateStr, format, true);
      if (date.isValid()) {
        return date.format('YYYY-MM-DD');
      }
    }
    
    return null;
  }

  /**
   * Normalise un montant extrait
   * 
   * @param {string} amountStr - Montant extrait brut
   * @returns {string} - Montant normalisé ou null si invalide
   */
  formatAmount(amountStr) {
    if (!amountStr) return null;
    
    // Remplacer la virgule par un point pour le format numérique
    const normalized = amountStr.replace(',', '.');
    
    // Vérifier si c'est un nombre valide
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
      
      // Extraire les entités avec NLP.js
      const result = await this.manager.process('fra', cleanedText);
      const entities = {};
      
      // Traitement des entités trouvées
      if (result.entities && result.entities.length > 0) {
        result.entities.forEach(entity => {
          // Pour les entités qui peuvent apparaître plusieurs fois, garder la première occurrence
          if (!entities[entity.entity] || 
              (entity.entity === 'montantTTC' || entity.entity === 'montantHT' || entity.entity === 'tva')) {
            entities[entity.entity] = entity.sourceText;
          }
        });
      }
      
      // Extraction par expressions régulières pour les cas non détectés
      this.extractWithRegex(cleanedText, entities);
      
      // Normaliser les valeurs extraites
      return {
        fournisseur: entities.fournisseur || null,
        reference: entities.reference || null,
        date: this.formatDate(entities.date),
        montantHT: this.formatAmount(entities.montantHT),
        tva: this.formatAmount(entities.tva),
        montantTTC: this.formatAmount(entities.montantTTC)
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction des entités:', error);
      return {};
    }
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