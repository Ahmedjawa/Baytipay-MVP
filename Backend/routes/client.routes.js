// client.routes.js (Corrigé)
const express = require('express');
const router = express.Router();
const controller = require('../controllers/client.controller');

// Routes corrigées (suppression de "/clients" redondant)
router.post('/', controller.createClient);          // POST /api/clients
router.get('/', controller.getAllClients);         // GET /api/clients
router.get('/:id', controller.getClientById);      // GET /api/clients/:id
router.put('/:id', controller.updateClient);       // PUT /api/clients/:id
router.delete('/:id', controller.deleteClient);    // DELETE /api/clients/:id

module.exports = router;