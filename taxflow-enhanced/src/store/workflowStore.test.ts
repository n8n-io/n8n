/**
 * WorkflowStore Tests
 * Tests the Zustand store managing workflow state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkflowStore } from './workflowStore';
import { TaxWorkflow } from '../core/workflow/TaxWorkflow';
import { createMockTaxpayerInfo } from '../test/utils';

describe('workflowStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkflowStore.setState({
      currentWorkflow: null,
      selectedNodeId: null,
      isExecuting: false,
      result: null,
      error: null,
    });
  });

  describe('State mutations', () => {
    it('should set workflow correctly', () => {
      const workflow = new TaxWorkflow('test-id', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      useWorkflowStore.getState().setWorkflow(workflow);

      expect(useWorkflowStore.getState().currentWorkflow).toBe(workflow);
    });

    it('should select node correctly', () => {
      useWorkflowStore.getState().selectNode('node-123');

      expect(useWorkflowStore.getState().selectedNodeId).toBe('node-123');
    });

    it('should clear selected node', () => {
      useWorkflowStore.getState().selectNode('node-123');
      useWorkflowStore.getState().selectNode(null);

      expect(useWorkflowStore.getState().selectedNodeId).toBeNull();
    });

    it('should clear error state', () => {
      useWorkflowStore.setState({ error: new Error('Test error') });
      useWorkflowStore.getState().clearError();

      expect(useWorkflowStore.getState().error).toBeNull();
    });
  });

  describe('Workflow execution', () => {
    it('should set isExecuting during workflow execution', async () => {
      const workflow = new TaxWorkflow('test-id', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      // Mock execute to return immediately
      workflow.execute = vi.fn().mockResolvedValue({
        workflowId: 'test-id',
        taxYear: 2024,
        // ... minimal mock return
      });

      useWorkflowStore.getState().setWorkflow(workflow);

      // Start execution
      const promise = useWorkflowStore.getState().executeWorkflow();

      // Should be executing
      expect(useWorkflowStore.getState().isExecuting).toBe(true);

      await promise;

      // Should be done
      expect(useWorkflowStore.getState().isExecuting).toBe(false);
    });

    it('should set result after successful execution', async () => {
      const workflow = new TaxWorkflow('test-id', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      const mockResult = {
        workflowId: 'test-id',
        taxYear: 2024,
      } as any;

      workflow.execute = vi.fn().mockResolvedValue(mockResult);
      useWorkflowStore.getState().setWorkflow(workflow);

      await useWorkflowStore.getState().executeWorkflow();

      expect(useWorkflowStore.getState().result).toEqual(mockResult);
      expect(useWorkflowStore.getState().error).toBeNull();
    });

    it('should handle execution errors', async () => {
      const workflow = new TaxWorkflow('test-id', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      const mockError = new Error('Execution failed');
      workflow.execute = vi.fn().mockRejectedValue(mockError);

      useWorkflowStore.getState().setWorkflow(workflow);

      await useWorkflowStore.getState().executeWorkflow();

      expect(useWorkflowStore.getState().error).toEqual(mockError);
      expect(useWorkflowStore.getState().result).toBeNull();
      expect(useWorkflowStore.getState().isExecuting).toBe(false);
    });

    it('should handle missing workflow gracefully', async () => {
      await useWorkflowStore.getState().executeWorkflow();

      expect(useWorkflowStore.getState().error).toBeInstanceOf(Error);
      expect(useWorkflowStore.getState().error?.message).toContain('No workflow');
    });

    it('should clear previous errors before new execution', async () => {
      const workflow = new TaxWorkflow('test-id', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      workflow.execute = vi.fn().mockResolvedValue({ workflowId: 'test-id' } as any);

      useWorkflowStore.setState({ error: new Error('Old error') });
      useWorkflowStore.getState().setWorkflow(workflow);

      await useWorkflowStore.getState().executeWorkflow();

      expect(useWorkflowStore.getState().error).toBeNull();
    });
  });
});
