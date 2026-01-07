import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  currentTenant: null,
  settings: null,
  whatsappAccounts: [],
  workflows: [],
  contacts: [],
  analytics: null,
  loading: false,
  error: null,
};

// Action types
const TENANT_ACTIONS = {
  SET_TENANT: 'SET_TENANT',
  LOAD_SETTINGS_START: 'LOAD_SETTINGS_START',
  LOAD_SETTINGS_SUCCESS: 'LOAD_SETTINGS_SUCCESS',
  LOAD_SETTINGS_FAILURE: 'LOAD_SETTINGS_FAILURE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  LOAD_WHATSAPP_ACCOUNTS: 'LOAD_WHATSAPP_ACCOUNTS',
  LOAD_WORKFLOWS: 'LOAD_WORKFLOWS',
  LOAD_CONTACTS: 'LOAD_CONTACTS',
  LOAD_ANALYTICS: 'LOAD_ANALYTICS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const tenantReducer = (state, action) => {
  switch (action.type) {
    case TENANT_ACTIONS.SET_TENANT:
      return {
        ...state,
        currentTenant: action.payload,
        settings: null,
        whatsappAccounts: [],
        workflows: [],
        contacts: [],
        analytics: null,
      };

    case TENANT_ACTIONS.LOAD_SETTINGS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case TENANT_ACTIONS.LOAD_SETTINGS_SUCCESS:
      return {
        ...state,
        loading: false,
        settings: action.payload,
        error: null,
      };

    case TENANT_ACTIONS.LOAD_SETTINGS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case TENANT_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case TENANT_ACTIONS.LOAD_WHATSAPP_ACCOUNTS:
      return {
        ...state,
        whatsappAccounts: action.payload,
      };

    case TENANT_ACTIONS.LOAD_WORKFLOWS:
      return {
        ...state,
        workflows: action.payload,
      };

    case TENANT_ACTIONS.LOAD_CONTACTS:
      return {
        ...state,
        contacts: action.payload,
      };

    case TENANT_ACTIONS.LOAD_ANALYTICS:
      return {
        ...state,
        analytics: action.payload,
      };

    case TENANT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const TenantContext = createContext();

// Provider component
export const TenantProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tenantReducer, initialState);
  const { currentTenant: authTenant, setCurrentTenant: setAuthTenant } = useAuth();

  // Set up tenant change handler
  useEffect(() => {
    if (authTenant) {
      dispatch({ type: TENANT_ACTIONS.SET_TENANT, payload: authTenant });
      loadTenantData(authTenant.id);
    }
  }, [authTenant]);

  // Load tenant data
  const loadTenantData = async (tenantId) => {
    try {
      // Load settings
      await loadSettings(tenantId);
      
      // Load other data in parallel
      await Promise.all([
        loadWhatsAppAccounts(tenantId),
        loadWorkflows(tenantId),
        loadContacts(tenantId),
        loadAnalytics(tenantId),
      ]);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  };

  // Load tenant settings
  const loadSettings = async (tenantId) => {
    try {
      dispatch({ type: TENANT_ACTIONS.LOAD_SETTINGS_START });
      
      // Mock data for now - replace with actual API call
      const mockSettings = {
        id: tenantId,
        name: authTenant?.name || 'Default Tenant',
        logo: null,
        primaryColor: '#25D366',
        timezone: 'UTC',
        language: 'en',
        businessHours: {
          monday: { open: '09:00', close: '17:00', enabled: true },
          tuesday: { open: '09:00', close: '17:00', enabled: true },
          wednesday: { open: '09:00', close: '17:00', enabled: true },
          thursday: { open: '09:00', close: '17:00', enabled: true },
          friday: { open: '09:00', close: '17:00', enabled: true },
          saturday: { open: '09:00', close: '17:00', enabled: false },
          sunday: { open: '09:00', close: '17:00', enabled: false },
        },
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 24, // hours
          ipWhitelist: [],
        },
      };
      
      dispatch({
        type: TENANT_ACTIONS.LOAD_SETTINGS_SUCCESS,
        payload: mockSettings,
      });
    } catch (error) {
      dispatch({
        type: TENANT_ACTIONS.LOAD_SETTINGS_FAILURE,
        payload: error.message,
      });
    }
  };

  // Load WhatsApp accounts
  const loadWhatsAppAccounts = async (tenantId) => {
    try {
      // Mock data - replace with actual API call
      const mockAccounts = [
        {
          id: '1',
          phoneNumber: '+1234567890',
          displayName: 'Main Business Number',
          status: 'ACTIVE',
          connectedAt: '2024-01-15T10:30:00Z',
        },
      ];
      
      dispatch({
        type: TENANT_ACTIONS.LOAD_WHATSAPP_ACCOUNTS,
        payload: mockAccounts,
      });
    } catch (error) {
      console.error('Error loading WhatsApp accounts:', error);
    }
  };

  // Load workflows
  const loadWorkflows = async (tenantId) => {
    try {
      // Mock data - replace with actual API call
      const mockWorkflows = [
        {
          id: '1',
          name: 'Welcome Message',
          description: 'Send welcome message to new contacts',
          status: 'ACTIVE',
          trigger: 'MESSAGE_RECEIVED',
          createdAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          name: 'Customer Support',
          description: 'Handle customer support inquiries',
          status: 'DRAFT',
          trigger: 'KEYWORD',
          createdAt: '2024-01-16T14:20:00Z',
        },
      ];
      
      dispatch({
        type: TENANT_ACTIONS.LOAD_WORKFLOWS,
        payload: mockWorkflows,
      });
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  // Load contacts
  const loadContacts = async (tenantId) => {
    try {
      // Mock data - replace with actual API call
      const mockContacts = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          tags: ['customer', 'vip'],
          status: 'ACTIVE',
          lastSeenAt: '2024-01-20T15:30:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          phone: '+0987654321',
          email: 'jane@example.com',
          tags: ['lead'],
          status: 'ACTIVE',
          lastSeenAt: '2024-01-19T09:15:00Z',
        },
      ];
      
      dispatch({
        type: TENANT_ACTIONS.LOAD_CONTACTS,
        payload: mockContacts,
      });
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Load analytics
  const loadAnalytics = async (tenantId) => {
    try {
      // Mock data - replace with actual API call
      const mockAnalytics = {
        messages: {
          sent: 1250,
          delivered: 1180,
          read: 950,
          failed: 70,
        },
        contacts: {
          total: 450,
          active: 320,
          new: 45,
          churned: 12,
        },
        conversations: {
          total: 280,
          avgDuration: 5.5, // minutes
          responseTime: 2.3, // minutes
        },
        revenue: {
          monthly: 2500,
          growth: 15.5, // percentage
        },
      };
      
      dispatch({
        type: TENANT_ACTIONS.LOAD_ANALYTICS,
        payload: mockAnalytics,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Update settings
  const updateSettings = async (settingsData) => {
    try {
      // Mock API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      dispatch({
        type: TENANT_ACTIONS.UPDATE_SETTINGS,
        payload: settingsData,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: TENANT_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    updateSettings,
    clearError,
    refreshData: () => loadTenantData(state.currentTenant?.id),
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

// Hook to use tenant context
export const useTenant = () => {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
};

export default TenantContext;