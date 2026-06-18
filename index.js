// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env",
  );
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function startServer() {
  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection("user");
    const jobsCollection = db.collection("jobs");
    const companyCollection = db.collection("companies");
    const applicationsCollection = db.collection("application");
    const plansCollection = db.collection("plans");
    const subscriptionsCollection = db.collection("subscriptions");

    // Jobs apis
    app.get("/api/jobs", async (req, res) => {
      const { companyId, status } = req.query;
      let query = {};
      if (companyId) {
        query.companyId = companyId;
      }
      if (status) {
        query.status = status;
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/api/jobs/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post("/api/jobs", async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date(),
      };
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // Applications API
    app.get("/api/applications", async (req, res) => {
      let query = {};
      if (req.query.applicantId) {
        query.applicantId = req.query.applicantId;
      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId;
      }
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/api/applications", async (req, res) => {
      const application = req.body;
      // console.log(application)
      const newApplication = {
        ...application,
        createdAt: new Date(),
      };
      const result = await applicationsCollection.insertOne(newApplication);
      res.send(result);
    });

    // Company apis 
    // Inefficient way to join/aggregate collection
    app.get("/api/companies", async (req, res) => {
      const companies = await companyCollection.find({}).toArray();

      for (const company of companies){
        const filter = {
          companyId: company._id.toString()
        }
        const jobCount = await jobsCollection.countDocuments(filter)
        company.jobCount = jobCount
      }
      res.send(companies);
    });

    app.get("/api/my/company", async (req, res) => {
      const { recruiterId } = req.query;
      const result = await companyCollection.findOne({ recruiterId });
      res.send(result || {});
    });

    app.post("/api/company", async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date(),
      };
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
    });

    app.patch("/api/companies/:id", async (req, res) => {
      const id = req.params.id;
      const updatedCompany = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: updatedCompany.status,
        },
      };
      const result = await companyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Plans api?
    app.get("/api/plans", async (req, res) => {
      const query = {};
      if (req.query.plan_id) {
        query.id = req.query.plan_id;
      }
      const result = await plansCollection.findOne(query);
      res.send(result);
    });

    // Subscriptions api
    app.post("/api/subscription", async (req, res) => {
      const data = req.body;
      const subInfo = {
        ...data,
        createdAt: new Date(),
      };
      const result = await subscriptionsCollection.insertOne(subInfo);

      // update the user plan field
      const filter = { email: data.customerEmail };
      const updatedDoc = {
        $set: {
          plan: data.planId,
        },
      };
      const updatedResult = await usersCollection.updateOne(filter, updatedDoc);
      res.send(updatedResult);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("🍃 Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // process.exit(1);
  }
}

startServer();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
