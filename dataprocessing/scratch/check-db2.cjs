
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function check() {
  await client.connect();
  const db = client.db('nammaugneet');
  const collection = db.collection('colleges');
  const singleDigit = await collection.countDocuments({ category: { $regex: /^\d$/ } });
  console.log('Single digit categories in DB:', singleDigit);
  
  const distinctCategories = await collection.distinct('category', { year: '2025' });
  console.log('Distinct Categories 2025:', distinctCategories);
  
  await client.close();
}
check().catch(console.error);

