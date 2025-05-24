const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');
const CategorieArticle = require('../models/categorieArticle.model');

router.use(authMiddleware);

// Routes pour les catégories d'articles
router.get('/categories-articles', async (req, res) => {
  try {
    const categories = await CategorieArticle.find({ 
      entrepriseId: req.user.entrepriseId,
      actif: true 
    }).sort('nom');
    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
  }
});

router.post('/categories-articles',
  celebrate({
    body: Joi.object({
      nom: Joi.string().required(),
      description: Joi.string().allow('', null)
    })
  }),
  async (req, res) => {
    try {
      const existingCategory = await CategorieArticle.findOne({
        nom: req.body.nom,
        entrepriseId: req.user.entrepriseId
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Cette catégorie existe déjà' });
      }

      const categorie = new CategorieArticle({
        ...req.body,
        entrepriseId: req.user.entrepriseId,
        creePar: req.user._id
      });

      await categorie.save();
      res.status(201).json(categorie);
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
    }
  }
);

router.put('/categories-articles/:id',
  celebrate({
    body: Joi.object({
      nom: Joi.string().required(),
      description: Joi.string().allow('', null)
    })
  }),
  async (req, res) => {
    try {
      const existingCategory = await CategorieArticle.findOne({
        nom: req.body.nom,
        entrepriseId: req.user.entrepriseId,
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Cette catégorie existe déjà' });
      }

      const categorie = await CategorieArticle.findOneAndUpdate(
        { _id: req.params.id, entrepriseId: req.user.entrepriseId },
        req.body,
        { new: true }
      );

      if (!categorie) {
        return res.status(404).json({ message: 'Catégorie non trouvée' });
      }

      res.json(categorie);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie' });
    }
  }
);

router.delete('/categories-articles/:id', async (req, res) => {
  try {
    const categorie = await CategorieArticle.findOneAndUpdate(
      { _id: req.params.id, entrepriseId: req.user.entrepriseId },
      { actif: false },
      { new: true }
    );

    if (!categorie) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    res.json({ message: 'Catégorie désactivée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la désactivation de la catégorie:', error);
    res.status(500).json({ message: 'Erreur lors de la désactivation de la catégorie' });
  }
});

module.exports = router; 