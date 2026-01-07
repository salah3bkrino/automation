import React from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  TagIcon,
  DocumentTextIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

// Base node component
const BaseNode = ({ data, selected, children }) => {
  const getNodeColor = (type) => {
    const colors = {
      trigger: 'border-red-500 bg-red-50',
      action: 'border-green-500 bg-green-50',
      condition: 'border-yellow-500 bg-yellow-50',
      integration: 'border-blue-500 bg-blue-50',
    };
    return colors[data.category] || 'border-gray-500 bg-gray-50';
  };

  const getIcon = (type) => {
    const icons = {
      trigger: PlayIcon,
      message: ChatBubbleLeftRightIcon,
      delay: ClockIcon,
      condition: ArrowPathIcon,
      webhook: GlobeAltIcon,
      email: EnvelopeIcon,
      tag: TagIcon,
      note: DocumentTextIcon,
    };
    const Icon = icons[type] || DocumentTextIcon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div
      className={`workflow-node ${selected ? 'workflow-node-selected' : ''} ${getNodeColor(data.type)}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      
      <div className="flex items-center space-x-2">
        <div className={`p-2 rounded-lg ${
          data.category === 'trigger' ? 'bg-red-100 text-red-600' :
          data.category === 'action' ? 'bg-green-100 text-green-600' :
          data.category === 'condition' ? 'bg-yellow-100 text-yellow-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {getIcon(data.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-gray-500 truncate">
              {data.description}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {getNodeDescription(data)}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
};

function getNodeDescription(data) {
  const descriptions = {
    trigger: data.config?.triggerType?.replace('_', ' ') || 'No trigger set',
    message: data.config?.message?.substring(0, 30) + '...' || 'No message',
    delay: `Wait ${data.config?.delay || 5} ${data.config?.unit || 'seconds'}`,
    condition: `If ${data.config?.condition || 'contains'} "${data.config?.value || ''}"`,
    webhook: data.config?.url || 'No URL set',
    email: data.config?.to || 'No recipient',
    tag: `${data.config?.action || 'add'} tag "${data.config?.tag || ''}"`,
    note: data.config?.note?.substring(0, 30) + '...' || 'No note',
  };
  return descriptions[data.type] || 'Configure this node';
}

// Trigger Node
export const TriggerNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'trigger' }} />
);

// Message Node
export const MessageNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'action' }} />
);

// Delay Node
export const DelayNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'action' }} />
);

// Condition Node
export const ConditionNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'condition' }} />
);

// Webhook Node
export const WebhookNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'integration' }} />
);

// Email Node
export const EmailNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'integration' }} />
);

// Tag Node
export const TagNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'action' }} />
);

// Note Node
export const NoteNode = (props) => (
  <BaseNode {...props} data={{ ...props.data, category: 'action' }} />
);

// Export all node types
export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  email: EmailNode,
  tag: TagNode,
  note: NoteNode,
};