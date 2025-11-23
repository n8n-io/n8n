import { create } from 'zustand';
import { TaxWorkflow, type TaxReturn } from '../core/workflow/TaxWorkflow';
import type { ITaxNode } from '../core/workflow/TaxNode';

interface WorkflowState {
  currentWorkflow: TaxWorkflow | null;
  selectedNodeId: string | null;
  isExecuting: boolean;
  result: TaxReturn | null;
  error: Error | null;

  setWorkflow: (workflow: TaxWorkflow) => void;
  addNode: (nodeId: string, node: ITaxNode) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  executeWorkflow: () => Promise<void>;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentWorkflow: null,
  selectedNodeId: null,
  isExecuting: false,
  result: null,
  error: null,

  setWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  addNode: (nodeId, node) => {
    const workflow = get().currentWorkflow;
    if (workflow) {
      workflow.addNode(nodeId, node);
      set({ currentWorkflow: workflow });
    }
  },

  removeNode: (nodeId) => {
    const workflow = get().currentWorkflow;
    if (workflow) {
      workflow.nodes.delete(nodeId);
      set({ currentWorkflow: workflow });
    }
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  executeWorkflow: async () => {
    const workflow = get().currentWorkflow;
    if (!workflow) {
      set({ error: new Error('No workflow to execute') });
      return;
    }

    set({ isExecuting: true, error: null });
    try {
      const result = await workflow.execute();
      set({ result, isExecuting: false });
    } catch (error) {
      console.error('Workflow execution failed:', error);
      set({
        error: error instanceof Error ? error : new Error('Workflow execution failed'),
        isExecuting: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
