// config/storage.config.js
/**
 * Configuration du stockage de fichiers pour l'application
 */
module.exports = {
  // Type de stockage (toujours 'local' dans cette implémentation)
  type: 'local',
  
  // Configuration du stockage local
  local: {
    // Répertoire de base pour les uploads (chemin relatif ou absolu)
    baseDir: process.env.FILE_UPLOAD_PATH || 'uploads',
    
    // Types de fichiers autorisés
    allowedTypes: [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    
    // Taille maximale des fichiers (10MB par défaut)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    
    // Création automatique des miniatures pour les images
    createThumbnails: true,
    
    // Configuration des miniatures
    thumbnails: {
      width: 300,
      height: 300,
      quality: 80
    },
    
    // Durée de conservation des fichiers temporaires (1 heure par défaut)
    tempFileAge: 3600000
  }
};