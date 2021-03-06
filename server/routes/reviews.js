/**
 * https://expressjs.com/en/guide/routing.html
 * The above link was used to define these routers
 * 
 * how to make mongo queries: https://www.w3schools.com/nodejs/nodejs_mongodb_query.asp
 * 
 * how to sort mongo results: https://www.w3schools.com/nodejs/nodejs_mongodb_sort.asp
 */

const express = require("express");
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /listings.
const reviewsRouter = express.Router();
const db = require('../db/conn.js')
const { Review, Review_photos, Characteristics, Characteristics_reviews } = require('../db/models');
const Characteristic_reviews = require("../db/models/Characteristics_reviews.js");


reviewsRouter.route("/").get(async function (req, res) {
  //declare variables
  var sortMethod, query, grabPhotos, include, output;
  var sortMethod = {helpfulness: -1, date: -1} //defaulting to relevant sorting method
  //conditional statement checking if a product id is not specified
  if (!req.query.product_id) {
    //send error description
    res.send('Error: invalid product_id provided');
  } else {
    // remove sorting method for helpful or newest
    if (req.query.sort === "helpful" ) delete sortMethod.newest;
    if (req.query.sort === "newest" ) delete sortMethod.helpfulness;

    // define the query with product id and remove reported reviews
    query = {
      $match: {
        $and: [
          { product_id: Number(req.query.product_id) },
          {reported: false}
        ]
      }
    }

    // https://stackoverflow.com/questions/36805784/how-to-join-two-collections-in-mongoose
    // grab photos for that review id

    grabPhotos = {
      $lookup: {
        from: "reviews_photos", // access photos collection
        localField: "review_id", // field name from foreign collection
        foreignField: "review_id", // field name from current collection
        pipeline: [
          {
            $project: {
              _id: 0,
              review_id: 0
            }
          }
        ], // exclude _id and review_id from photo array
        as: "photos" // label for array of photos
      },
    }

    include = {
      $project: {
        _id: 0,
        product_id: 0,
        reported: 0,
        reviewer_email: 0
      }
    }

    db
    .collection('reviews') //select reviews collection
    .aggregate([
      grabPhotos, // inputs an array containing the photos for this review
      query, // gets only reviews for this product that haven't been reported
      include // exclude properties: _id, reported, reviewer_email
      // TODO: try sorting in aggregate
      // TODO: try limit in aggregate
      // TODO: $set date to reformat
    ])
    .sort(sortMethod) // sort returned reviews by helpful, newest, or relevant
    .limit(Number(req.query.count) || 5) // limit reviews returned to count or default to 5
    .toArray(function(err, result) {
      if (err) throw err;

      // reformat date from unix/epoch to iso 8601 
      // https://poopcode.com/convert-epoch-timestamp-to-javascript-date/
      result.map((review) => {
        review.date = new Date(review.date);
      })

      // format the output
      output = {
        'product': req.query.product_id,
        'page': Number(req.query.page) || 0,
        'count': Number(req.query.count) || 5,
        'results': result
      }

      //send results
      res.send(output); 
    })

  }
})

reviewsRouter.route("/meta").get(async function (req, res) {
  // conditional checking if product id is specified
  if (!req.query.product_id) {
    //send error description
    res.send('Error: invalid product_id provided');
  } else {
    // define output variable
    var reviewsMeta = {
      product_id: req.query.product_id
    };
    // define helper variables
    var ratings = {}, ratingsArray = [1, 2, 3, 4, 5]
    var recommended = {};
    var characteristics = {};
    var charPromises = []
    var promiseArray = [];
    
    //

    // TODO: 

    //define funtion capable of querying the database for the rating counts
    var ratingPromise = function(rating) { // pass the rating into the promise
      return new Promise(function(resolve, reject) { // return promise to populate promise array
        db 
        .collection('reviews')
        // count all documents for this product and this rating value
        .countDocuments({$and: [{product_id: Number(req.query.product_id)}, {rating: rating}, {reported: false}]}, (err, count) => {
          if (err) {
            reject(err);
          }
          // conditiional checking if count is greater than 0
          if (count) {
            ratings[rating] = `${count}`;
          }
          // resolve the promise
          resolve();
        })
      })
    }
    
    //define function capable of querying the database for the recommended counts
    var recommendPromise = function(recommendedChoice) {
      return new Promise(function(resolve, reject) {
        db
        .collection('reviews')
        .countDocuments({$and: [{product_id: Number(req.query.product_id)}, {recommend: recommendedChoice}, {reported: false}]}, (err, count) => {
          if (err) reject(err);
          recommended[recommendedChoice] = `${count}`;
          resolve();
        })
      })
    }

    // console.log(db.collection('characeristic_reviews').aggregate().exec)

    var characteristicPromise = function() {
      return new Promise(function(resolve, reject) {
        db
        .collection('characteristics')
        .find({product_id: Number(req.query.product_id)})
        .toArray(function(err, result) {
          if (err) throw err;
          result.map(characteristic => {
            var charMatch = {$match: { characteristic_id: Number(characteristic.id) }}
            var charGroup = {$group: { _id: Number(characteristic.id), average: {$avg: '$value'} }}
            charPromises.push(
              new Promise(function(resolve, reject) {
                db
                .collection('characteristic_reviews')
                // .find({characteristic_id: Number(characteristic.id)})
                .aggregate([charMatch, charGroup])
                .toArray((err, result) => {
                  if (err) reject(err);
                  characteristics[characteristic.name] = {
                    id: result[0]._id,
                    value: result[0].average
                  }
                  resolve();
                })
              })
            )
    
          })
          resolve()
        })
      })
    }
  
  //iterare through all possible ratings and push the promises into the promise array
    ratingsArray.map(rating => {
      promiseArray.push(ratingPromise(rating));
    });

    promiseArray.push(recommendPromise(true));
    promiseArray.push(recommendPromise(false));
    
    promiseArray.push(characteristicPromise())

    // wait for all promises to be completed then send results
    Promise.all(promiseArray)
    .then(() => {
      Promise.all(charPromises)
      .then(() => {
        reviewsMeta.ratings = ratings
        reviewsMeta.recommended = recommended
        reviewsMeta.characteristics = characteristics
        res.send(reviewsMeta)
      })
    })
  }
})

reviewsRouter.route("/:review_id/helpful").put(async function (req, res) {
  db
  .collection('reviews')
  .findOneAndUpdate(
    {$and: [{review_id: Number(req.params.review_id)}, {reported: false}]},
    {$inc: {helpfulness: 1}}
  ,(err) => {
    if (err) res.sendStatus(404).send();
    res.send()
  })
})

reviewsRouter.route("/:review_id/report").put(async function (req, res) {
  db
  .collection('reviews')
  .findOneAndUpdate(
    {$and: [{review_id: Number(req.params.review_id)}, {reported: false}]},
    {$set: {reported: true}}
  ,(err) => {
    if (err) res.sendStatus(404).send();
    res.send()
  })
})

reviewsRouter.route("/").post(async function (req, res) {
  // define promise array
  var promiseArray = []
  var innerPromiseArray = []
  // get last review id
  var lastReviewId, lastPhotoId, lastCharId

  promiseArray.push(new Promise(function(resolve, reject) {
    db
    .collection('reviews')
    .findOne({}, { sort: {'review_id': -1}}, (err, lastReview) => {
      if (err) {
        reject()
      }
      lastReviewId = lastReview.review_id
      resolve()
    });
  }))

  if (req.body.photos.length > 0) {
    promiseArray.push(new Promise(function(resolve, reject) {
      db
      .collection('reviews_photos')
      .findOne({}, { sort: {'id': -1}}, (err, lastPhoto) => {
        if (err) throw err
        lastPhotoId = lastPhoto.id
        resolve()
      })
    }))
  }

  promiseArray.push(
    new Promise(function(resolve, reject) {
      db
      .collection('characteristic_reviews')
      .findOne({}, { sort: {'id': -1}}, (err, lastCharacteristic) => {
        if (err) reject();
        lastCharId = lastCharacteristic.id
        resolve()
      })
    })
  )

  Promise.all(promiseArray)
  .then(() => {
    // define the new review
    var newReview = new Review({
      review_id: lastReviewId + 1,
      product_id: req.body.product_id,
      rating: req.body.rating,
      date: Date.now(),
      summary: req.body.summary,
      body: req.body.body,
      recommend: req.body.recommend,
      reported: false,
      reviewer_name: req.body.name,
      reviewer_email: req.body.email,
      response: null,
      helpfulness: 0
    })
  
    // define the new photos
    // check if photos are trying to be posted
    if (req.body.photos.length > 0) {
      // post photos with incremental id
      //for loop going through req.body.photos array
      for (var i = 0; i < req.body.photos.length; i++) {
        var newPhotos = new Review_photos({
          id: lastPhotoId + i + 1,
          review_id: lastReviewId + 1,
          url: req.body.photos[i]
        })
        innerPromiseArray.push(
          new Promise(function(resolve, reject) {
            db
            .collection('reviews_photos')
            .insertOne(newPhotos, (err) => {
              if (err) reject()
              resolve()
            })
          })
        )
      }
    }

    // define the new characteristic value
    const characteristicsKeys = Object.keys(req.body.characteristics)
    for (var i = 0; i < characteristicsKeys.length; i ++) {
      var newCharactertisticRating = new Characteristic_reviews({
        id: lastCharId + i + 1,
        characteristic_id: Number(characteristicsKeys[i]),
        review_id: lastReviewId + 1,
        value: req.body.characteristics[characteristicsKeys[i]]
      })
    }

    // insert the new review into the reviews collection
    innerPromiseArray.push(
      new Promise(function(resolve, reject) {
        db
        .collection('reviews')
        .insertOne(newReview, (err, result) => {
          if (err) reject();
          resolve()
        })
      })
    )

    innerPromiseArray.push(
      new Promise(function(resolve, reject) {
        db
        .collection('characteristic_reviews')
        .insertOne(newCharactertisticRating, (err, result) => {
          if (err) reject()
          resolve()
        })
      })
    )

    Promise.all(innerPromiseArray)
    .then(() => {
      res.sendStatus(201);
    })
  })
})

module.exports = reviewsRouter 
