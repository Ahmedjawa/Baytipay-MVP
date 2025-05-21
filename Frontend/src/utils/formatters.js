export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR');
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'TND',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value);
};