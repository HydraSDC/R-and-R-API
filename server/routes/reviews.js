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
const { Review, Review_photos, Characteristics, Characteristics_reviews } = require('../db/models')


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
        .countDocuments({$and: [{product_id: Number(req.query.product_id)}, {rating: rating}]}, (err, count) => {
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
        .countDocuments({$and: [{product_id: Number(req.query.product_id)}, {recommend: recommendedChoice}]}, (err, count) => {
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

module.exports = reviewsRouter 


/**
 * 
 * {
    "product_id": "44388",
    "ratings": {
        "1": "8",
        "2": "10",
        "3": "14",
        "4": "17",
        "5": "29"
    },
    "recommended": {
        "false": "8",
        "true": "70"
    },
    "characteristics": {
        "Fit": {
            "id": 148890,
            "value": "2.3111111111111111"
        },
        "Length": {
            "id": 148891,
            "value": "2.4888888888888889"
        },
        "Comfort": {
            "id": 148892,
            "value": "2.5319148936170213"
        },
        "Quality": {
            "id": 148893,
            "value": "2.8085106382978723"
        }
    }
}
 * 
 */