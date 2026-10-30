const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const AIQ_FILE = path.join(__dirname, '..', 'public', 'data', 'aiq_compiled_allotments.json');

function makeSyntheticCode(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return `AIQ-${Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

function robustCleanCollegeName(name) {
  if (!name) return '';
  let cleaned = name.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

  // Strip page headers like "Page No. 279 22-10-2026 10:19:52 AM 3844 435910 - - - - - - - -"
  cleaned = cleaned.replace(/^Page\s+No\.\s*\d+[\s\S]*?(?:AM|PM)\s*[\d\s\-]+(?:Management[\w\s\/]*Quota|Deemed[\w\s\/]*Quota|All\s+India[\w\s]*Quota)?\s*/i, '');

  // Strip multi-college / pharmacy leak: "Institute of Teaching & Research in Ayurved Pharmacy B.Pharm Not Reported All India Quota Government "
  cleaned = cleaned.replace(/^.*?Pharmacy\s+B\.?Pharm\s+Not\s+Reported\s+(?:All\s+India\s+Quota\s+Government\s+)?/i, '');

  // Strip leading remark patterns (with kerning spaces)
  cleaned = cleaned.replace(/^(?:Did\s+not\s+(?:fill\s+up\s+fresh\s+choices|opt\s+for\s+Upgradat\w*\s*(?:on)?)|No\s+Upgradat\w*\s*(?:on)?|Not\s+Reported|Not\s+Allotted|Seat\s+Surrendered|Reported|Upgraded|Fresh\s+Allotted[^(]*(\([^)]*\))?)\.?\s*/gi, '');

  // Strip leading standalone numbers and dashes
  cleaned = cleaned.replace(/^[\s\d\-]+/, '');

  // Strip leading quota prefixes (including kerning spaces and 'Quota Government')
  const quotaPrefixes = [
    /^(?:All\s+India\s+Quota\s+Govt(?:\.?|ernment)?(?:\s+Aided)?|All\s+India\s+Quota|Quota\s+Government)\s+/i,
    /^Central\s+Universit[\w\s]*\/?\s*National\s+Institutions?\s+/i,
    /^(?:Deemed|Manage\w+)\s*\/?\s*(?:P\s*aid|Paid)\s+Seats?\s+Quota\s+/i,
    /^Open\s+Seat\s+Quota\s+/i,
    /^(?:Delhi|IP)\s+Universit[\w\s]*Quota\s+/i,
    /^Employe[\w\s]*State\s*Insuranc[\w\s]*Scheme[^)]*\)?\s*/i,
    /^Aligarh\s+Muslim\s+Universit[\w\s]*\(\s*AMU\s*\)\s*Quota\s+/i,
    /^B\.?Sc\s+Nursing\s+All\s+India\s+/i,
    /^Muslim\s+(?:Minority|Women|OBC|ST)?\s*Quota[^)]*\)?\s*/i,
    /^Jain\s+Minority\s+Quota[^)]*\)?\s*/i,
    /^(?:Non\s*-?\s*Resident|NonResident)\s+Indian[^)]*\)?\s*/i,
    /^Self\s*-?\s*Financ\w*\s*(?:Merit\s+Seat)?\s*/i,
    /^Jamia\s+Internal\s+Quota\s+/i,
    /^\(AMU\)\s*Self\s+finance[^)]*\s*/i,
    /^Internal\s*-?\s*Puducher[\w\s]*UT\s+Domicile\s+/i,
    /^Foreign\s+Country\s+Quota\s+/i,
    /^Delhi\s+NCR[^)]*Quota\s+/i,
    /^\([A-Za-z\s\-.]+\)\s*(?:Quot\s*a\s*)?/i,
  ];

  for (const prefix of quotaPrefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  // Again strip any leading numbers/dashes left after quota removal
  cleaned = cleaned.replace(/^[\s\d\-.,]+/, '');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If ends up with comma separation, take 2 parts (College, City)
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts.slice(0, 2).join(',').trim();
  }

  return cleaned.length >= 3 ? cleaned : name;
}

async function run() {
  const data = JSON.parse(fs.readFileSync(AIQ_FILE, 'utf8'));
  console.log(`Loaded ${data.length} records from ${AIQ_FILE}`);

  let cleanedNamesCount = 0;
  let normalizedRoundsCount = 0;
  let openCategoriesCount = 0;

  data.forEach(item => {
    // 1. Clean college name
    const oldName = item.collegeName;
    const newName = robustCleanCollegeName(oldName);
    if (newName !== oldName) {
      item.collegeName = newName;
      item.collegeCode = makeSyntheticCode(newName);
      cleanedNamesCount++;
    }

    // 2. Fix round 'FINAL' to 'STRAY'
    if (item.round === 'FINAL') {
      item.round = 'STRAY';
      normalizedRoundsCount++;
    }

    // 3. Deemed / Management UNKNOWN to Open
    if (item.category === 'UNKNOWN' && (item.quota === 'Deemed/Paid Seats Quota' || item.quota === 'Management/Paid Seats Quota')) {
      item.category = 'Open';
      openCategoriesCount++;
    }
  });

  console.log(`Cleaned college names: ${cleanedNamesCount}`);
  console.log(`Normalized rounds (FINAL -> STRAY): ${normalizedRoundsCount}`);
  console.log(`Resolved Deemed/Management UNKNOWN -> Open: ${openCategoriesCount}`);

  fs.writeFileSync(AIQ_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved updated file to ${AIQ_FILE}`);

  // Connect to MongoDB and sync
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    const envLocal = path.join(__dirname, '..', '.env.local');
    const env = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envLocal)) {
      const m = fs.readFileSync(envLocal, 'utf8').match(/MONGODB_URI=(.*)/);
      if (m) uri = m[1].trim().replace(/^["']|["']$/g, '');
    }
    if (!uri && fs.existsSync(env)) {
      const m = fs.readFileSync(env, 'utf8').match(/MONGODB_URI=(.*)/);
      if (m) uri = m[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  if (uri) {
    console.log('\nConnecting to MongoDB Atlas to sync changes...');
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('nammaugneet');
      const collection = db.collection('colleges');

      // Drop AIQ documents and re-insert or bulk update
      console.log('Replacing AIQ documents with cleaned dataset in MongoDB...');
      const delRes = await collection.deleteMany({ dataset: 'AIQ' });
      console.log(`Deleted ${delRes.deletedCount} old AIQ documents.`);

      // Ensure dataset is AIQ
      data.forEach(d => { d.dataset = 'AIQ'; });

      // Insert in chunks of 5000
      const chunkSize = 5000;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await collection.insertMany(chunk);
        console.log(`Inserted ${Math.min(i + chunkSize, data.length)} / ${data.length} docs...`);
      }

      console.log('MongoDB Atlas AIQ sync successfully completed!');
    } finally {
      await client.close();
    }
  } else {
    console.log('Skipping MongoDB sync (MONGODB_URI not found).');
  }
}

run().catch(console.error);
