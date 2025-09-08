# iPad/iOS Camera Setup Guide

## Quick Start

The QR scanner requires HTTPS to work on iPad/iOS devices due to Safari's security requirements. Follow these steps:

### 1. Generate SSL Certificates (One-time setup)

```bash
npm run setup:https
```

This creates self-signed certificates in the `certificates/` directory.

### 2. Start HTTPS Development Server

```bash
npm run dev:https
```

The server will run at `https://localhost:3000`

### 3. Access from iPad

1. Find your computer's local IP address:
   - **Mac**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows**: `ipconfig | findstr IPv4`
   - **Linux**: `hostname -I | awk '{print $1}'`

2. On your iPad, navigate to:
   ```
   https://[YOUR-COMPUTER-IP]:3000/checkin
   ```

### 4. Trust the Certificate on iPad

Since we're using self-signed certificates, you need to trust them on your iPad:

#### Method 1: Using mkcert (Recommended)
If you have mkcert installed:

1. Find your root CA certificate:
   ```bash
   mkcert -CAROOT
   ```

2. Transfer `rootCA.pem` from that directory to your iPad (via AirDrop, email, or cloud storage)

3. On iPad:
   - Open the `rootCA.pem` file
   - Go to **Settings > General > Profiles & Device Management**
   - Tap the profile and install it
   - Go to **Settings > General > About > Certificate Trust Settings**
   - Enable trust for the root certificate

#### Method 2: Using OpenSSL Certificate
If you used OpenSSL (fallback method):

1. Transfer `certificates/localhost.pem` to your iPad

2. On iPad:
   - Open the certificate file
   - Install it via Settings
   - Trust it in Certificate Trust Settings

## Troubleshooting

### Camera Permission Issues

1. **Permission Denied**
   - Go to **Settings > Safari > Camera**
   - Set to "Allow"
   - Refresh the page

2. **HTTPS Warning**
   - Make sure you're using `https://` not `http://`
   - Ensure certificates are properly installed and trusted

3. **Camera Not Found**
   - Check if camera works in native Camera app
   - Close other apps using the camera
   - Restart Safari

### Network Issues

1. **Can't Connect to Server**
   - Ensure iPad and computer are on the same network
   - Check firewall settings on your computer
   - Try disabling VPN if active

2. **Certificate Errors**
   - Make sure certificate is trusted in Certificate Trust Settings
   - Try regenerating certificates if they expired

### Browser-Specific Issues

- **Safari**: Required for best compatibility on iOS
- **Chrome on iOS**: Uses Safari's engine, should work similarly
- **Other browsers**: May have limited camera support

## Production Deployment

In production, you'll need proper SSL certificates:

1. **Vercel/Netlify**: Automatic HTTPS included
2. **Custom Server**: Use Let's Encrypt or purchase SSL certificate
3. **Update `.env`**: Set `NEXT_PUBLIC_APP_URL` to your HTTPS domain

## Security Notes

- Self-signed certificates are for development only
- In production, always use valid SSL certificates
- Camera permissions are domain-specific
- HTTPS is mandatory for camera access on iOS 14.3+

## Alternative Solutions

If HTTPS setup is not feasible:

1. **Use a tunneling service** (exposes local server to internet):
   - [ngrok](https://ngrok.com/): `ngrok http 3000`
   - [localtunnel](https://localtunnel.github.io/www/): `lt --port 3000`
   - These provide HTTPS URLs automatically

2. **Deploy to staging**:
   - Deploy to Vercel/Netlify for testing
   - These platforms provide HTTPS by default

3. **Manual QR Entry**:
   - Consider adding a manual QR code input field as fallback
   - Allow typing/pasting QR code data

## Additional Resources

- [iOS Camera Permissions](https://developer.apple.com/documentation/webkitjs/mediadevices/getusermedia)
- [Safari getUserMedia Requirements](https://webkit.org/blog/11353/mediarecorder-api-in-safari-14-0/)
- [mkcert Documentation](https://github.com/FiloSottile/mkcert)
- [QR Scanner Library](https://github.com/nimiq/qr-scanner)