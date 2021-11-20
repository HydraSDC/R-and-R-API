// import { MongoClient } from 'mongodb'
const { MongoClient } = require('mongodb');


conn = Mongo();
db = conn.getDB("sdcrandr");


export module db = db