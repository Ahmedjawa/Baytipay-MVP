const Settings = require('../models/settings.model');

/**
 * Récupération des paramètres de l'entreprise
 * @route GET /api/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    
    const settings = await Settings.findOne({ entrepriseId });
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Paramètres non trouvés'
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres'
    });
  }
};

/**
 * Création ou mise à jour des paramètres
 * @route POST /api/settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { nom, formeJuridique, numeroFiscal, adresse, telephone, email, logoUrl } = req.body;

    // Vérifier si les paramètres existent déjà
    let settings = await Settings.findOne({ entrepriseId });

    if (settings) {
      // Mise à jour
      settings = await Settings.findOneAndUpdate(
        { entrepriseId },
        { $set: { nom, formeJuridique, numeroFiscal, adresse, telephone, email, logoUrl } },
        { new: true }
      );
    } else {
      // Création
      settings = new Settings({
        entrepriseId,
        nom,
        formeJuridique,
        numeroFiscal,
        adresse,
        telephone,
        email,
        logoUrl
      });
      await settings.save();
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des paramètres'
    });
  }
};

/**
 * Upload du logo
 * @route POST /api/settings/:id/logo
 */
exports.uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const { file } = req;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été uploadé'
      });
    }

    const settings = await Settings.findById(id);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Paramètres non trouvés'
      });
    }

    // Sauvegarder l'URL du logo
    settings.logoUrl = `/uploads/${file.filename}`;
    await settings.save();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du logo'
    });
  }
};
