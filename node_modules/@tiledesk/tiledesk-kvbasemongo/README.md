# Tiledesk key-value database adapter for MongoDB

This class uses a MongoDB collection as a very simple key-value storage.
It only provides basic methods: set(), get(), remove()

## Instance and connect

```
const kvbase_collection = 'kvstore';
MONGODB_URI = 'YOUR MONGODB CONNECTION URI';
const db = new KVBaseMongo(kvbase_collection);
db.connect(MONGODB_URI, () => {
  console.log("KVBaseMongo successfully connected.");
});
```

## Set a value

```
let content = {
  name: "Andrew"
}
const CONTENT_KEY = 'YOUR CONTENT KEY'
await db.set(CONTENT_KEY, content)
console.log("Content saved")
```

## Get a value

```
const content = await db.get(CONTENT_KEY);
console.log("Got content:", content)

## Remove a value

await db.remove(CONTENT_KEY);
console.log("Content deleted.");
```