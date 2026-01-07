import React from 'react';
import { useDrag } from 'react-dnd';
import {
  PlayIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  TagIcon,
  DocumentTextIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const nodeTypes = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start workflow when...',
    icon: PlayIcon,
    category: 'trigger',
    color: 'bg-red-100 text-red-600 border-red-200',
  },
  {
    type: 'message',
    label: 'Send Message',
    description: 'Send WhatsApp message',
    icon: ChatBubbleLeftRightIcon,
    category: 'action',
    color: 'bg-green-100 text-green-600 border-green-200',
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Wait before next step',
    icon: ClockIcon,
    category: 'action',
    color: 'bg-green-100 text-green-600 border-green-200',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Check if condition is met',
    icon: ArrowPathIcon,
    category: 'condition',
    color: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Call external API',
    icon: GlobeAltIcon,
    category: 'integration',
    color: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  {
    type: 'email',
    label: 'Send Email',
    description: 'Send email notification',
    icon: EnvelopeIcon,
    category: 'integration',
    color: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  {
    type: 'tag',
    label: 'Add/Remove Tag',
    description: 'Manage contact tags',
    icon: TagIcon,
    category: 'action',
    color: 'bg-green-100 text-green-600 border-green-200',
  },
  {
    type: 'note',
    label: 'Add Note',
    description: 'Add note to contact',
    icon: DocumentTextIcon,
    category: 'action',
    color: 'bg-green-100 text-green-600 border-green-200',
  },
];

const Sidebar = () => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Workflow Nodes</h3>
        <p className="text-xs text-gray-500">
          Drag and drop nodes to build your workflow
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Trigger Nodes */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Triggers
            </h4>
            <div className="space-y-2">
              {nodeTypes
                .filter((node) => node.category === 'trigger')
                .map((node) => (
                  <SidebarNode key={node.type} node={node} />
                ))}
            </div>
          </div>

          {/* Action Nodes */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Actions
            </h4>
            <div className="space-y-2">
              {nodeTypes
                .filter((node) => node.category === 'action')
                .map((node) => (
                  <SidebarNode key={node.type} node={node} />
                ))}
            </div>
          </div>

          {/* Condition Nodes */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Conditions
            </h4>
            <div className="space-y-2">
              {nodeTypes
                .filter((node) => node.category === 'condition')
                .map((node) => (
                  <SidebarNode key={node.type} node={node} />
                ))}
            </div>
          </div>

          {/* Integration Nodes */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Integrations
            </h4>
            <div className="space-y-2">
              {nodeTypes
                .filter((node) => node.category === 'integration')
                .map((node) => (
                  <SidebarNode key={node.type} node={node} />
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button className="w-full btn btn-outline text-sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Custom Node
        </button>
      </div>
    </div>
  );
};

const SidebarNode = ({ node }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'node',
    item: { type: node.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const Icon = node.icon;

  return (
    <div
      ref={drag}
      className={`p-3 border rounded-lg cursor-move transition-all duration-200 hover:shadow-md ${node.color} ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {node.label}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {node.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;