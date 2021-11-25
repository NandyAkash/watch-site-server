const express = require('express');
const app = express();
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const port = process.env.PORT || 5000;






const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors());
app.use(express.json());

//mongodb connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vbfyw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



async function verifyToken (req, res, next) {
    if(req.headers?.authorization?.startsWith('Bearer ', )) {
        const token = req.headers.authorization.split(' ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch{

        }
    }
    next();
}

async function run () {
    
    try {
        await client.connect();
        const database= client.db('watch-store');
        const watchCollection = database.collection('watches');
        const usersCollection = database.collection('users');
        const ordersCollection = database.collection('orders');
        const reviewCollection = database.collection('review');

    //Get watches
    app.get('/watches', async(req,res) => {
        const data = watchCollection.find({});
        const watches = await data.toArray();
        res.send(watches)
    })
    //Get Single watch
    app.get('/watch/:id', async(req,res) => {
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const singlePackage = await watchCollection.findOne(query);
        res.send(singlePackage);
    })
    //Add a new watch
    app.post('/watches', async(req, res) => {
        const newWatchPackage = req.body;
        const result = await watchCollection.insertOne(newWatchPackage);
        res.json(result);
      })
    // Get All orders for Admin
    app.get('/manageorder', async(req,res) => {
        const data = ordersCollection.find();
        const orders = await data.toArray();
        res.send(orders);
    })
    // Get All users for Admin
    app.get('/users', async(req,res) => {
        const data = usersCollection.find();
        const users = await data.toArray();
        res.send(users);
    })
    // Get All reviews
    app.get('/review', async(req,res) => {
        const data = reviewCollection.find();
        const reviews = await data.toArray();
        res.send(reviews);
    })

    //Get specific user Orders
    app.get('/orders/:uid', async(req,res) => {
        const id = req.params.uid;
        const query = {userId: id}
        const data = ordersCollection.find(query);
        const orders = await data.toArray();
        res.send(orders);
    })
    //Admin Check
    app.get('/users/:email', async(req,res) => {
        const email = req.params.email;
        const query = {email: email}
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user?.role === "admin") {
            isAdmin = true;
        }
        res.json({admin: isAdmin});
    })

    //Post orders
    app.post('/orders', async(req, res) => {
        const orderPackage = req.body;
        const result = await ordersCollection.insertOne(orderPackage);
        res.json(result);
    })
    
    //Post review
    app.post('/review', async(req, res) => {
        const reviewbody = req.body;
        const result = await reviewCollection.insertOne(reviewbody);
        res.json(result);
    })
      
    //Post api
    app.post('/users', async(req, res) => {
        const newUser = req.body;
        const {email} = newUser;
        const existingUser = await usersCollection.findOne({email});
        if(existingUser){
            console.log("already user exist")
            res.json({error: "User already exist"})
        } else {
            const result = await usersCollection.insertOne(newUser);
            res.json(result);
        } 
      })

      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if(requester) {
                const requesterUser = await usersCollection.findOne({email: requester})
                if(requesterUser.role === 'admin') {
                const filter = { email: user.email };
                const updateDoc = { $set: {role:'admin'} };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
                }
            }
            else {
                req.status(403).json({message: "You don't have authoraization to make admin"})
            }
            
        });
        //Delete order api
        app.delete('/orders/:usid', async(req,res) => {
            const id = req.params.usid;
            const query = {selectedWatchId: id}
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
            
        })
        //Delete product/watch api
        app.delete('/watches/:usid', async(req,res) => {
            const id = req.params.usid;
            const query = {_id: ObjectId(id)}
            const result = await watchCollection.deleteOne(query);
            res.send(result);
            
        })
    }
    finally {
    //    await client.close();
    }
}
run().catch(console.dir);
app.get('/', (req,res) => {
    res.send('Hello from node');
})

app.listen(port,(req) => {
    console.log('listening to port', port);
})