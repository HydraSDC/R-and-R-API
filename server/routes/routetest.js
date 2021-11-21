
// https://expressjs.com/en/guide/routing.html

const express = require("express");
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /listings.
const testRouter = express.Router();

testRouter.get('/', function (req, res) {
  console.log('hello')
  res.send('testing')
})

module.exports = testRouter 