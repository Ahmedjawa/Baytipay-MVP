// server/services/pythonBridge.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Service de pont vers les scripts Python pour l'analyse avancée par ML
 */
class PythonBridgeService {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python';
    this.scriptPath = path.join(__dirname, '../python');
    this.modelStats = {
      lastCheck: null,
      version: null
    };
  }

  /**
   * Exécute un script Python et retourne sa sortie
   * @param {string} scriptName - Nom du script Python
   * @param {Array} args - Arguments à passer au script
   * @returns {Promise<any>} - Résultat de l'exécution
   */
  async executeScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
      const scriptFullPath = path.join(this.scriptPath, scriptName);
      
      console.log(`Exécution du script Python: ${scriptFullPath} avec arguments:`, args);
      
      const pythonProcess = spawn(this.pythonPath, [scriptFullPath, ...args]);
      
      let dataString = '';
      let errorString = '';
      
      // Collecter les données de sortie
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      // Collecter les erreurs
      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
        console.error(`Erreur Python: ${data}`);
      });
      
      // Gérer la fin du processus
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Le script Python s'est terminé avec le code: ${code}`);
          console.error(`Erreur: ${errorString}`);
          reject(new Error(`Erreur d'exécution Python: ${errorString}`));
        } else {
          try {
            // Tenter de parser la sortie comme JSON
            const result = JSON.parse(dataString);
            resolve(result);
          } catch (err) {
            // Si ce n'est pas du JSON, retourner la chaîne brute
            resolve(dataString.trim());
          }
        }
      });
    });
  }

  /**
   * Analyse un texte avec le parser simple Python
   * @param {string} imagePath - Chemin vers l'image
   * @param {string} text - Texte à analyser
   * @returns {Promise<Object>} - Entités extraites
   */
  async analyzeWithSimpleParser(imagePath, text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('Erreur: Texte OCR vide ou invalide');
      return { entities: {}, raw_results: {}, processing_time: 0 };
    }
    
    // Sauvegarder le texte dans un fichier temporaire
    const tempTextPath = path.join(this.scriptPath, `temp_${Date.now()}.txt`);
    
    try {
      // Assurer que le dossier python existe
      const pythonDir = path.dirname(tempTextPath);
      try {
        await fs.mkdir(pythonDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`Erreur lors de la création du dossier ${pythonDir}:`, err);
        }
      }
      
      // Écrire le texte dans le fichier
      await fs.writeFile(tempTextPath, text);
      console.log(`Texte OCR écrit dans ${tempTextPath}, longueur: ${text.length} caractères`);
      
      // Appeler le script Python
      const result = await this.executeScript('simple_invoice_parser.py', [tempTextPath, imagePath]);
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'analyse avec le parser Python:', error);
      throw error;
    } finally {
      // Nettoyer le fichier temporaire
      try {
        await fs.unlink(tempTextPath);
      } catch (err) {
        console.error('Erreur lors du nettoyage du fichier temporaire:', err);
      }
    }
  }

  /**
   * Analyse un texte avec le parser adaptatif qui utilise le ML
   * @param {string} text - Texte à analyser
   * @param {string} imagePath - Chemin vers l'image (optionnel)
   * @returns {Promise<Object>} - Entités extraites avec confiance
   */
  async analyzeWithAdaptiveParser(text, imagePath = null) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('Erreur: Texte OCR vide ou invalide');
      return { entities: {}, model_stats: { model_version: 1 } };
    }
    
    // Sauvegarder le texte dans un fichier temporaire
    const tempTextPath = path.join(this.scriptPath, `temp_${Date.now()}.txt`);
    
    try {
      // Assurer que le dossier python existe
      const pythonDir = path.dirname(tempTextPath);
      try {
        await fs.mkdir(pythonDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`Erreur lors de la création du dossier ${pythonDir}:`, err);
        }
      }
      
      // Écrire le texte dans le fichier
      await fs.writeFile(tempTextPath, text);
      
      const args = [tempTextPath];
      if (imagePath) {
        args.push(imagePath);
      }
      
      // Appeler le script Python qui utilise AdaptiveInvoiceParser
      const result = await this.executeScript('run_adaptive_parser.py', args);
      
      // Mettre à jour les stats du modèle
      if (result.model_stats) {
        this.modelStats = {
          lastCheck: new Date(),
          version: result.model_stats.model_version
        };
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'analyse avec le parser adaptatif:', error);
      throw error;
    } finally {
      // Nettoyer le fichier temporaire
      try {
        await fs.unlink(tempTextPath);
      } catch (err) {
        console.error('Erreur lors du nettoyage du fichier temporaire:', err);
      }
    }
  }

  /**
   * Envoie des retours utilisateurs au modèle pour apprentissage
   * @param {string} text - Texte original
   * @param {Object} extractedEntities - Entités extraites automatiquement
   * @param {Object} correctedEntities - Entités corrigées par l'utilisateur
   * @returns {Promise<Object>} - Résultat de l'enregistrement
   */
  async sendFeedbackToModel(text, extractedEntities, correctedEntities) {
    // Créer un fichier temporaire avec les données JSON
    const tempDataPath = path.join(this.scriptPath, `feedback_${Date.now()}.json`);
    const feedbackData = JSON.stringify({
      text,
      original: extractedEntities,
      corrected: correctedEntities
    });
    
    try {
      // Assurer que le dossier python existe
      const pythonDir = path.dirname(tempDataPath);
      try {
        await fs.mkdir(pythonDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`Erreur lors de la création du dossier ${pythonDir}:`, err);
        }
      }
      
      await fs.writeFile(tempDataPath, feedbackData);
      
      try {
        // Appeler le script Python pour enregistrer le feedback
        const result = await this.executeScript('record_feedback.py', [tempDataPath]);
        
        // Mettre à jour les stats du modèle si disponibles
        if (result.model_version) {
          this.modelStats.version = result.model_version;
          this.modelStats.lastCheck = new Date();
        }
        
        return result;
      } catch (error) {
        console.error('Erreur lors de l\'envoi du feedback au modèle:', error);
        throw error;
      }
    } finally {
      // Nettoyer le fichier temporaire
      try {
        await fs.unlink(tempDataPath);
      } catch (err) {
        console.error('Erreur lors du nettoyage du fichier de feedback:', err);
      }
    }
  }

  /**
   * Récupère les statistiques actuelles du modèle
   * @returns {Promise<Object>} - Statistiques du modèle
   */
  async getModelStats() {
    // Si les stats ont été récupérées récemment, les retourner directement
    if (this.modelStats.lastCheck && 
        ((new Date() - this.modelStats.lastCheck) < 60 * 1000)) { // Moins d'une minute
      return this.modelStats;
    }
    
    try {
      // Appeler le script Python pour obtenir les stats
      const result = await this.executeScript('get_model_stats.py');
      
      // Mettre à jour les stats en cache
      this.modelStats = {
        lastCheck: new Date(),
        ...result
      };
      
      return this.modelStats;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats du modèle:', error);
      
      // En cas d'erreur, retourner les dernières stats connues
      return this.modelStats;
    }
  }
}

module.exports = new PythonBridgeService();