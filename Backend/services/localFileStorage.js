// services/localFileStorage.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Promisify fs functions
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

/**
 * Service de stockage local de fichiers pour l'application de gestion de documents
 */
class LocalFileStorageService {
  constructor(options = {}) {
    // Configuration par défaut
    this.baseDir = options.baseDir || path.join(__dirname, '../uploads');
    this.allowedTypes = options.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB par défaut
    this.createThumbnails = options.createThumbnails !== false; // Création de miniatures par défaut
  }

  /**
   * Initialise les répertoires nécessaires pour le stockage
   */
  async initialize() {
    try {
      // Créer les répertoires de base pour les différents types de documents
      const directories = [
        this.baseDir,
        path.join(this.baseDir, 'documents'),
        path.join(this.baseDir, 'documents/factures'),
        path.join(this.baseDir, 'documents/recus'),
        path.join(this.baseDir, 'documents/devis'),
        path.join(this.baseDir, 'documents/bon_livraison'),
        path.join(this.baseDir, 'documents/bon_commande'),
        path.join(this.baseDir, 'temp'),
        path.join(this.baseDir, 'thumbnails')
      ];

      for (const dir of directories) {
        await this.ensureDirectoryExists(dir);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de stockage:', error);
      throw error;
    }
  }

  /**
   * Crée un répertoire s'il n'existe pas déjà
   * @param {string} directory - Chemin du répertoire à créer
   */
  async ensureDirectoryExists(directory) {
    try {
      await mkdirAsync(directory, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Génère un nom de fichier unique
   * @param {string} originalname - Nom original du fichier
   * @param {string} prefix - Préfixe optionnel (par exemple, type de document)
   * @returns {string} - Nom de fichier unique
   */
  generateUniqueFilename(originalname, prefix = '') {
    const ext = path.extname(originalname).toLowerCase();
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    return `${prefix ? prefix + '-' : ''}${timestamp}-${uuid}${ext}`;
  }

  /**
   * Sauvegarde un fichier à partir de données base64
   * @param {string} base64Data - Données du fichier en base64
   * @param {string} originalname - Nom original du fichier
   * @param {string} documentType - Type de document (facture, reçu, etc.)
   * @param {string} userId - ID de l'utilisateur propriétaire du document
   * @returns {Promise<object>} - Informations sur le fichier sauvegardé
   */
  async saveBase64File(base64Data, originalname, documentType = 'document', userId = null) {
    try {
      // Nettoyer les données base64 si nécessaire
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      // Détecter le type MIME
      const mimetype = this.detectMimeTypeFromBase64(base64Data);
      
      return this.saveBufferFile(buffer, originalname, mimetype, documentType, userId);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fichier base64:', error);
      throw error;
    }
  }

  /**
   * Détecter le type MIME à partir des données base64
   * @param {string} base64Data - Données du fichier en base64
   * @returns {string} - Type MIME détecté
   */
  detectMimeTypeFromBase64(base64Data) {
    // Extraire la partie du type MIME si présente
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,/);
    
    if (matches && matches.length > 1) {
      return matches[1];
    }
    
    // Détection basique à partir des premiers octets
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64.substring(0, 5), 'base64');
    
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return 'image/jpeg';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    } else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }
    
    return 'application/octet-stream';
  }

  /**
   * Sauvegarde un fichier à partir d'un buffer
   * @param {Buffer} buffer - Données du fichier
   * @param {string} originalname - Nom original du fichier
   * @param {string} mimetype - Type MIME du fichier
   * @param {string} documentType - Type de document (facture, reçu, etc.)
   * @param {string} userId - ID de l'utilisateur propriétaire du document
   * @returns {Promise<object>} - Informations sur le fichier sauvegardé
   */
  async saveBufferFile(buffer, originalname, mimetype, documentType = 'document', userId = null) {
    try {
      // Vérifier le type MIME
      if (!this.allowedTypes.includes(mimetype)) {
        throw new Error(`Type de fichier non autorisé: ${mimetype}`);
      }
      
      // Vérifier la taille du fichier
      if (buffer.length > this.maxFileSize) {
        throw new Error(`Taille de fichier trop grande: ${buffer.length} octets (max: ${this.maxFileSize} octets)`);
      }
      
      // Déterminer le dossier de destination en fonction du type de document
      let targetFolder = 'documents';
      if (['facture', 'factures'].includes(documentType)) {
        targetFolder = 'documents/factures';
      } else if (['reçu', 'reçus', 'recus'].includes(documentType)) {
        targetFolder = 'documents/recus';
      } else if (['devis'].includes(documentType)) {
        targetFolder = 'documents/devis';
      } else if (['bon_livraison'].includes(documentType)) {
        targetFolder = 'documents/bon_livraison';
      } else if (['bon_commande'].includes(documentType)) {
        targetFolder = 'documents/bon_commande';
      }
      
      // Générer un nom de fichier unique
      const filename = this.generateUniqueFilename(originalname, userId ? `${userId.substring(0, 8)}` : '');
      
      // Créer le dossier s'il n'existe pas déjà
      const directory = path.join(this.baseDir, targetFolder);
      await this.ensureDirectoryExists(directory);
      
      // Chemin complet du fichier
      const filePath = path.join(directory, filename);
      
      // Enregistrer le fichier
      await writeFileAsync(filePath, buffer);
      
      // Créer une miniature si c'est une image
      let thumbnailPath = null;
      if (this.createThumbnails && mimetype.startsWith('image/')) {
        thumbnailPath = await this.createThumbnail(buffer, filename);
      }
      
      return {
        filename,
        originalname,
        mimetype,
        size: buffer.length,
        path: path.join(targetFolder, filename),
        fullPath: filePath,
        url: `/uploads/${targetFolder}/${filename}`,
        thumbnailUrl: thumbnailPath ? `/uploads/thumbnails/${filename}` : null,
        documentType,
        userId,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fichier:', error);
      throw error;
    }
  }

  /**
   * Crée une miniature pour une image
   * @param {Buffer} buffer - Données de l'image
   * @param {string} filename - Nom du fichier
   * @returns {Promise<string>} - Chemin relatif de la miniature
   */
  async createThumbnail(buffer, filename) {
    try {
      const thumbnailDir = path.join(this.baseDir, 'thumbnails');
      await this.ensureDirectoryExists(thumbnailDir);
      
      const thumbnailPath = path.join(thumbnailDir, filename);
      
      // Redimensionner l'image avec sharp
      await sharp(buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      return `thumbnails/${filename}`;
    } catch (error) {
      console.error('Erreur lors de la création de la miniature:', error);
      return null;
    }
  }

  /**
   * Récupère un fichier
   * @param {string} filePath - Chemin relatif du fichier
   * @returns {Promise<Buffer>} - Contenu du fichier
   */
  async getFile(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      return await readFileAsync(fullPath);
    } catch (error) {
      console.error('Erreur lors de la récupération du fichier:', error);
      throw error;
    }
  }

  /**
   * Récupère les métadonnées d'un fichier
   * @param {string} filePath - Chemin relatif du fichier
   * @returns {Promise<Object>} - Métadonnées du fichier
   */
  async getFileInfo(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      const stats = await statAsync(fullPath);
      
      return {
        path: filePath,
        fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des informations du fichier:', error);
      throw error;
    }
  }

  /**
   * Supprime un fichier
   * @param {string} filePath - Chemin relatif du fichier
   * @returns {Promise<boolean>} - True si la suppression a réussi
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await unlinkAsync(fullPath);
      
      // Supprimer également la miniature si elle existe
      const filename = path.basename(filePath);
      const thumbnailPath = path.join(this.baseDir, 'thumbnails', filename);
      
      try {
        await unlinkAsync(thumbnailPath);
      } catch (error) {
        // Ignorer les erreurs si la miniature n'existe pas
        if (error.code !== 'ENOENT') {
          console.error('Erreur lors de la suppression de la miniature:', error);
        }
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // Fichier non trouvé
      }
      console.error('Erreur lors de la suppression du fichier:', error);
      throw error;
    }
  }

  /**
   * Liste les fichiers dans un répertoire
   * @param {string} directory - Répertoire à lister (relatif à baseDir)
   * @returns {Promise<Array>} - Liste des fichiers
   */
  async listFiles(directory = 'documents') {
    try {
      const fullPath = path.join(this.baseDir, directory);
      await this.ensureDirectoryExists(fullPath);
      
      const files = await readdirAsync(fullPath);
      const fileInfos = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(directory, file);
          return await this.getFileInfo(filePath);
        })
      );
      
      return fileInfos.filter(info => !info.isDirectory);
    } catch (error) {
      console.error('Erreur lors du listage des fichiers:', error);
      throw error;
    }
  }

  /**
   * Déplace un fichier
   * @param {string} sourcePath - Chemin relatif du fichier source
   * @param {string} targetPath - Chemin relatif de destination
   * @returns {Promise<object>} - Informations sur le fichier déplacé
   */
  async moveFile(sourcePath, targetPath) {
    try {
      const sourceFullPath = path.join(this.baseDir, sourcePath);
      const targetFullPath = path.join(this.baseDir, targetPath);
      
      // Vérifier que le fichier source existe
      await statAsync(sourceFullPath);
      
      // Créer le répertoire de destination si nécessaire
      await this.ensureDirectoryExists(path.dirname(targetFullPath));
      
      // Lire le fichier source
      const buffer = await readFileAsync(sourceFullPath);
      
      // Écrire le fichier à la destination
      await writeFileAsync(targetFullPath, buffer);
      
      // Supprimer le fichier source
      await unlinkAsync(sourceFullPath);
      
      return {
        path: targetPath,
        fullPath: targetFullPath,
        moved: true
      };
    } catch (error) {
      console.error('Erreur lors du déplacement du fichier:', error);
      throw error;
    }
  }

  /**
   * Crée un fichier temporaire
   * @param {Buffer} buffer - Contenu du fichier
   * @param {string} extension - Extension du fichier
   * @returns {Promise<string>} - Chemin complet du fichier temporaire
   */
  async createTempFile(buffer, extension = '.tmp') {
    try {
      const tempDir = path.join(this.baseDir, 'temp');
      await this.ensureDirectoryExists(tempDir);
      
      const filename = `temp-${Date.now()}-${uuidv4().substring(0, 8)}${extension}`;
      const filePath = path.join(tempDir, filename);
      
      await writeFileAsync(filePath, buffer);
      
      return filePath;
    } catch (error) {
      console.error('Erreur lors de la création du fichier temporaire:', error);
      throw error;
    }
  }

  /**
   * Nettoie les fichiers temporaires plus anciens qu'une certaine durée
   * @param {number} maxAge - Âge maximum des fichiers en millisecondes (1 heure par défaut)
   */
  async cleanupTempFiles(maxAge = 3600000) {
    try {
      const tempDir = path.join(this.baseDir, 'temp');
      
      // Vérifier que le répertoire existe
      try {
        await statAsync(tempDir);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return; // Le répertoire n'existe pas encore
        }
        throw error;
      }
      
      const files = await readdirAsync(tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await statAsync(filePath);
        
        // Supprimer les fichiers plus anciens que maxAge
        if (now - stats.mtimeMs > maxAge) {
          try {
            await unlinkAsync(filePath);
          } catch (error) {
            console.error(`Erreur lors de la suppression du fichier temporaire ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des fichiers temporaires:', error);
    }
  }
}

module.exports = LocalFileStorageService;