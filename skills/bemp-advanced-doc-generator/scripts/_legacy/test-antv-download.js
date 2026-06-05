const https = require('https');
const fs = require('fs');
const path = require('path');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('Status: ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (e) => {
      fs.unlink(dest, () => {});
      reject(e);
    });
  });
}

(async () => {
  const outDir = path.join(__dirname, '..', 'output', 'antv-test');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const urls = [
    { name: 'network-graph.png', url: 'https://mdn.alipayobjects.com/one_clip/afts/img/ukjSQbQnbm8AAAAARWAAAAgAoEACAQFr/original' },
    { name: 'flow-diagram.png', url: 'https://mdn.alipayobjects.com/one_clip/afts/img/1xGnTacZuFUAAAAAQlAAAAgAoEACAQFr/original' }
  ];

  for (const u of urls) {
    const dest = path.join(outDir, u.name);
    try {
      await download(u.url, dest);
      const stat = fs.statSync(dest);
      console.log(`OK: ${u.name} (${stat.size} bytes)`);
    } catch (e) {
      console.log(`FAIL ${u.name}: ${e.message}`);
    }
  }
})();
