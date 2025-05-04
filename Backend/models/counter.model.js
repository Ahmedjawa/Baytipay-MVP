const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // ID unique pour chaque séquence
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", CounterSchema);