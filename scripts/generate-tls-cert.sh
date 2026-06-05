#!/bin/bash
# scripts/generate-tls-cert.sh — UPGRADE 2: Self-signed TLS cert for local dev
# ═══════════════════════════════════════════════════════════════════════════════
# Run: chmod +x scripts/generate-tls-cert.sh && ./scripts/generate-tls-cert.sh
#
# For production: replace with real cert from Let's Encrypt (Certbot) or
# your cloud provider's Certificate Manager (ACM, GCP CM, etc.)
set -e

CERT_DIR="$(dirname "$0")/../nginx/certs"
mkdir -p "$CERT_DIR"

echo "🔐 Generating self-signed TLS certificate for local development..."

openssl req -x509 \
  -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out    "$CERT_DIR/server.crt" \
  -subj   "/C=US/ST=Dev/L=Local/O=RateLimiter/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✅ Certificate generated:"
echo "   Cert: $CERT_DIR/server.crt"
echo "   Key:  $CERT_DIR/server.key"
echo ""
echo "ℹ️  This cert is self-signed and will show browser warnings."
echo "   For production, use a cert from Let's Encrypt or your CA."
echo ""
echo "🚀 Next steps:"
echo "   docker compose up -d nginx"
echo "   curl -k https://localhost/health"
