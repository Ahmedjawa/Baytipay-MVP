// client/src/utils/ocrDataMapper.js

/**
 * Utilitaire pour mapper les données OCR extraites vers le format de l'interface utilisateur
 * Gère la conversion des entités du format backend vers le format attendu par les composants React
 */
class OCRDataMapper {
  /**
   * Convertit les entités extraites par l'OCR vers le format de données attendu par ScanPage
   * 
   * @param {Object} ocrResponse - La réponse de l'API OCR (contient text, entities, etc.)
   * @returns {Object} - Données formatées pour l'interface utilisateur
   */
  mapOcrResponseToFormData(ocrResponse) {
    // Valeurs par défaut
    const formData = {
      title: '',
      date: '',
      amount: '',
      tax: '',
      totalAmount: '',
      vendor: '',
      category: '',
      reference: '',
      details: ''
    };
    
    // Si aucune donnée n'est disponible, retourner les valeurs par défaut
    if (!ocrResponse || !ocrResponse.entities) {
      console.warn('Aucune entité disponible dans la réponse OCR');
      return formData;
    }
    
    const { entities } = ocrResponse;
    
    console.log("Mappage des entités - noms disponibles:", Object.keys(entities));
    
    // Mappage des champs OCR vers les champs du formulaire
    this.mapField(entities, 'title', ['title', 'subject', 'objet'], formData);
    this.mapField(entities, 'date', ['date', 'invoice_date', 'date_facture'], formData);
    this.mapField(entities, 'amount', ['montantHT', 'montant_ht', 'amount', 'price', 'prix'], formData);
    this.mapField(entities, 'tax', ['tva', 'tax', 'taxes'], formData);
    this.mapField(entities, 'totalAmount', ['montantTTC', 'total_ttc', 'total', 'amount_total', 'montant_total'], formData);
    this.mapField(entities, 'vendor', ['vendor', 'recipient_name', 'fournisseur', 'emetteur'], formData);
    this.mapField(entities, 'reference', ['reference', 'ref', 'delivery_number', 'numero_facture', 'invoice_number'], formData);
    this.mapField(entities, 'details', ['details', 'description', 'product_description'], formData);
    
    // Détecter la catégorie en fonction du contenu
    formData.category = this.detectCategory(entities, ocrResponse.text);
    
    // Console log pour debug
    console.log('Données mappées:', formData);
    
    return formData;
  }
  
  /**
   * Mappe un champ depuis les entités OCR vers le formulaire
   * 
   * @param {Object} entities - Les entités extraites par l'OCR
   * @param {string} targetField - Le nom du champ cible dans le formulaire
   * @param {Array} sourceFields - Les noms possibles du champ dans les entités OCR
   * @param {Object} formData - L'objet de données du formulaire à mettre à jour
   */
  mapField(entities, targetField, sourceFields, formData) {
    console.log(`Tentative de mappage pour ${targetField} avec les champs sources:`, sourceFields);
    for (const field of sourceFields) {
      console.log(`Vérification du champ "${field}" dans les entités:`, entities[field]);
      if (entities[field] && entities[field].length > 0) {
        // Vérifier le contenu détaillé de l'entité pour le débogage
        console.log(`Entité trouvée: ${field}`, JSON.stringify(entities[field]));
        
        // Filtrer les entités non nulles
        const validEntities = entities[field].filter(entity => entity && entity.value !== null && entity.value !== undefined);
        
        if (validEntities.length > 0) {
          // Récupérer la valeur avec la confiance la plus élevée
          const bestMatch = validEntities.reduce((prev, current) => 
            (!current || !prev || !current.confidence || !prev.confidence || current.confidence > prev.confidence) ? current : prev
          );
          
          if (bestMatch && bestMatch.value !== null) {
            formData[targetField] = bestMatch.value;
            console.log(`Mappage réussi: ${field} -> ${targetField} = ${bestMatch.value}`);
            return; // Sortir dès qu'un champ correspondant est trouvé
          }
        } else {
          console.log(`Entité ${field} trouvée mais toutes les valeurs sont nulles ou invalides`);
        }
      }
    }
    
    console.log(`Aucune correspondance trouvée pour ${targetField} (recherché: ${sourceFields.join(', ')})`);
  }
  
  /**
   * Détecte la catégorie du document en fonction des entités extraites et du texte
   * 
   * @param {Object} entities - Les entités extraites par l'OCR
   * @param {string} text - Le texte complet extrait du document
   * @returns {string} - La catégorie détectée
   */
  detectCategory(entities, text = '') {
    const lowerText = text.toLowerCase();
    
    // Détection basée sur le texte
    if (lowerText.includes('facture') || lowerText.includes('invoice')) {
      return 'Facture';
    } else if (lowerText.includes('reçu') || lowerText.includes('receipt')) {
      return 'Reçu';
    } else if (lowerText.includes('devis') || lowerText.includes('quotation')) {
      return 'Devis';
    } else if (lowerText.includes('bon de livraison') || lowerText.includes('delivery')) {
      return 'Bon de livraison';
    } else if (lowerText.includes('vente') || lowerText.includes('sale')) {
      return 'Vente';
    } else if (lowerText.includes('achat') || lowerText.includes('purchase')) {
      return 'Achat';
    }
    
    // Détection basée sur la présence de certains champs
    if (entities.delivery_number) {
      return 'Bon de livraison';
    } else if (entities.total_ttc && entities.montant_ht) {
      return 'Facture';
    }
    
    return 'Autre';
  }
  
  /**
   * Formate les données financières pour l'affichage
   * 
   * @param {string} value - La valeur à formater (peut être un nombre ou une chaîne)
   * @returns {string} - La valeur formatée
   */
  formatCurrency(value) {
    if (!value) return '';
    
    // Convertir en nombre si c'est une chaîne
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    
    // Vérifier si la conversion a réussi
    if (isNaN(numValue)) return value;
    
    // Formater avec 2 décimales et séparateur de milliers
    return numValue.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

export default new OCRDataMapper();