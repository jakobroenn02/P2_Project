const { MongoClient } = require("mongodb");
if(process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

let dbConnection;

module.exports = {
  connectToDb: (cb) => {
    MongoClient.connect(process.env.DBURL, { tls: true } )
      .then((client) => {
        dbConnection = client.db('database');

        return cb();

      })
      .catch((err) => {
        console.log(err);
        return cb(err);
      });
  },
  getDb: () => dbConnection,
};
