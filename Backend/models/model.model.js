const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['NLP', 'REGEX', 'ML'],
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  performance: {
    precision: Number,
    recall: Number,
    f1Score: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  trainedOn: {
    sampleCount: Number,
    entityTypes: [String]
  },
  filePath: String,
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Model', ModelSchema);
