const mongoose = require('mongoose');

const characteristic_ReviewsSchema = new mongoose.Schema({
  id: Number,
  characteristic_id: Number,
  review_id: Number,
  value: Number
})

const Characteristic_reviews = mongoose.model('Characteristic_reviews', characteristic_ReviewsSchema);

module.exports = Characteristic_reviews;