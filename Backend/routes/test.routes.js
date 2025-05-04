const express = require('express');
const router = express.Router();
const Dossier = require('../models/dossier.model');

router.get('/test-data', async (req, res) => {
  try {
    const count = await Dossier.countDocuments();
    res.json({ 
      message: 'Backend opérationnel',
      dossierCount: count,
      timestamp: new Date() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;