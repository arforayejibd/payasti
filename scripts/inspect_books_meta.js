const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function inspectBooksMeta() {
  const sqlPath = path.join(__dirname, '..', 'ref', 'payasti_wp737.sql');
  const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const bookIds = [4112, 4115, 4117, 4119, 4120, 4128, 4130, 4132, 4134, 4136, 4218, 4220];
  const postMeta = {};

  for await (const line of rl) {
    if (line.includes("INSERT INTO `wp8w_postmeta`") || line.startsWith("(")) {
      bookIds.forEach(id => {
        if (line.includes(`,${id},`)) {
          if (!postMeta[id]) postMeta[id] = [];
          postMeta[id].push(line);
        }
      });
    }
  }

  console.log('Book Post Meta count:');
  for (const [id, metas] of Object.entries(postMeta)) {
    console.log(`\n=== Book ID: ${id} (${metas.length} meta entries) ===`);
    metas.forEach(m => console.log(m.substring(0, 300)));
  }
}

inspectBooksMeta().catch(console.error);
