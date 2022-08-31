const mongodb = require("mongodb");

class KVBaseMongo {

  /**
   * Constructor for KVBaseMongo object
   *
   * @example
   * const { KVBaseMongo } = require('./KVBaseMongo');
   * let db = new KVBaseMongo("kvstore");
   * 
   * @param {KVBASE_COLLECTION} The name of the Mongodb collection used as key-value store. Mandatory.
   */
  constructor(KVBASE_COLLECTION) {
    if (!KVBASE_COLLECTION) {
      throw new Error('KVBASE_COLLECTION (the name of the Mongodb collection used as key-value store) is mandatory.');
    }
    this.KV_COLLECTION = KVBASE_COLLECTION;
  }

  connect(MONGODB_URI, callback) {
    mongodb.MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
      if (err) {
        console.log(err);
        process.exit(1);
      } else {
        this.db = client.db();
        this.db.collection(this.KV_COLLECTION).createIndex(
          { "key": 1 }, { unique: true }
        );
        callback();
      }
    });
  }

  set(k, v) {
    return new Promise(resolve => {
      //this.db.set(k, v).then(() => {resolve();});
      this.db.collection(this.KV_COLLECTION).updateOne({key: k}, { $set: { value: v, key: k } }, { upsert: true }, function(err, doc) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  get(k) {
    return new Promise(resolve => {
      //this.db.get(k).then(value => {resolve(value)});
      console.log("Searching on ", this.db)
      console.log("Searching on Collection", this.KV_COLLECTION)
      
      this.db.collection(this.KV_COLLECTION).findOne({ key: k }, function(err, doc) {
        if (err) {
          console.error("Error reading mongodb value", err);
          reject(err);
        }
        else {
          if (doc) {
            console.log("Doc found", doc);
            resolve(doc.value);
          }
          else {
            console.log("No Doc found!");
            resolve(null);
          }
        }
      });
    });
  }

  remove(k) {
    return new Promise(resolve => {
      this.db.collection(this.KV_COLLECTION).deleteOne({key: k}, function(err) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }
}

module.exports = { KVBaseMongo };