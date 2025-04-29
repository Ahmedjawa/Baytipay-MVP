// routes/caisse.routes.js
const caisseRouter = express.Router();

caisseRouter.get('/', caisseController.getAll);
caisseRouter.get('/:id', caisseController.getById);
caisseRouter.post('/', caisseController.create);
caisseRouter.put('/:id', caisseController.update);
caisseRouter.post('/:id/entree', caisseController.addEntree);
caisseRouter.post('/:id/sortie', caisseController.addSortie);
caisseRouter.delete('/:id', caisseController.delete);

module.exports = caisseRouter;