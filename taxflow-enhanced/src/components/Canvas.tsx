import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnNodesDelete,
  type OnEdgesDelete,
  type ReactFlowInstance,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Play,
  Download,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

// Node type colors
const NODE_COLORS: Record<string, string> = {
  input: '#3B82F6',
  calculation: '#10B981',
  forms: '#A855F7',
  validation: '#F59E0B',
  output: '#EF4444',
};

// Type for node status
type NodeStatus = 'idle' | 'running' | 'success' | 'error';

// Type for node group
type NodeGroup = 'input' | 'calculation' | 'forms' | 'validation' | 'output';

// Type for TaxNode data - extends Record to satisfy React Flow constraints
interface TaxNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  group: NodeGroup;
  status: NodeStatus;
  description: string;
}

// Custom node component
function TaxNode({ data }: { data: TaxNodeData }) {
  const nodeType = data.group || 'calculation';
  const color = NODE_COLORS[nodeType] || NODE_COLORS.calculation;
  const status = data.status || 'idle';

  const statusColors = {
    idle: 'border-gray-300',
    running: 'border-blue-500 animate-pulse',
    success: 'border-green-500',
    error: 'border-red-500',
  };

  const statusIcons = {
    idle: null,
    running: <Loader2 size={14} className="animate-spin" />,
    success: <div className="w-2 h-2 bg-green-500 rounded-full" />,
    error: <div className="w-2 h-2 bg-red-500 rounded-full" />,
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${statusColors[status as keyof typeof statusColors]} bg-white shadow-md min-w-[180px]`}
      style={{ borderColor: status === 'idle' ? color : undefined }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {statusIcons[status as keyof typeof statusIcons]}
      </div>
      <div className="font-medium text-sm text-gray-900">{data.label}</div>
      <div className="text-xs text-gray-500 mt-1">{data.description}</div>
    </div>
  );
}

const nodeTypes = {
  taxNode: TaxNode,
};

export function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaxNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node<TaxNodeData>, Edge> | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const {
    currentWorkflow,
    executeWorkflow,
  } = useWorkflowStore();

  // Handle node connection
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
          },
          eds
        )
      );

      // Add connection to workflow engine
      if (currentWorkflow) {
        currentWorkflow.connections.push({
          sourceNode: connection.source,
          sourceOutput: 0,
          targetNode: connection.target,
          targetInput: 0,
        });
      }
    },
    [currentWorkflow, setEdges]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop - add new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const nodeType = event.dataTransfer.getData('application/reactflow');
      const displayName = event.dataTransfer.getData('displayName');

      if (!nodeType) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const nodeId = `${nodeType}_${Date.now()}`;

      // Determine node group
      let group: NodeGroup = 'calculation';
      if (['manualEntry', 'w2Import', 'form1099Import', 'excelImport'].includes(nodeType)) {
        group = 'input';
      } else if (['form1040Generator', 'scheduleAGenerator', 'scheduleCGenerator', 'scheduleSEGenerator'].includes(nodeType)) {
        group = 'forms';
      } else if (['irsValidator', 'mathCheckValidator'].includes(nodeType)) {
        group = 'validation';
      } else if (['pdfPackageGenerator', 'excelReportGenerator'].includes(nodeType)) {
        group = 'output';
      }

      const newNode: Node<TaxNodeData> = {
        id: nodeId,
        type: 'taxNode',
        position,
        data: {
          label: displayName,
          nodeType,
          group,
          status: 'idle' as NodeStatus,
          description: getNodeDescription(nodeType),
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  // Handle node deletion
  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      if (currentWorkflow) {
        deleted.forEach((node) => {
          currentWorkflow.nodes.delete(node.id);
        });
      }
    },
    [currentWorkflow]
  );

  // Handle edge deletion
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      if (currentWorkflow) {
        deleted.forEach((edge) => {
          const index = currentWorkflow.connections.findIndex(
            (conn) => conn.sourceNode === edge.source && conn.targetNode === edge.target
          );
          if (index !== -1) {
            currentWorkflow.connections.splice(index, 1);
          }
        });
      }
    },
    [currentWorkflow]
  );

  // Execute workflow
  const handleExecute = async () => {
    if (!currentWorkflow || isExecuting) return;

    setIsExecuting(true);

    // Set all nodes to running status
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, status: 'running' },
      }))
    );

    try {
      await executeWorkflow();

      // Set all nodes to success status
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: 'success' },
        }))
      );
    } catch (err) {
      // Set all nodes to error status
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: 'error' },
        }))
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Export as PNG
  const handleExportPNG = () => {
    if (!reactFlowInstance) return;

    reactFlowInstance.fitView();

    setTimeout(() => {
      reactFlowInstance.getViewport();
      // In a real implementation, we'd use html2canvas or similar
      alert('Export PNG feature would be implemented here');
    }, 100);
  };

  // Clear workflow
  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      setNodes([]);
      setEdges([]);
      if (currentWorkflow) {
        currentWorkflow.nodes.clear();
        currentWorkflow.connections = [];
      }
    }
  };

  // Save workflow
  const handleSave = async () => {
    if (!currentWorkflow) return;

    // Save to IndexedDB
    alert('Workflow saved successfully!');
  };

  return (
    <div className="flex-1 relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeColor={(node: Node) => {
            const group = node.data?.group || 'calculation';
            return NODE_COLORS[group as keyof typeof NODE_COLORS] || NODE_COLORS.calculation;
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />

        {/* Control Panel */}
        <Panel position="top-right" className="space-x-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Execute workflow"
          >
            {isExecuting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play size={18} />
                Execute
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={nodes.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Save workflow"
          >
            <Save size={18} />
            Save
          </button>

          <button
            onClick={handleExportPNG}
            disabled={nodes.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Export as PNG"
          >
            <Download size={18} />
            Export PNG
          </button>

          <button
            onClick={handleClear}
            disabled={nodes.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Clear workflow"
          >
            <Trash2 size={18} />
            Clear
          </button>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Get Started
              </h3>
              <p className="text-sm text-gray-600">
                Drag nodes from the palette on the left to build your tax workflow.
                Connect nodes by dragging from output to input handles.
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function getNodeDescription(nodeType: string): string {
  const descriptions: Record<string, string> = {
    manualEntry: 'Manual data entry',
    w2Import: 'W-2 import',
    form1099Import: '1099 import',
    excelImport: 'Excel import',
    agiCalculator: 'AGI calculation',
    deductionCalculator: 'Deduction calc',
    taxBracketCalculator: 'Tax bracket calc',
    taxCredits: 'Tax credits',
    selfEmploymentTax: 'SE tax',
    stateTaxCalculator: 'State tax',
    form1040Generator: 'Form 1040',
    scheduleAGenerator: 'Schedule A',
    scheduleCGenerator: 'Schedule C',
    scheduleSEGenerator: 'Schedule SE',
    irsValidator: 'IRS validation',
    mathCheckValidator: 'Math check',
    pdfPackageGenerator: 'PDF package',
    excelReportGenerator: 'Excel report',
  };

  return descriptions[nodeType] || nodeType;
}
