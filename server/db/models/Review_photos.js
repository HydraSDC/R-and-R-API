const mongoose = require('mongoose');

const review_PhotosSchema = new mongoose.Schema({
  id: Number,
  review_id: Number,
  url: String
})

const Review_Photos = mongoose.model('Review_Photos', review_PhotosSchema);

module.exports = Review_Photos;