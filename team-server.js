import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 1140;

// 서버 시작마다 새 세션 ID 생성 → 클라이언트 결과 자동 초기화
const SESSION_ID = randomBytes(8).toString('hex');

createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const html = readFileSync(join(__dirname, 'team-picker.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (req.url === '/api/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: SESSION_ID }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(PORT, () => {
  console.log(`팀뽑기 서버 실행 중 → http://localhost:${PORT}`);
});
