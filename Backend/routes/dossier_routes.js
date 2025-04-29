// routes/dossier.routes.js
const dossierRouter = express.Router();

dossierRouter.get('/', dossierController.getAll);
dossierRouter.get('/:id', dossierController.getById);
dossierRouter.post('/', dossierController.create);
dossierRouter.put('/:id', dossierController.update);
dossierRouter.delete('/:id', dossierController.delete);

module.exports = dossierRouter;