import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const documentTypePrefix = {
  'FACTURE_TTC': 'FT',
  'FACTURE_PROFORMA': 'DP',
  'BON_LIVRAISON': 'BL'
};

export const documentNumberingService = {
  async getNextDocumentNumber(typeDocument) {
    try {
      const response = await axios.get(`${API_URL}/documents/next-number`, {
        params: { typeDocument }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du numéro de document:', error);
      throw error;
    }
  },

  formatDocumentNumber(typeDocument, number) {
    const prefix = documentTypePrefix[typeDocument] || 'XX';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = number.toString().padStart(5, '0');
    
    return `${prefix}${year}${month}${sequence}`;
  }
}; 