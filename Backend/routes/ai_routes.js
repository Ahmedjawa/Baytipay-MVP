// routes/ai.routes.js
const aiRouter = express.Router();

aiRouter.post('/chat', aiController.chat);
aiRouter.post('/image-recognition', aiController.recognizeImage);

module.exports = aiRouter;

// routes/dashboard.routes.js
const dashboardRouter = express.Router();

dashboardRouter.get('/', dashboardController.getData);

module.exports = dashboardRouter;