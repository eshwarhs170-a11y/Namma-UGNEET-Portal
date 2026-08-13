
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function check() {
  await client.connect();
  const db = client.db('nammaugneet');
  const collection = db.collection('colleges');
  const r3 = await collection.find({ round: 'R3', stream: 'MEDICAL', year: '2025' }).limit(5).toArray();
  r3.forEach(c => console.log(c.collegeCode, c.collegeName, c.courseDetails, c.category, c.fees));
  console.log('--- DENTAL ---');
  const d3 = await collection.find({ round: 'R3', stream: 'DENTAL', year: '2025' }).limit(5).toArray();
  d3.forEach(c => console.log(c.collegeCode, c.collegeName, c.courseDetails, c.category, c.fees));
  await client.close();
}
check().catch(console.error);

