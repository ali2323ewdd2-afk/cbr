#!/bin/sh
# Auto-detect SSL certificates and choose the right nginx config.
# If fullchain.pem + privkey.pem exist in /etc/nginx/certs/, use SSL.
# Otherwise, use HTTP-only config.

CERT="/etc/nginx/certs/fullchain.pem"
KEY="/etc/nginx/certs/privkey.pem"

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  echo "[nginx] SSL certificates found — enabling HTTPS"
  cp /etc/nginx/nginx-ssl.conf /etc/nginx/nginx.conf
else
  echo "[nginx] No SSL certificates found — using HTTP only"
  cp /etc/nginx/nginx-http.conf /etc/nginx/nginx.conf
fi

# Test config before starting
nginx -t