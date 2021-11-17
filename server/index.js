const express = require('express');

const app = express();

app.use(express.json())

app.listen(1234, () => {
  console.log('listening on port: ', 1234)
})