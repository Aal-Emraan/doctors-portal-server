const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
// require('dotenv').config()
require('dotenv').config();
const { MongoClient } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wd6nd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run(){
    try{
        await client.connect();
        console.log('server connected succesfully');

        const database = client.db("doctorsPortal");
        const appointmentsCollection = database.collection("allAppointments");

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            console.log(date);
            const query = {email: email};
            const allAppointments = appointmentsCollection.find(query);
            const appointments = await allAppointments.toArray();
            res.json(appointments)
        })

        app.post('/appointments', async (req, res) => {
            const bookingInfo = req.body;
            console.log(bookingInfo);
            const result = await appointmentsCollection.insertOne(bookingInfo);
            // console.log(result);
            res.send(result);
        })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req,res) => {
    res.send('hello from server')
})
app.listen(port, () => {
    console.log("listening to port: ", port);
})