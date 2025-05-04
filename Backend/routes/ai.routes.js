// routes/ai.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { validate } = require('../middlewares/validation');
const Joi = require('joi');

const aiSchema = {
  body: Joi.object({
    question: Joi.string().min(3).required()
  })
};

router.post('/ask', validate(aiSchema), aiController.askAI);

module.exports = router;
