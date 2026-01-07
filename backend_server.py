#!/usr/bin/env python3
"""
Simple HTTP Server for AutomationService Backend
This simulates the Node.js backend for demonstration
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import hashlib
import datetime
import sqlite3
import os

# Simple in-memory database
DB_FILE = 'automation_service.db'

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            plan TEXT DEFAULT 'starter',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            domain TEXT,
            settings TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            phone_number_id TEXT,
            access_token TEXT,
            business_id TEXT,
            is_active BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        )
    ''')
    
    # Insert demo data
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        # Demo user
        demo_password = hashlib.sha256('demo123'.encode()).hexdigest()
        cursor.execute('''
            INSERT INTO users (email, password, name, tenant_id, plan)
            VALUES (?, ?, ?, ?, ?)
        ''', ('demo@automationservice.com', demo_password, 'Demo User', 'tenant-demo', 'pro'))
        
        cursor.execute('''
            INSERT INTO tenants (id, name, domain, settings)
            VALUES (?, ?, ?, ?)
        ''', ('tenant-demo', 'Demo Company', 'demo.automationservice.com', '{"theme": "blue", "timezone": "UTC"}'))
    
    conn.commit()
    conn.close()

init_db()

class AutomationServiceHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if self.path == '/api/health':
            response = {
                'status': 'OK',
                'timestamp': datetime.datetime.now().isoformat(),
                'version': '1.0.0',
                'service': 'AutomationService Backend'
            }
        elif self.path == '/api/plans':
            response = {
                'plans': [
                    {
                        'id': 'starter',
                        'name': 'Starter Automation',
                        'price': 29,
                        'features': ['1,000 conversations/month', 'Basic workflows', 'Email support']
                    },
                    {
                        'id': 'pro',
                        'name': 'Pro Automation',
                        'price': 99,
                        'features': ['5,000 conversations/month', 'Advanced workflows', 'Priority support', 'API access']
                    },
                    {
                        'id': 'business',
                        'name': 'Business Automation',
                        'price': 299,
                        'features': ['15,000 conversations/month', 'Custom workflows', 'Phone support', 'Advanced analytics']
                    }
                ]
            }
        elif self.path == '/api/auth/connect':
            response = {
                'authUrl': 'https://www.facebook.com/v18.0/dialog/oauth?client_id=demo_app_id&redirect_uri=http://localhost:3001/auth/callback&scope=whatsapp_business_management,whatsapp_business_messaging'
            }
        else:
            response = {'error': 'Endpoint not found'}
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if self.path == '/api/auth/login':
            email = data.get('email')
            password = data.get('password')
            
            # Demo authentication
            if email == 'demo@automationservice.com' and password == 'demo123':
                response = {
                    'success': True,
                    'user': {
                        'id': 1,
                        'email': 'demo@automationservice.com',
                        'name': 'Demo User',
                        'tenant_id': 'tenant-demo',
                        'plan': 'pro'
                    },
                    'token': 'demo_jwt_token_12345'
                }
            else:
                response = {
                    'success': False,
                    'error': 'Invalid credentials'
                }
        
        elif self.path == '/api/auth/register':
            response = {
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'id': 2,
                    'email': data.get('email'),
                    'name': data.get('name'),
                    'tenant_id': 'tenant-new',
                    'plan': 'starter'
                }
            }
        
        elif self.path == '/api/auth/callback':
            response = {
                'success': True,
                'message': 'WhatsApp connected successfully!',
                'phone_number_id': 'demo_phone_id_12345'
            }
        
        elif self.path == '/api/messages/send':
            response = {
                'success': True,
                'messageId': 'msg_demo_12345',
                'status': 'sent'
            }
        
        elif self.path == '/webhook/whatsapp':
            # Simulate WhatsApp webhook
            response = {'status': 'received'}
            
            # Send to n8n (simulated)
            print(f"Message sent to n8n: {data}")
        
        else:
            response = {'error': 'Endpoint not found'}
        
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Custom log message"""
        print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

def run_server():
    """Run the HTTP server"""
    server_address = ('', 3002)
    httpd = HTTPServer(server_address, AutomationServiceHandler)
    print("🚀 AutomationService Backend running on http://localhost:3002")
    print("📊 Health check: http://localhost:3002/api/health")
    print("🔐 Demo login: demo@automationservice.com / demo123")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()