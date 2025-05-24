// controllers/article.controller.js
const Article = require('../models/article.model');

exports.getAll = async (req, res, next) => {
  try {
    const { type, actif = true } = req.query;
    
    // Construire le filtre de recherche
    let filter = {};
   
    
    // Filtrer par type si spécifié
    if (type) {
      filter.type = type;
    }
    
    // Filtrer par statut actif/inactif
    if (actif !== undefined) {
      filter.actif = actif === 'true';
    }
    
    const articles = await Article.find(filter)
      .populate('categorie', 'nom description')
      .sort({ designation: 1 });
      
    res.json({
      success: true,
      data: articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Erreur getAll articles:', error);
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let filter = { _id: id };
    
    // Filtrer par entreprise si l'utilisateur n'est pas admin
    
    const article = await Article.findOne(filter)
      .populate('categorie', 'nom description');
    
    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Article non trouvé' 
      });
    }
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Erreur getById article:', error);
    next(error);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q: query, type, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'La recherche doit contenir au moins 2 caractères'
      });
    }
    
    let filter = {
      actif: true,
      $or: [
        { designation: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { codeBarre: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    
    // Filtrer par type si spécifié
    if (type) {
      filter.type = type;
    }
    
    const articles = await Article.find(filter)
      .populate('categorie', 'nom description')
      .limit(parseInt(limit))
      .sort({ designation: 1 });
      
    res.json({
      success: true,
      data: articles,
      count: articles.length,
      query: query
    });
  } catch (error) {
    console.error('Erreur search articles:', error);
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    console.log('Données reçues:', req.body);
    
    // Ajouter l'entreprise de l'utilisateur connecté
    const articleData = {
      ...req.body,
      entrepriseId: req.user.entrepriseId
    };
    
    // Vérifier l'unicité du code et du code-barres dans l'entreprise
    const existingArticle = await Article.findOne({
      entrepriseId: req.user.entrepriseId,
      $or: [
        { code: req.body.code },
        ...(req.body.codeBarre ? [{ codeBarre: req.body.codeBarre }] : [])
      ]
    });
    
    if (existingArticle) {
      return res.status(400).json({ 
        success: false,
        message: existingArticle.code === req.body.code ? 
          'Code article déjà utilisé dans cette entreprise' : 
          'Code à barre déjà utilisé dans cette entreprise' 
      });
    }

    // Initialiser les prix d'achat
    articleData.prixAchatMoyen = req.body.prixAchatHT || 0;
    articleData.dernierPrixAchat = req.body.prixAchatHT || 0;

    const article = new Article(articleData);
    await article.save();
    
    // Récupérer l'article créé avec les relations
    const createdArticle = await Article.findById(article._id)
      .populate('categorie', 'nom description');
    
    res.status(201).json({
      success: true,
      data: createdArticle,
      message: 'Article créé avec succès'
    });
  } catch (error) {
    console.error('Erreur create article:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Code article ou code-barres déjà utilisé'
      });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'article appartient à l'entreprise de l'utilisateur
    const currentArticle = await Article.findOne({
      _id: id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!currentArticle) {
      return res.status(404).json({ 
        success: false,
        message: 'Article non trouvé' 
      });
    }
    
    // Vérifier l'unicité du code et du code-barres pour les autres articles
    const existingArticle = await Article.findOne({
      _id: { $ne: id },
      entrepriseId: req.user.entrepriseId,
      $or: [
        { code: req.body.code },
        ...(req.body.codeBarre ? [{ codeBarre: req.body.codeBarre }] : [])
      ]
    });
    
    if (existingArticle) {
      return res.status(400).json({ 
        success: false,
        message: existingArticle.code === req.body.code ? 
          'Code article déjà utilisé' : 
          'Code à barre déjà utilisé' 
      });
    }

    // Si le prix d'achat a changé, mettre à jour le prix moyen et le dernier prix
    if (req.body.prixAchatHT !== undefined && req.body.prixAchatHT !== currentArticle.prixAchatHT) {
      const newPrixAchatMoyen = currentArticle.prixAchatMoyen === 0 ? 
        req.body.prixAchatHT : 
        (currentArticle.prixAchatMoyen + req.body.prixAchatHT) / 2;
      
      req.body.prixAchatMoyen = newPrixAchatMoyen;
      req.body.dernierPrixAchat = req.body.prixAchatHT;
    }

    const article = await Article.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('categorie', 'nom description');
    
    res.json({
      success: true,
      data: article,
      message: 'Article mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur update article:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Code article ou code-barres déjà utilisé'
      });
    }
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'article appartient à l'entreprise de l'utilisateur
    const article = await Article.findOne({
      _id: id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Article non trouvé' 
      });
    }
    
    // Désactiver l'article au lieu de le supprimer définitivement
    await Article.findByIdAndUpdate(
      id,
      { actif: false },
      { new: true }
    );
    
    res.json({ 
      success: true,
      message: 'Article désactivé avec succès' 
    });
  } catch (error) {
    console.error('Erreur delete article:', error);
    next(error);
  }
};