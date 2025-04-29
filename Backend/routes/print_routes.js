// routes/print.routes.js
const printRouter = express.Router();

printRouter.post('/', printController.generatePrintable);

module.exports = printRouter;

// Ajouter la route d'impression au serveur
app.use('/api/print', printRouter);