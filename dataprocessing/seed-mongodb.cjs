const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { MongoClient } = require('mongodb');

// Force Google DNS to fix ISP DNS blocks on SRV record lookups (needed for mongodb+srv://)
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Require MONGODB_URI to be passed as environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Error: MONGODB_URI environment variable is required.");
  console.error("Usage: MONGODB_URI='mongodb+srv://...' node seed-mongodb.cjs");
  process.exit(1);
}

const client = new MongoClient(uri);

const KEA_FILE = path.join(__dirname, '..', 'public', 'data', 'compiled_allotments.json');
const AIQ_FILE = path.join(__dirname, '..', 'public', 'data', 'aiq_compiled_allotments.json');

async function seed() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db('nammaugneet');
    const collection = db.collection('colleges');

    // Load KEA data
    let keaData = [];
    if (fs.existsSync(KEA_FILE)) {
      console.log(`Loading KEA data from ${KEA_FILE}...`);
      keaData = JSON.parse(fs.readFileSync(KEA_FILE, 'utf8'));
      // Ensure dataset flag is set
      keaData.forEach(d => { d.dataset = 'KEA'; });
      console.log(`Loaded ${keaData.length} KEA records.`);
    }

    // Load AIQ data
    let aiqData = [];
    if (fs.existsSync(AIQ_FILE)) {
      console.log(`Loading AIQ data from ${AIQ_FILE}...`);
      aiqData = JSON.parse(fs.readFileSync(AIQ_FILE, 'utf8'));
      // Ensure dataset flag is set
      aiqData.forEach(d => { d.dataset = 'AIQ'; });
      console.log(`Loaded ${aiqData.length} AIQ records.`);
    }

    const allData = [...keaData, ...aiqData];
    if (allData.length === 0) {
      console.log("No data found to insert.");
      return;
    }

    // Drop the collection to start fresh (optional, but good for seeding)
    console.log("Dropping existing colleges collection (if exists)...");
    await db.collection('colleges').drop().catch(() => {}); // ignore error if it doesn't exist

    // Insert data in batches
    console.log(`Inserting ${allData.length} total records into MongoDB...`);
    const batchSize = 5000;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize);
      await collection.insertMany(batch);
      console.log(`Inserted ${Math.min(i + batchSize, allData.length)} / ${allData.length}`);
    }

    console.log("Creating indexes...");
    // Create compound indexes to speed up the dashboard queries
    await collection.createIndex({ dataset: 1, stream: 1, category: 1, year: 1, round: 1, rank: 1 });
    await collection.createIndex({ dataset: 1, quota: 1 });
    // Text index for college search
    await collection.createIndex({ collegeName: "text", collegeCode: "text" });
    
    console.log("Indexing complete!");
    console.log("Database seeded successfully!");
  } catch (e) {
    console.error("Error seeding database:", e);
  } finally {
    await client.close();
  }
}

seed();
