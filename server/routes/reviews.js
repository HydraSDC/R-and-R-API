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

module.exports = reviewsRouter 


/**
 * trying to produce:
 *         {
            "review_id": 1094706,
            "rating": 2,
            "summary": "Does not fit my dino body",
            "recommend": true,
            "response": null,
            "body": "Im a dinosaur soo I should I should expect tight clothes. big fingers too.",
            "date": "2021-11-11T00:00:00.000Z",
            "reviewer_name": "dinodude",
            "helpfulness": 3,
            "photos": [
                {
                    "id": 2100431,
                    "url": "https://i.insider.com/5e90ceda92e8ba75275ad038"
                }
            ]
        },
 */