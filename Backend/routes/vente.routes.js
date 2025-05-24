// routes/vente.routes.js
const express = require('express');
const router = express.Router();
const venteController = require('../controllers/vente.controller');
const authMiddleware = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET all sales
router.get('/', venteController.getAllVentes);

// GET sale by ID
router.get('/:id', venteController.getVenteById);

// CREATE new sale
router.post('/', venteController.createVente);

// UPDATE sale
router.put('/:id', venteController.updateVente);

// DELETE sale
router.delete('/:id', venteController.deleteVente);

// POST to transform a devis into a bon de livraison
router.post('/:id/transformer-bon-livraison', venteController.transformerEnBonLivraison);

// POST to transform a devis into a facture
router.post('/:id/transformer-en-facture', venteController.transformerEnFacture);

// POST to transform multiple devis into a bon de livraison
router.post('/transformer-devis-en-bl', venteController.transformerDevisEnBL);

// POST to transform multiple bon de livraison into factures
router.post('/transformer-bl-en-factures', venteController.transformerBLEnFactures);

// POST to transform multiple documents into a new document (generic route)
router.post('/transformer-documents', venteController.transformerDocuments);

// POST to generate a complement document
router.post('/:id/generer-document-complementaire', async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }
    const documentComplementaire = await vente.genererDocumentComplementaire(req.body.typeDocument, req.body.options);
    res.json({ success: true, data: documentComplementaire });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;