const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  extractedEntities: {
    type: Object
  },
  correctedEntities: {
    type: Object
  },
  userId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
