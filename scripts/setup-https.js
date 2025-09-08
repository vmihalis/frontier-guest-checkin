#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certsDir = path.join(__dirname, '..', 'certificates');

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ HTTPS certificates already exist in ./certificates/');
  console.log('');
  console.log('To regenerate them, delete the certificates folder and run this script again.');
  process.exit(0);
}

console.log('🔐 Generating self-signed certificates for HTTPS development...');
console.log('');

try {
  // Check if mkcert is installed
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
  } catch (e) {
    console.log('⚠️  mkcert is not installed. Trying alternative method...');
    console.log('');
    
    // Use OpenSSL as fallback
    console.log('📝 Using OpenSSL to generate certificates...');
    
    // Create OpenSSL config for certificate generation
    const opensslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=US
ST=California
L=Los Angeles
O=Frontier Tower
OU=Development
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;
    
    const configPath = path.join(certsDir, 'openssl.cnf');
    fs.writeFileSync(configPath, opensslConfig);
    
    // Generate private key and certificate
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 ` +
      `-keyout "${keyPath}" -out "${certPath}" -config "${configPath}"`,
      { stdio: 'inherit' }
    );
    
    // Clean up config file
    fs.unlinkSync(configPath);
    
    console.log('');
    console.log('✅ Certificates generated successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT for iPad/iOS:');
    console.log('');
    console.log('1. Transfer the certificate to your iPad:');
    console.log(`   - Email yourself the file: ${certPath}`);
    console.log('   - Or use AirDrop to send it to your iPad');
    console.log('');
    console.log('2. On your iPad:');
    console.log('   - Open the certificate file');
    console.log('   - Go to Settings > General > VPN & Device Management');
    console.log('   - Find the certificate and tap "Install"');
    console.log('   - Enter your passcode when prompted');
    console.log('');
    console.log('3. Trust the certificate:');
    console.log('   - Go to Settings > General > About > Certificate Trust Settings');
    console.log('   - Enable trust for the certificate');
    console.log('');
    process.exit(0);
  }
  
  // Use mkcert if available (preferred method)
  console.log('✨ Using mkcert to generate trusted certificates...');
  
  // Install local CA if not already installed
  execSync('mkcert -install', { stdio: 'inherit' });
  
  // Generate certificates
  execSync(`mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1`, {
    stdio: 'inherit'
  });
  
  console.log('');
  console.log('✅ Trusted certificates generated successfully!');
  console.log('');
  console.log('📱 For iPad/iOS testing:');
  console.log('');
  console.log('1. Find your root CA certificate:');
  execSync('mkcert -CAROOT', { stdio: 'inherit' });
  console.log('');
  console.log('2. Transfer rootCA.pem from the above directory to your iPad');
  console.log('   (use AirDrop, email, or cloud storage)');
  console.log('');
  console.log('3. On your iPad:');
  console.log('   - Open the rootCA.pem file');
  console.log('   - Install the profile in Settings');
  console.log('   - Trust the certificate in Certificate Trust Settings');
  console.log('');
  
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('');
  console.log('Please install mkcert for the best experience:');
  console.log('  macOS: brew install mkcert');
  console.log('  Windows: choco install mkcert');
  console.log('  Linux: https://github.com/FiloSottile/mkcert#installation');
  process.exit(1);
}

console.log('🚀 Next steps:');
console.log('');
console.log('1. Update your .env file:');
console.log('   NEXT_PUBLIC_APP_URL=https://localhost:3000');
console.log('');
console.log('2. Start the development server with HTTPS:');
console.log('   npm run dev:https');
console.log('');
console.log('3. Access your app on iPad:');
console.log('   - Make sure iPad is on the same network');
console.log('   - Use your computer\'s local IP: https://[YOUR-IP]:3000');
console.log('   - Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)');