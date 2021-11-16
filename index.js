const express = require("express");
require("dotenv").config();
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient } = require("mongodb");
const fileUpload = require("express-fileupload");

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_TOKEN);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearar ")) {
		const token = req.headers.authorization.split(" ")[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser.email;
		} catch {}
	}
	next();
}

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wd6nd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

async function run() {
	try {
		await client.connect();
		console.log("server connected succesfully");

		const database = client.db("doctorsPortal");
		const appointmentsCollection = database.collection("allAppointments");
		const usersCollection = database.collection("users");
		const doctorsCollection = database.collection("doctors");

		app.get("/appointments", async (req, res) => {
			const email = req.query.email;
			const date = req.query.date;
			const query = { email, date };
			// console.log(date);
			const allAppointments = appointmentsCollection.find(query);
			const appointments = await allAppointments.toArray();
			res.json(appointments);
		});

		// get single appointment
		app.get("/appointment/:id", async (req, res) => {
			const result = await appointmentsCollection.findOne({
				_id: ObjectId(req.params.id),
			});
			res.json(result);
		});

		// get doctors
		app.get("/doctors", async (req, res) => {
			const cursor = doctorsCollection.find({});
			const doctors = await cursor.toArray();
			console.log(doctors);
			res.json(doctors);
		});

		// add doctors
		app.post("/adddoctor", async (req, res) => {
			const { name, email } = req.body;
			const pic = req.files.image;
			const picData = pic.data;
			const encodedPic = picData.toString("base64");
			const imageBuffer = Buffer.from(encodedPic, "base64");
			const doctor = {
				name,
				email,
				image: imageBuffer,
			};

			const result = await doctorsCollection.insertOne(doctor);
			res.json(result);
		});

		// get admin

		app.get("/users", async (req, res) => {
			const email = req.query.email;
			const filter = { email: email, role: "admin" };
			const result = await usersCollection.findOne(filter);
			let isAdmin = false;
			if (result?.role === "admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
		});

		// user post
		app.post("/users", async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.json(result);
		});

		app.put("/users", async (req, res) => {
			const user = req.body;
			const filter = { email: user.email };
			const updateDoc = { $set: user };
			const options = { upsert: true };
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.json(result);
		});

		// make admin
		app.put("/users/admin", verifyToken, async (req, res) => {
			const user = req.body;
			const requesterEmail = req.decodedEmail;
			if (requesterEmail) {
				const requester = await usersCollection.findOne({
					email: requesterEmail,
				});
				if (requester.role === "admin") {
					const filter = { email: user.email };
					const updateDoc = { $set: { role: "admin" } };
					const result = await usersCollection.updateOne(
						filter,
						updateDoc
					);
					res.json(result);
				}
			} else {
				res.status(403).json({
					message: "You do not have permission to make admin.",
				});
			}
		});

		app.post("/appointments", async (req, res) => {
			const bookingInfo = req.body;
			const result = await appointmentsCollection.insertOne(bookingInfo);
			// console.log(result);
			res.send(result);
		});

		//make payments
		app.post("/create-payment-intent", async (req, res) => {
			const payment = req.body;
			const amount = payment.price * 100;
			const paymentIntent = await stripe.paymentIntents.create({
				currency: "usd",
				amount: amount,
				payment_method_types: ["card"],
			});
			res.json({ clientSecret: paymentIntent.client_secret });
		});

		// update payment info
		app.put("/appointment/:id", async (req, res) => {
			const id = req.params.id;
			const payment = req.body;
			const query = { _id: ObjectId(id) };
			const updateDoc = {
				$set: {
					payment: payment,
				},
			};

			const result = await appointmentsCollection.updateOne(
				query,
				updateDoc
			);
			res.json(result);
		});
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("hello from server");
});
app.listen(port, () => {
	console.log("listening to port: ", port);
});
