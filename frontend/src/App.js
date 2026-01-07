import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import WorkflowBuilderPage from './pages/workflows/WorkflowBuilderPage';
import ContactsPage from './pages/contacts/ContactsPage';
import MessagesPage from './pages/messages/MessagesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import BillingPage from './pages/billing/BillingPage';
import WhatsAppPage from './pages/whatsapp/WhatsAppPage';

// Styles
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workflows" element={
                    <ProtectedRoute>
                      <Layout>
                        <WorkflowsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workflows/builder/:id?" element={
                    <ProtectedRoute>
                      <Layout>
                        <WorkflowBuilderPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/contacts" element={
                    <ProtectedRoute>
                      <Layout>
                        <ContactsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/messages" element={
                    <ProtectedRoute>
                      <Layout>
                        <MessagesPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <Layout>
                        <AnalyticsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <SettingsPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/billing" element={
                    <ProtectedRoute>
                      <Layout>
                        <BillingPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/whatsapp" element={
                    <ProtectedRoute>
                      <Layout>
                        <WhatsAppPage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                
                {/* Global Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </TenantProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;