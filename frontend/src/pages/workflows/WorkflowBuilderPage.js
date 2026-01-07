import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactFlow, ReactFlow, Background, Controls, MiniMap } from 'react-flow-renderer';
import { 
  PlayIcon, 
  StopIcon, 
  SaveIcon, 
  ArrowLeftIcon,
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useWorkflows } from '../../hooks/useWorkflows';
import toast from 'react-hot-toast';

// Import node types
import { nodeTypes } from './nodes';
import { Sidebar } from './Sidebar';
import { PropertiesPanel } from './PropertiesPanel';

const WorkflowBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { workflow, loading, saveWorkflow, updateWorkflow, executeWorkflow } = useWorkflows(id);

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useReactFlow({
    defaultNodes: workflow?.nodes || [],
    defaultEdges: workflow?.edges || [],
  });

  // Initialize workflow data
  React.useEffect(() => {
    if (workflow && !loading) {
      setNodes(workflow.nodes || []);
      setEdges(workflow.edges || []);
    }
  }, [workflow, loading, setNodes, setEdges]);

  const onInit = useCallback((rf) => {
    setReactFlowInstance(rf);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: {
          label: getNodeLabel(type),
          type,
          config: getNodeDefaultConfig(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSave = async () => {
    if (!workflow) return;

    setIsSaving(true);
    try {
      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        nodes,
        edges,
        status: 'ACTIVE',
      };

      if (id === 'new') {
        const result = await saveWorkflow(workflowData);
        if (result.success) {
          toast.success('Workflow saved successfully!');
          navigate(`/workflows/builder/${result.data.id}`);
        }
      } else {
        const result = await updateWorkflow(id, workflowData);
        if (result.success) {
          toast.success('Workflow updated successfully!');
        }
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!workflow || !workflow.id) {
      toast.error('Please save the workflow first');
      return;
    }

    setIsRunning(true);
    try {
      const result = await executeWorkflow(workflow.id);
      if (result.success) {
        toast.success('Workflow executed successfully!');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setSelectedNode(null);
    toast.success('Node deleted');
  }, [selectedNode, setNodes]);

  const handleUpdateNode = useCallback((nodeId, updates) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/workflows')}
              className="btn btn-ghost"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {workflow?.name || 'New Workflow'}
              </h1>
              {workflow?.description && (
                <p className="text-sm text-gray-500">{workflow.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteNode}
              disabled={!selectedNode}
              className="btn btn-outline"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleExecute}
              disabled={isRunning || !workflow?.id}
              className="btn btn-secondary"
            >
              {isRunning ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </div>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Test Run
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {id === 'new' ? 'Save' : 'Update'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'trigger') return '#ef4444';
                if (node.type === 'action') return '#22c55e';
                if (node.type === 'condition') return '#f59e0b';
                return '#6b7280';
              }}
              className="bg-white border border-gray-200"
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
        />
      </div>
    </div>
  );
};

// Helper functions
function getNodeLabel(type) {
  const labels = {
    trigger: 'Trigger',
    message: 'Send Message',
    condition: 'Condition',
    delay: 'Delay',
    webhook: 'Webhook',
    email: 'Send Email',
    tag: 'Add Tag',
    note: 'Add Note',
  };
  return labels[type] || 'Node';
}

function getNodeDefaultConfig(type) {
  const configs = {
    trigger: {
      triggerType: 'message_received',
      keywords: [],
    },
    message: {
      message: '',
      messageType: 'text',
    },
    condition: {
      condition: 'contains',
      value: '',
    },
    delay: {
      delay: 5,
      unit: 'seconds',
    },
    webhook: {
      url: '',
      method: 'POST',
      headers: {},
    },
    email: {
      to: '',
      subject: '',
      body: '',
    },
    tag: {
      tag: '',
      action: 'add',
    },
    note: {
      note: '',
    },
  };
  return configs[type] || {};
}

export default WorkflowBuilderPage;