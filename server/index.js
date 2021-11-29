const express = require('express');
const reviews = require('./routes/reviews.js')

const app = express();

app.use(express.json())

app.use('/reviews', reviews)

app.listen(1234, () => {
  console.log('listening on port: ', 1234)
})
