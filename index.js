const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
// require('dotenv').config()
require('dotenv').config();
const { MongoClient } = require('mongodb');

// middleware
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wd6nd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run(){
    try{
        await client.connect();
        console.log('database connected succesfully');
    }
    finally{
        await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req,res) => {
    res.send('hello from server')
})
app.listen(port, () => {
    console.log("listening to port: ", port);
})