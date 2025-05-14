const express = require('express');
const router = express.Router();
const categorieController = require('../controllers/categorie.controller');
const authMiddleware = require('../middlewares/auth');

// Middleware appliqué GLOBALEMENT à toutes les routes ci-dessous
router.use(authMiddleware); // <-- Suffit à protéger toutes les routes

// Routes protégées automatiquement
router.route('/')
  .get(categorieController.getAllCategories)
  .post(categorieController.createCategorie);

router.route('/type/:type')
  .get(categorieController.getCategoriesByType);

router.route('/search')
  .get(categorieController.searchCategories);

router.route('/entreprise/:entrepriseId')
  .get(categorieController.getCategoriesByEntreprise);

router.route('/:id')
  .get(categorieController.getCategorieById)
  .put(categorieController.updateCategorie)
  .delete(categorieController.deleteCategorie);

module.exports = router;