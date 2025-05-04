module.exports = {
  roles: ['admin', 'gestionnaire', 'comptable', 'consultant'],
  permissions: {
    admin: ['manage_all'],
    gestionnaire: [
      'manage_dossiers', 
      'manage_echeances',
      'manage_transactions'
    ],
    comptable: [
      'manage_transactions',
      'manage_caisse'
    ],
    consultant: ['view_reports']
  }
};