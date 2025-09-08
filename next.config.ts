import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname
  }
};

// HTTPS configuration for local development
if (process.env.NODE_ENV === 'development' && process.env.USE_HTTPS === 'true') {
  const certsDir = path.join(__dirname, 'certificates');
  const keyPath = path.join(certsDir, 'localhost-key.pem');
  const certPath = path.join(certsDir, 'localhost.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    // This will be picked up by the custom server
    process.env.HTTPS_KEY = keyPath;
    process.env.HTTPS_CERT = certPath;
  }
}

export default nextConfig;
