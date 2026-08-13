
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function check() {
  await client.connect();
  const db = client.db('nammaugneet');
  const collection = db.collection('colleges');
  const singleDigit = await collection.countDocuments({ category: { $regex: /^\d$/ } });
  console.log('Single digit categories in DB:', singleDigit);
  
  const r3 = await collection.countDocuments({ round: 'R3', stream: 'MEDICAL', year: '2025' });
  console.log('Total Medical R3 2025 records in DB:', r3);

  const r3Dental = await collection.countDocuments({ round: 'R3', stream: 'DENTAL', year: '2025' });
  console.log('Total Dental R3 2025 records in DB:', r3Dental);
  
  const badNames = await collection.find({ $where: 'this.collegeName.length > 200' }).toArray();
  console.log('Bad names (>200 chars) in DB:', badNames.length);

  const distinctCategories = await collection.distinct('category', { year: '2025', stream: 'MEDICAL' });
  console.log('Distinct Categories for Medical 2025:', distinctCategories);
  
  await client.close();
}
check().catch(console.error);

