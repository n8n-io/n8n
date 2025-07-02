#!/bin/bash

# SSL証明書セットアップスクリプト

DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

echo "n8n SSL Setup Script"
echo "===================="

# ドメイン名の入力
read -p "Enter your domain name (e.g., n8n.example.com): " input_domain
if [ ! -z "$input_domain" ]; then
    DOMAIN=$input_domain
fi

# メールアドレスの入力
read -p "Enter your email address for Let's Encrypt notifications: " input_email
if [ ! -z "$input_email" ]; then
    EMAIL=$input_email
fi

# 必要なディレクトリの作成
echo "Creating necessary directories..."
mkdir -p certbot/www
mkdir -p certbot/conf
mkdir -p ssl
mkdir -p custom-certificates

# nginx.confとdocker-compose.ymlのドメイン名を更新
echo "Updating configuration files..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.ssl.yml

# 初回のSSL証明書取得
echo "Starting services..."
docker-compose -f docker-compose.ssl.yml up -d nginx

echo "Obtaining SSL certificate..."
docker-compose -f docker-compose.ssl.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# すべてのサービスを起動
echo "Starting all services..."
docker-compose -f docker-compose.ssl.yml up -d

echo "Setup complete!"
echo "n8n should now be accessible at https://$DOMAIN"
echo ""
echo "To view logs: docker-compose -f docker-compose.ssl.yml logs -f"
echo "To stop services: docker-compose -f docker-compose.ssl.yml down"
echo "To renew certificates: docker-compose -f docker-compose.ssl.yml run --rm certbot renew"