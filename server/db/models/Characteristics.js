const mongoose = require('mongoose');

const characteristicsSchema = new mongoose.Schema({
  id: Number,
  product_id: Number,
  name: String
})

const Characteristics = mongoose.model('Characteristics', characteristicsSchema);

module.exports = Characteristics;