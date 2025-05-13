// controllers/article.controller.js
const Article = require('../models/article.model');

exports.getAll = async (req, res, next) => {
  try {
    const articles = await Article.find({});
    res.json(articles);
  } catch (error) {
    console.error('Erreur getAll:', error);
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    console.log('Données reçues:', req.body);
    
    const existingArticle = await Article.findOne({
      code: req.body.code
    });
    
    if (existingArticle) {
      return res.status(400).json({ message: 'Code article déjà utilisé' });
    }

    const article = new Article(req.body);

    await article.save();
    res.status(201).json(article);
  } catch (error) {
    console.error('Erreur create:', error);
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json(article);
  } catch (error) {
    console.error('Erreur update:', error);
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true }
    );
    
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json({ message: 'Article désactivé' });
  } catch (error) {
    console.error('Erreur delete:', error);
    next(error);
  }
};