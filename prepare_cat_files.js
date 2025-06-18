const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

// 1. Static catalogue IDs (OBS: punktnotation, inga mellanslag!)
const catalogueIds = {
  "Skaven": "e894-7281-45d2-b1a1",
  "Empire": "96cb-3d5a-47fa-a4bc",
  "Dark.Elves": "b540-df10-421b-b6f2",
  "Dogs.of.War": "68ab-a0b9-4900-9461",
  "RH.Chaos.Dwarfs": "ca7e-9816-4fcd-8c88",
  "Wood.Elf": "1e8c-ea3b-4381-96cf",
  "Dwarfs": "6e97-2b17-4dfb-a3e5",
  "Vampire.Counts": "df44-6056-4b5f-aeec",
  "Lizardmen": "4d7f-03e0-46b2-b9dc",
  "High.Elf": "2153-aab3-4931-b1c6",
  "Ogre.Kingdoms": "af72-49d2-4281-9dc2",
  "Orcs.and.Goblins": "1be6-1eb4-44f4-8963",
  "Chaos": "af03-2436-4cf3-bdce",
  "Tomb.Kings": "cfb7-8b59-4763-88c1",
  "Bretonnia": "c2f0-5d99-4a97-a7be",
  "RH.Orcs.and.Goblins": "d7e1-f0ac-4879-bd60",
};

// 2. Game system ID
const gameSystemId = "bdc5-ff70-4406-b73b";

// Helper to make output dir
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Helper to create a temp dir
function tempdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'catprep-'));
}

// Helper to zip a file into target
function zipFile(srcFile, outFile) {
  const zip = new AdmZip();
  zip.addLocalFile(srcFile);
  zip.writeZip(outFile);
}

// 3. Process .cat files
function processCatFiles() {
  const files = fs.readdirSync('.').filter(f => f.endsWith('.cat'));
  for (const file of files) {
    const baseName = path.basename(file, '.cat');
    const safeName = baseName.replace(/ /g, '.');
    const staticId = catalogueIds[safeName];

    // Debug
    // console.log(`DEBUG: baseName=${baseName}, safeName=${safeName}, staticId=${staticId}`);

    if (!staticId) {
      console.warn(`⚠️  No catalogue ID for '${safeName}' – skipping.`);
      continue;
    }

    const tmpDir = tempdir();
    const modified = path.join(tmpDir, baseName + '.cat');

    // Read and replace
    let contents = fs.readFileSync(file, 'utf-8')
      .replace(/gameSystemId="[^"]*"/g, `gameSystemId="${gameSystemId}"`)
      .replace(/<catalogue id="[^"]*"/g, `<catalogue id="${staticId}"`);

    fs.writeFileSync(modified, contents);

    zipFile(modified, path.join('public', `${safeName}.catz`));
    console.log(`✅ Zipped ${file} → public/${safeName}.catz`);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 4. Process .gst files
function processGstFiles() {
  const files = fs.readdirSync('.').filter(f => f.endsWith('.gst'));
  for (const file of files) {
    const baseName = path.basename(file, '.gst');
    const safeName = baseName.replace(/ /g, '.');

    const tmpDir = tempdir();
    const modified = path.join(tmpDir, baseName + '.gst');

    let contents = fs.readFileSync(file, 'utf-8')
      .replace(/<gameSystem id="[^"]*"/g, `<gameSystem id="${gameSystemId}"`);

    fs.writeFileSync(modified, contents);

    zipFile(modified, path.join('public', `${safeName}.gstz`));
    console.log(`✅ Zipped ${file} → public/${safeName}.gstz`);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 5. Process .bsi (XML index)
function processBsi() {
  const bsiInput = "Warhammer-Fantasy-6th-edition.local.xml";
  const bsiOutput = path.join("public", "Warhammer-Fantasy-6th-edition.local.bsi");

  if (!fs.existsSync(bsiInput)) {
    console.error(`❌ Missing input XML file: ${bsiInput}`);
    return;
  }

  const tmpDir = tempdir();
  const modified = path.join(tmpDir, bsiInput);
  fs.copyFileSync(bsiInput, modified);

  let contents = fs.readFileSync(modified, 'utf-8');

  // Replace gameSystemId for gamesystem
  contents = contents.replace(
    /(<dataIndexEntry[^>]*dataType="gamesystem"[^>]*dataId=)"[^"]*"/g,
    `$1"${gameSystemId}"`
  );

  // Replace dataId for each catalogue entry
  for (const [key, id] of Object.entries(catalogueIds)) {
    const escapedKey = key.replace(/\./g, '\\.');
    // Replace dataId for entry with this filePath
    const re = new RegExp(
      `(<dataIndexEntry[^>]*filePath="${escapedKey}\\.catz"[^>]*dataId=)"[^"]*"`,
      'g'
    );
    contents = contents.replace(re, `$1"${id}"`);
  }

  fs.writeFileSync(modified, contents);

  zipFile(modified, bsiOutput);
  console.log(`✅ Created BSI: ${bsiOutput}`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ---- Main ----

function main() {
  ensureDirSync('public');
  processCatFiles();
  processGstFiles();
  processBsi();
}

main();