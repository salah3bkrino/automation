#!/usr/bin/env python3
"""
Simple HTTP Server for AutomationService Frontend
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class AutomationServiceFrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="frontend", **kwargs)
    
    def do_GET(self):
        # Serve index.html for all routes (SPA support)
        if self.path != '/' and not self.path.startswith('/static') and not '.' in self.path:
            self.path = '/'
        
        # Add CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        super().do_GET()
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

def run_frontend_server():
    """Run the frontend HTTP server"""
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, AutomationServiceFrontendHandler)
    print("🎨 AutomationService Frontend running on http://localhost:8000")
    print("🌐 Access your dashboard: http://localhost:8000")
    print("🔗 Backend API: http://localhost:3002")
    httpd.serve_forever()

if __name__ == '__main__':
    run_frontend_server()