const express = require('express');
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
// require('dotenv').config()
require('dotenv').config();
const { MongoClient } = require('mongodb');


const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next){
    if(req.headers?.authorization?.startsWith('Bearar ')){
        const token = req.headers.authorization.split(' ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch{}
    }
    next();
}

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
        const usersCollection = database.collection('users');

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = {email: email};
            const allAppointments = appointmentsCollection.find(query);
            const appointments = await allAppointments.toArray();
            res.json(appointments)
        })

        // get admin

        app.get('/users', async(req, res) => {
            const email = req.query.email;
            console.log(email);
            const filter = {email: email, role: 'admin'};
            const result = await usersCollection.findOne(filter);
            console.log(result);
            let isAdmin = false;
            if(result?.role === 'admin'){
                isAdmin = true;
            }
            res.json({admin: isAdmin});
        })

        // user post
        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = {email: user.email};
            const updateDoc = {$set: user};
            const options = {upsert: true};
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        })

        // make admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requesterEmail = req.decodedEmail;
            if(requesterEmail){
                const requester = await usersCollection.findOne({email: requesterEmail});
                if(requester.role === 'admin'){
                    const filter = {email: user.email};
                    const updateDoc = {$set: {role: 'admin'}};
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }else{
                res.status(403).json({message: 'You do not have permission to make admin.'})
            }

        })

        app.post('/appointments', async (req, res) => {
            const bookingInfo = req.body;
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