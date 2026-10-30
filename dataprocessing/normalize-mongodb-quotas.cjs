const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

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

if (!uri) {
  console.error('Error: MONGODB_URI not found in env or .env.local');
  process.exit(1);
}

function normalizeQuota(quota) {
  if (!quota) return 'UNKNOWN';
  let q = quota.trim();

  // Deemed & Self-Financed
  if (/deemed/i.test(q) || (/self\s*-?\s*financ/i.test(q) && !/amu/i.test(q))) {
    return 'Deemed/Paid Seats Quota';
  }

  // Management Paid Seats (AYUSH)
  if (/manage/i.test(q)) {
    return 'Management/Paid Seats Quota';
  }

  // NRI (check before ESI or others)
  if (/non\s*-?\s*resident\s*indian/i.test(q) || /nonresident\s*indian/i.test(q)) {
    if (/amu/i.test(q)) return 'Non-Resident Indian (AMU) Quota';
    if (/jamia/i.test(q)) return 'Non-Resident Indian (Jamia) Quota';
    return 'Non-Resident Indian';
  }

  // ESI
  if (/\b(esi|employee['’\s]*s?\s*state\s*insurance)\b/i.test(q)) {
    return 'Employees State Insurance Scheme (ESI)';
  }

  // Delhi NCR CW Quotas
  if (/delhi\s*ncr.*cw/i.test(q) || /armed\s*forces/i.test(q)) {
    if (/du/i.test(q)) return 'Delhi NCR CW Quota (DU)';
    if (/ip/i.test(q)) return 'Delhi NCR CW Quota (IP)';
    return 'Delhi NCR CW Quota';
  }

  // Delhi University Quota
  if (/delhi\s*universit/i.test(q)) {
    return 'Delhi University Quota';
  }

  // IP University Quota
  if (/ip\s*universit/i.test(q)) {
    return 'IP University Quota';
  }

  // AMU
  if (/amu.*self\s*finance.*all\s*india/i.test(q)) return 'AMU Self Finance All India';
  if (/amu.*self\s*finance.*internal/i.test(q)) return 'AMU Self Finance Internal';
  if (/aligarh\s*muslim/i.test(q)) return 'Aligarh Muslim University (AMU) Quota';

  // Puducherry
  if (/puducher/i.test(q)) return 'Internal - Puducherry UT Domicile';

  // Central Universities
  if (/central\s*universit/i.test(q)) return 'Central Universities / National Institutions';

  // AIQ Govt / Govt Aided / All India
  if (/all\s*india\s*quota\s*govt\s*aided/i.test(q)) return 'All India Quota Govt Aided';
  if (/all\s*india\s*quota\s*government/i.test(q)) return 'All India Quota Government';
  if (/^all\s*india$/i.test(q)) return 'All India';

  // Minorities & others
  if (/jain\s*minority.*govt\s*aided/i.test(q)) return 'Jain Minority Quota (Govt Aided)';
  if (/jain\s*minority/i.test(q)) return 'Jain Minority Quota';
  if (/muslim\s*minority.*govt\s*aided/i.test(q)) return 'Muslim Minority Quota (Govt Aided)';
  if (/muslim\s*minority/i.test(q)) return 'Muslim Minority Quota';
  if (/muslim\s*women/i.test(q)) return 'Muslim Women Quota';
  if (/muslim\s*obc/i.test(q)) return 'Muslim OBC Quota';
  if (/muslim\s*st/i.test(q)) return 'Muslim ST Quota';
  if (/muslim\s*quota/i.test(q)) return 'Muslim Quota';
  if (/jamia\s*internal/i.test(q)) return 'Jamia Internal Quota';
  if (/linguistic\s*minority/i.test(q)) return 'Linguistic Minority';
  if (/foreign\s*country/i.test(q)) return 'Foreign Country Quota';
  if (/open\s*seat/i.test(q)) return 'Open Seat Quota';

  return q;
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db('nammaugneet');
    const collection = db.collection('colleges');

    const distinctQuotas = await collection.distinct('quota', { dataset: 'AIQ' });
    console.log(`Found ${distinctQuotas.length} distinct quotas in MongoDB for AIQ.`);

    let updatedCount = 0;
    for (const raw of distinctQuotas) {
      const canonical = normalizeQuota(raw);
      if (canonical !== raw) {
        const res = await collection.updateMany(
          { dataset: 'AIQ', quota: raw },
          { $set: { quota: canonical } }
        );
        console.log(`Updated: "${raw}" -> "${canonical}" (${res.modifiedCount} docs)`);
        updatedCount += res.modifiedCount;
      }
    }

    console.log(`\nMigration complete. Total documents updated: ${updatedCount}`);

    const newQuotas = await collection.distinct('quota', { dataset: 'AIQ' });
    console.log(`New distinct quota count: ${newQuotas.length}`);
    console.log(newQuotas.sort());

  } finally {
    await client.close();
  }
}

run().catch(console.error);
