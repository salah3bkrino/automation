#!/bin/bash

# ManyChat Clone - Production Deployment Script
# This script sets up and deploys the complete SaaS platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"
PROJECT_NAME="manychat-clone"

echo -e "${BLUE}🚀 Starting ManyChat Clone Deployment${NC}"
echo "=================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check available memory
    MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$MEMORY" -lt 2048 ]; then
        print_warning "System has less than 2GB of available memory. Performance may be affected."
    fi
    
    # Check disk space
    DISK=$(df / | awk 'NR==2{print $4}')
    if [ "$DISK" -lt 10485760 ]; then # 10GB in KB
        print_warning "System has less than 10GB of available disk space."
    fi
    
    print_status "System requirements check completed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p database/backups
    
    # Set proper permissions
    chmod 755 nginx/ssl
    chmod 755 nginx/logs
    chmod 755 backend/uploads
    chmod 755 backend/logs
    chmod 755 database/backups
    
    print_status "Directories created successfully"
}

# Generate SSL certificates (self-signed for development)
generate_ssl() {
    print_status "Generating SSL certificates..."
    
    if [ ! -f "nginx/ssl/cert.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        
        print_status "Self-signed SSL certificates generated"
        print_warning "For production, use certificates from Let's Encrypt or your CA"
    else
        print_status "SSL certificates already exist"
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        cp backend/.env.example .env
        
        # Generate random secrets
        JWT_SECRET=$(openssl rand -base64 32)
        STRIPE_WEBHOOK_SECRET=$(openssl rand -base64 32)
        
        print_status "Generated random secrets"
        print_warning "Please update the .env file with your actual configuration:"
        echo "- META_APP_ID: Your Meta App ID"
        echo "- META_APP_SECRET: Your Meta App Secret"
        echo "- STRIPE_SECRET_KEY: Your Stripe Secret Key"
        echo "- STRIPE_PUBLISHABLE_KEY: Your Stripe Publishable Key"
        echo "- DOMAIN: $DOMAIN"
        echo "- EMAIL: $EMAIL"
    else
        print_status "Environment file already exists"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Pull latest images
    docker-compose pull
    
    # Build custom images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    print_status "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec postgres pg_isready -U manychat_user -d manychat_clone; do
        echo -n "."
        sleep 2
    done
    echo " ✓ PostgreSQL is ready"
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose exec redis redis-cli ping; do
        echo -n "."
        sleep 2
    done
    echo " ✓ Redis is ready"
    
    # Wait for Backend
    print_status "Waiting for Backend API..."
    until curl -f http://localhost:3000/health > /dev/null 2>&1; do
        echo -n "."
        sleep 5
    done
    echo " ✓ Backend API is ready"
    
    # Wait for Frontend
    print_status "Waiting for Frontend..."
    until curl -f http://localhost:3001 > /dev/null 2>&1; do
        echo -n "."
        sleep 5
    done
    echo " ✓ Frontend is ready"
    
    # Wait for n8n
    print_status "Waiting for n8n..."
    until curl -f http://localhost:5678 > /dev/null 2>&1; do
        echo -n "."
        sleep 5
    done
    echo " ✓ n8n is ready"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    docker-compose exec backend npx prisma migrate deploy
    docker-compose exec backend npx prisma generate
    
    print_status "Database migrations completed"
}

# Seed initial data
seed_data() {
    print_status "Seeding initial data..."
    
    # Create plans
    docker-compose exec backend node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    async function seedPlans() {
      const plans = [
        {
          name: 'Starter',
          description: 'Perfect for small businesses getting started with WhatsApp automation',
          price: 29.00,
          currency: 'USD',
          interval: 'month',
          features: [
            '1,000 conversations/month',
            'Basic workflows',
            'Email support',
            '1 WhatsApp number',
            'Basic analytics'
          ],
          limits: {
            messagesPerMonth: 1000,
            contactsPerMonth: 500,
            workflowsPerMonth: 5,
            whatsappNumbers: 1
          },
          status: 'ACTIVE',
          sortOrder: 1
        },
        {
          name: 'Pro',
          description: 'Ideal for growing businesses with advanced automation needs',
          price: 99.00,
          currency: 'USD',
          interval: 'month',
          features: [
            '5,000 conversations/month',
            'Advanced workflows',
            'Priority support',
            '3 WhatsApp numbers',
            'Advanced analytics',
            'API access',
            'Custom integrations'
          ],
          limits: {
            messagesPerMonth: 5000,
            contactsPerMonth: 2000,
            workflowsPerMonth: 20,
            whatsappNumbers: 3
          },
          status: 'ACTIVE',
          sortOrder: 2
        },
        {
          name: 'Business',
          description: 'Complete solution for large businesses with high volume needs',
          price: 299.00,
          currency: 'USD',
          interval: 'month',
          features: [
            '15,000 conversations/month',
            'Custom workflows',
            'Phone support',
            '10 WhatsApp numbers',
            'Advanced analytics',
            'API access',
            'Custom integrations',
            'White-label options',
            'Dedicated account manager'
          ],
          limits: {
            messagesPerMonth: 15000,
            contactsPerMonth: 10000,
            workflowsPerMonth: 100,
            whatsappNumbers: 10
          },
          status: 'ACTIVE',
          sortOrder: 3
        }
      ];
      
      for (const plan of plans) {
        await prisma.plan.upsert({
          where: { name: plan.name },
          update: plan,
          create: plan
        });
      }
      
      console.log('✅ Plans seeded successfully');
    }
    
    seedPlans().catch(console.error);
    finally {
      prisma.$disconnect();
    }
    "
    
    print_status "Initial data seeded successfully"
}

# Setup SSL with Let's Encrypt (optional)
setup_letsencrypt() {
    if command -v certbot &> /dev/null; then
        print_status "Setting up Let's Encrypt SSL certificates..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Generate certificates
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        
        print_status "Let's Encrypt SSL certificates configured"
    else
        print_warning "Certbot not found. Skipping Let's Encrypt setup."
    fi
}

# Display deployment information
show_deployment_info() {
    print_status "Deployment completed successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: https://$DOMAIN"
    echo "   Backend API: https://$DOMAIN/api"
    echo "   n8n Dashboard: https://$DOMAIN:5678 (admin/n8n_admin_2024)"
    echo ""
    echo "🗄️ Database Access:"
    echo "   PostgreSQL: localhost:5432"
    echo "   Redis: localhost:6379"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: docker-compose logs -f [service]"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Update services: docker-compose pull && docker-compose up -d"
    echo ""
    echo "📊 Monitoring:"
    echo "   Check health: curl https://$DOMAIN/health"
    echo "   View containers: docker-compose ps"
    echo "   Resource usage: docker stats"
    echo ""
    echo "🔐 Security:"
    echo "   Change default passwords in .env file"
    echo "   Update SSL certificates before production"
    echo "   Configure firewall rules"
    echo "   Set up regular backups"
    echo ""
    print_warning "Remember to:"
    echo "1. Update the .env file with your actual Meta and Stripe credentials"
    echo "2. Configure your domain DNS to point to this server"
    echo "3. Set up proper SSL certificates for production"
    echo "4. Configure backup strategies"
    echo "5. Set up monitoring and alerting"
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 ManyChat Clone Deployment Script${NC}"
    echo "=================================="
    echo ""
    
    check_docker
    check_requirements
    create_directories
    generate_ssl
    setup_environment
    deploy_services
    wait_for_services
    run_migrations
    seed_data
    
    # Optional: Setup Let's Encrypt
    read -p "Do you want to set up Let's Encrypt SSL certificates? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_letsencrypt
    fi
    
    show_deployment_info
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT

# Run main function
main "$@"