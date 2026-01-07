import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PhoneArrowUpRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DashboardPage = () => {
  const { analytics, currentTenant, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-500"></div>
      </div>
    );
  }

  // Mock data for charts
  const messageData = [
    { name: 'Mon', sent: 45, received: 32 },
    { name: 'Tue', sent: 52, received: 41 },
    { name: 'Wed', sent: 38, received: 35 },
    { name: 'Thu', sent: 65, received: 48 },
    { name: 'Fri', sent: 48, received: 52 },
    { name: 'Sat', sent: 32, received: 28 },
    { name: 'Sun', sent: 25, received: 22 },
  ];

  const contactGrowthData = [
    { month: 'Jan', contacts: 120 },
    { month: 'Feb', contacts: 145 },
    { month: 'Mar', contacts: 178 },
    { month: 'Apr', contacts: 210 },
    { month: 'May', contacts: 245 },
    { month: 'Jun', contacts: 280 },
  ];

  const stats = [
    {
      name: 'Total Messages',
      value: analytics?.messages?.sent || 1250,
      change: '+12.5%',
      changeType: 'increase',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Contacts',
      value: analytics?.contacts?.active || 320,
      change: '+8.2%',
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Conversations',
      value: analytics?.conversations?.total || 280,
      change: '+15.3%',
      changeType: 'increase',
      icon: PhoneArrowUpRightIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Avg Response Time',
      value: `${analytics?.conversations?.responseTime || 2.3}m`,
      change: '-0.5m',
      changeType: 'decrease',
      icon: ClockIcon,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {currentTenant?.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening with your WhatsApp automation today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                      <span className="sr-only">
                        {stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by
                      </span>
                      {stat.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Messages Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Messages Overview</h3>
            <div className="flex space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-whatsapp-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Sent</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Received</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={messageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#25D366"
                strokeWidth={2}
                dot={{ fill: '#25D366' }}
              />
              <Line
                type="monotone"
                dataKey="received"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={{ fill: '#9CA3AF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contact Growth Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Growth</h3>
            <span className="text-sm text-green-600 font-medium">+18.2%</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={contactGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="contacts" fill="#25D366" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[
                {
                  type: 'message',
                  user: 'John Doe',
                  action: 'sent a message',
                  time: '2 minutes ago',
                  status: 'delivered',
                },
                {
                  type: 'workflow',
                  user: 'System',
                  action: 'workflow "Welcome Message" triggered',
                  time: '5 minutes ago',
                  status: 'completed',
                },
                {
                  type: 'contact',
                  user: 'Jane Smith',
                  action: 'added as new contact',
                  time: '10 minutes ago',
                  status: 'active',
                },
                {
                  type: 'message',
                  user: 'Mike Johnson',
                  action: 'received a message',
                  time: '15 minutes ago',
                  status: 'read',
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      activity.type === 'message'
                        ? 'bg-blue-100'
                        : activity.type === 'workflow'
                        ? 'bg-green-100'
                        : 'bg-purple-100'
                    }`}>
                      {activity.type === 'message' && (
                        <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600" />
                      )}
                      {activity.type === 'workflow' && (
                        <ChartBarIcon className="h-4 w-4 text-green-600" />
                      )}
                      {activity.type === 'contact' && (
                        <UserGroupIcon className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`status-indicator ${
                      activity.status === 'delivered' || activity.status === 'completed'
                        ? 'status-success'
                        : activity.status === 'active'
                        ? 'status-info'
                        : 'status-warning'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <button className="w-full btn btn-outline text-left justify-start">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-3" />
                Send Test Message
              </button>
              <button className="w-full btn btn-outline text-left justify-start">
                <UserGroupIcon className="h-5 w-5 mr-3" />
                Add New Contact
              </button>
              <button className="w-full btn btn-outline text-left justify-start">
                <PhoneArrowUpRightIcon className="h-5 w-5 mr-3" />
                Connect WhatsApp
              </button>
              <button className="w-full btn btn-outline text-left justify-start">
                <ChartBarIcon className="h-5 w-5 mr-3" />
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;