#!/usr/bin/env node

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Check for certificates
const certsDir = path.join(__dirname, '..', 'certificates');
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ HTTPS certificates not found!');
  console.error('');
  console.error('Please run: npm run setup:https');
  console.error('');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log('');
    console.log('🔐 HTTPS Server running at:');
    console.log(`   https://localhost:${port}`);
    console.log('');
    console.log('📱 For iPad access, use your local IP:');
    console.log(`   https://[YOUR-LOCAL-IP]:${port}`);
    console.log('');
    console.log('💡 Find your local IP:');
    console.log('   macOS/Linux: ifconfig | grep "inet "');
    console.log('   Windows: ipconfig | findstr IPv4');
    console.log('');
  });
});