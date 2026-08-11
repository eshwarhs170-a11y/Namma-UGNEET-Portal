const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const DENTAL_PDF = 'C:\\Users\\Eshwar H S\\.gemini\\antigravity-ide\\brain\\e6c08db1-c4fd-4658-81d5-c957cb35a345\\.tempmediaStorage\\69f8506355e6b5aa.pdf';
const MEDICAL_PDF = 'C:\\Users\\Eshwar H S\\.gemini\\antigravity-ide\\brain\\e6c08db1-c4fd-4658-81d5-c957cb35a345\\.tempmediaStorage\\866e2f80cd9e17da.pdf';

const DATA_DIR = path.join(__dirname, '2025');

const DENTAL_STRAY_OUT = path.join(DATA_DIR, 'dental_stray.txt');   // current dental_r3 is actually stray
const DENTAL_R3_OUT    = path.join(DATA_DIR, 'dental_r3.txt');      // correct mop-up R3
const MEDICAL_R3_OUT   = path.join(DATA_DIR, 'medical_r3.txt');     // correct mop-up R3

async function extractPdf(filePath, label) {
  const buf = fs.readFileSync(filePath);
  const data = await pdfParse(buf);
  console.log(`\n✅ ${label}: ${data.numpages} pages, ${data.text.length} chars`);
  console.log('--- SAMPLE (first 500 chars) ---');
  console.log(data.text.slice(0, 500));
  console.log('--- END SAMPLE ---');
  return data.text;
}

async function main() {
  // 1. Back up the current (stray) dental_r3.txt -> dental_stray.txt
  const currentDentalR3 = path.join(DATA_DIR, 'dental_r3.txt');
  if (fs.existsSync(currentDentalR3)) {
    const strayContent = fs.readFileSync(currentDentalR3, 'utf8');
    fs.writeFileSync(DENTAL_STRAY_OUT, strayContent, 'utf8');
    console.log('📦 Backed up existing dental_r3.txt -> dental_stray.txt (it was the stray vacancy round)');
  }

  // 2. Back up current medical_r3.txt -> medical_stray.txt
  const currentMedicalR3 = path.join(DATA_DIR, 'medical_r3.txt');
  if (fs.existsSync(currentMedicalR3)) {
    const strayContent = fs.readFileSync(currentMedicalR3, 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'medical_stray.txt'), strayContent, 'utf8');
    console.log('📦 Backed up existing medical_r3.txt -> medical_stray.txt (it was the stray vacancy round)');
  }

  // 3. Extract and write dental mop-up R3
  console.log('\n🦷 Extracting DENTAL Mop-Up Round 3 PDF...');
  const dentalText = await extractPdf(DENTAL_PDF, 'Dental R3 (Mop-Up)');
  fs.writeFileSync(DENTAL_R3_OUT, dentalText, 'utf8');
  console.log(`✅ Written to dental_r3.txt (${dentalText.length} chars)`);

  // 4. Extract and write medical mop-up R3
  console.log('\n🏥 Extracting MEDICAL Mop-Up Round 3 PDF...');
  const medicalText = await extractPdf(MEDICAL_PDF, 'Medical R3 (Mop-Up)');
  fs.writeFileSync(MEDICAL_R3_OUT, medicalText, 'utf8');
  console.log(`✅ Written to medical_r3.txt (${medicalText.length} chars)`);

  console.log('\n🎉 Done! Summary:');
  console.log('  dental_r3.txt    = Real Mop-Up Round 3 dental allotment (Dec 8 2025)');
  console.log('  medical_r3.txt   = Real Mop-Up Round 3 medical allotment (Dec 8 2025)');
  console.log('  dental_stray.txt = Special Stray Vacancy dental data');
  console.log('  medical_stray.txt= Special Stray Vacancy medical data');
}

main().catch(console.error);
