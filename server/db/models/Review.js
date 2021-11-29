const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: Number,
  product_id: Number,
  rating: Number,
  date: Number,
  summary: String,
  body: String,
  recommend: Boolean,
  reported: Boolean,
  reviewer_name: String,
  reviewer_email: String,
  response: String,
  helpfulness: Number
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review;