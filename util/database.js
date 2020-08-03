///////////////
// Deprecated//
///////////////
const mongoDB = require("mongodb");
const mongoClient = mongoDB.MongoClient;

const DB_CONNECTION_STR = "mongodb+srv://idan2468:0509496620@idans-xvear.mongodb.net/shop?retryWrites=true&w=majority";

let _db;
const mongoConnect = (callback) => {
    mongoClient
        .connect(
            DB_CONNECTION_STR
        )
        .then((client) => {
            console.log("Connected");
            _db = client.db();
            callback();
        })
        .catch((err) => {
            console.log(err);
            throw err;
        });
};

const getDb = () => {
    if (_db) {
        return _db;
    }
    throw 'No DB';
};

exports.mongoConnent = mongoConnect;
exports.getDb = getDb;
