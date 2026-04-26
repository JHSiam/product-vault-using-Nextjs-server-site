require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PORT || 5000;

//middle ware
//iamjhsiam
//0mwW4VeE24OcnDlF
app.use(cors());
app.use(express.json());



const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const database = client.db('OdssyDB');
        const UsersCollection = database.collection('UsersCollection');
        const ItemsCollection = database.collection('ItemsCollection');

        app.get('/users', async (req, res) => {
            const cursor = UsersCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });
        // app.get('/users/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await UsersCollection.findOne(query);
        //     res.send(result);
        // })

        // app.put('/users/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: req.body
        //     }

        //     const result = await UsersCollection.updateOne(filter, updatedDoc, options )

        //     res.send(result);
        // })

        app.post("/users", async (req, res) => {
            try {
                const user = req.body;

                if (!user?.email) {
                    return res.status(400).send({ message: "Email is required" });
                }

                // 🔍 Check if user already exists
                const existingUser = await UsersCollection.findOne({ email: user.email });

                if (existingUser) {
                    return res.send({
                        message: "User already exists",
                        inserted: false,
                    });
                }

                // ✅ Insert new user
                const result = await UsersCollection.insertOne(user);

                res.send({
                    message: "User created successfully",
                    inserted: true,
                    result,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // app.get("/items", async (req, res) => {
        //     try {
        //         const items = await ItemsCollection.find().toArray();

        //         res.send(items);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).send({ message: "Failed to fetch items" });
        //     }
        // });

        app.get("/items", async (req, res) => {
            try {
                const { search, minPrice, maxPrice, startDate, endDate } = req.query;

                let query = {};

                // 🔍 Search (by title, case insensitive)
                if (search) {
                    query.title = { $regex: search, $options: "i" };
                }

                // 💰 Price filtering
                if (minPrice || maxPrice) {
                    query.price = {};

                    if (minPrice) {
                        query.price.$gte = Number(minPrice);
                    }

                    if (maxPrice) {
                        query.price.$lte = Number(maxPrice);
                    }
                }

                // 📅 Date filtering
                if (startDate || endDate) {
                    query.createdAt = {};

                    if (startDate) {
                        console.log(startDate);

                        const start = new Date(startDate);
                        start.setUTCHours(0, 0, 0, 0);
                        console.log(start);

                        query.createdAt.$gte = start;
                    }

                    if (endDate) {
                        const end = new Date(endDate);
                        end.setUTCHours(23, 59, 59, 999);
                        query.createdAt.$lte = end;
                    }
                }

                // 🔥 Fetch items (newest first)
                const items = await ItemsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(items);

            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Failed to fetch items" });
            }
        });

        app.get("/items/:id", async (req, res) => {
            const id = req.params.id;
            const item = await ItemsCollection.findOne({ _id: new ObjectId(id) });
            res.send(item);
        });


        app.get("/items/user/:email", async (req, res) => {
            try {
                const email = req.params.email;

                const result = await ItemsCollection
                    .find({ email })
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch user items" });
            }
        });


        // import { ObjectId } from "mongodb";

        app.delete("/items/:id", async (req, res) => {
            try {
                const id = req.params.id;

                const result = await ItemsCollection.deleteOne({
                    _id: new ObjectId(id),
                });

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to delete item" });
            }
        });


        app.patch("/items/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;

                const result = await ItemsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            title: updatedData.title,
                            shortDesc: updatedData.shortDesc,
                            fullDesc: updatedData.fullDesc,
                            price: Number(updatedData.price),
                            image: updatedData.image,
                        },
                    }
                );

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to update item" });
            }
        });



        app.post("/items", async (req, res) => {
            const item = req.body;

            const fixedItem = {
                ...item,
                price: Number(item.price),
                createdAt: new Date(item.createdAt || Date.now()) // 🔥 FORCE REAL DATE
            };

            const result = await ItemsCollection.insertOne(fixedItem);
            res.send(result);
        });

        // app.post('/users', async (req, res) => {
        //     const user = req.body;
        //     console.log('new user', user);
        //     const result = await UsersCollection.insertOne(user);
        //     res.send(result);

        // })

        // app.delete('/users/:id', async (req, res) => {
        //     console.log('going to delete', req.params.id);
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await UsersCollection.deleteOne(query);
        //     res.send(result);
        // })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('My first Server')
})

app.listen(port, () => {
    console.log(`Server is runnig on port: ${port}`);
})