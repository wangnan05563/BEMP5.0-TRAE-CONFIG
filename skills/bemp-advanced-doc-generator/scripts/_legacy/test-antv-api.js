const https = require('https');
const fs = require('fs');

const variants = [
  {
    name: 'v1-network-graph-name',
    payload: {
      type: 'network-graph',
      width: 800,
      height: 600,
      data: {
        nodes: [
          { name: '客户端' },
          { name: '负载均衡' },
          { name: '应用服务器' },
          { name: '数据库' }
        ],
        edges: [
          { source: '客户端', target: '负载均衡', name: 'HTTP' },
          { source: '负载均衡', target: '应用服务器', name: '代理' },
          { source: '应用服务器', target: '数据库', name: 'SQL' }
        ]
      }
    }
  },
  {
    name: 'v2-flow-diagram-name',
    payload: {
      type: 'flow-diagram',
      width: 800,
      height: 600,
      data: {
        nodes: [
          { name: '开始' },
          { name: '判断' },
          { name: '结束' }
        ],
        edges: [
          { source: '开始', target: '判断', name: '' },
          { source: '判断', target: '结束', name: '是' }
        ]
      }
    }
  }
];

async function callApi(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      'https://antv-studio.alipay.com/api/gpt-vis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 60000
      },
      (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: body });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('TIMEOUT')));
    req.write(data);
    req.end();
  });
}

(async () => {
  const out = [];
  for (const v of variants) {
    try {
      const r = await callApi(v.payload);
      out.push(`=== ${v.name} ===\nSTATUS: ${r.status}\nBODY: ${r.body.substring(0, 2000)}\n\n`);
    } catch (e) {
      out.push(`=== ${v.name} ===\nERROR: ${e.message}\n\n`);
    }
  }
  fs.writeFileSync('scripts/antv-test-result.txt', out.join(''), 'utf8');
  console.log('Done, results in scripts/antv-test-result.txt');
})();
