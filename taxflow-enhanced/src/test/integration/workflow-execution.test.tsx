/**
 * Workflow Execution Integration Tests
 * Tests end-to-end workflow execution with multiple nodes working together
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import { TaxWorkflow } from '../../core/workflow/TaxWorkflow';
import { ManualEntryNode } from '../../nodes/input/ManualEntryNode';
import { AGICalculatorNode } from '../../nodes/calculation/AGICalculatorNode';
import { DeductionCalculatorNode } from '../../nodes/calculation/DeductionCalculatorNode';
import { TaxBracketCalculatorNode } from '../../nodes/calculation/TaxBracketCalculatorNode';
import { createMockTaxpayerInfo } from '../utils';

describe('Workflow Execution Integration Tests', () => {
  let workflow: TaxWorkflow;

  beforeEach(() => {
    workflow = new TaxWorkflow('test-workflow', 'Test Tax Workflow', {
      taxYear: 2024,
      filingStatus: 'single',
      taxpayerInfo: createMockTaxpayerInfo(),
    });
  });

  describe('Simple workflow execution', () => {
    it('should execute workflow with input and calculation nodes', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);

      // Connect Input -> AGI
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      // Execute workflow
      const result = await workflow.execute();

      // Workflow should execute successfully
      expect(result.workflowId).toBe('test-workflow');
      expect(result.taxYear).toBe(2024);
      expect(result.filingStatus).toBe('single');
    });

    it('should pass data between connected nodes', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();
      const deductionNode = new DeductionCalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);
      workflow.addNode('deduction', deductionNode);

      // Connect Input -> AGI -> Deduction
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction',
        targetInput: 0,
      });

      // Execute workflow
      const result = await workflow.execute();

      // Both nodes should have executed
      expect(result).toBeDefined();
      expect(result.agi).toBeInstanceOf(Decimal);
      expect(result.deductions).toBeDefined();
    });
  });

  describe('Multi-node workflow execution', () => {
    it('should execute complete tax calculation workflow', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();
      const deductionNode = new DeductionCalculatorNode();
      const taxNode = new TaxBracketCalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);
      workflow.addNode('deduction', deductionNode);
      workflow.addNode('tax', taxNode);

      // Connect nodes: Input -> AGI -> Deduction -> Tax
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'deduction',
        sourceOutput: 0,
        targetNode: 'tax',
        targetInput: 0,
      });

      // Execute workflow
      const result = await workflow.execute();

      // All calculation nodes should have executed
      expect(result.agi).toBeInstanceOf(Decimal);
      expect(result.deductions).toBeDefined();
      expect(result.tax).toBeDefined();
      expect(result.tax.regularTax).toBeInstanceOf(Decimal);
    });

    it('should handle parallel node execution', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();
      const deduction1 = new DeductionCalculatorNode();
      const deduction2 = new DeductionCalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);
      workflow.addNode('deduction1', deduction1);
      workflow.addNode('deduction2', deduction2);

      // Connect Input -> AGI -> [Deduction1, Deduction2] (parallel)
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction1',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction2',
        targetInput: 0,
      });

      // Execute workflow - should handle parallel branches
      const result = await workflow.execute();

      expect(result).toBeDefined();
      expect(result.agi).toBeInstanceOf(Decimal);
    });

    it('should execute nodes in correct topological order', async () => {
      const executionOrder: string[] = [];

      // Create tracking input node
      const inputNode = new ManualEntryNode();
      const originalInputExecute = inputNode.execute.bind(inputNode);
      inputNode.execute = async (context, inputs) => {
        executionOrder.push('input');
        return originalInputExecute(context, inputs);
      };

      // Create nodes that track execution order
      const createTrackingNode = (id: string) => {
        const node = new AGICalculatorNode();
        const originalExecute = node.execute.bind(node);
        node.execute = async (context, inputs) => {
          executionOrder.push(id);
          return originalExecute(context, inputs);
        };
        return node;
      };

      const node1 = createTrackingNode('node1');
      const node2 = createTrackingNode('node2');

      workflow.addNode('input', inputNode);
      workflow.addNode('node1', node1);
      workflow.addNode('node2', node2);

      // Create dependencies: input -> node1 -> node2
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'node1',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'node1',
        sourceOutput: 0,
        targetNode: 'node2',
        targetInput: 0,
      });

      await workflow.execute();

      // Nodes should execute in dependency order
      expect(executionOrder).toEqual(['input', 'node1', 'node2']);
    });
  });

  describe('Error handling', () => {
    it('should handle empty workflow', async () => {
      // Execute empty workflow
      const result = await workflow.execute();

      // Should return default values
      expect(result.workflowId).toBe('test-workflow');
      expect(result.agi.toNumber()).toBe(0);
      expect(result.taxableIncome.toNumber()).toBe(0);
    });

    it('should handle nodes without connections', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);

      // No connections between nodes
      // Input will execute but AGI will throw since it needs input
      await expect(workflow.execute()).rejects.toThrow();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const inputNode = new ManualEntryNode();

      workflow.addNode('input', inputNode);

      // Execute workflow with just input node
      const result = await workflow.execute();

      // Should execute without errors
      expect(result).toBeDefined();
      expect(result.workflowId).toBe('test-workflow');
    });
  });

  describe('Data flow validation', () => {
    it('should preserve data through node chain', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();
      const deductionNode = new DeductionCalculatorNode();
      const taxNode = new TaxBracketCalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);
      workflow.addNode('deduction', deductionNode);
      workflow.addNode('tax', taxNode);

      // Create data flow chain
      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'deduction',
        sourceOutput: 0,
        targetNode: 'tax',
        targetInput: 0,
      });

      const result = await workflow.execute();

      // Verify data flows correctly
      expect(result.agi).toBeInstanceOf(Decimal);
      expect(result.deductions.amount).toBeInstanceOf(Decimal);
      expect(result.tax.regularTax).toBeInstanceOf(Decimal);

      // Tax should be calculated on taxable income
      expect(result.taxableIncome).toBeInstanceOf(Decimal);
    });

    it('should maintain workflow state during execution', async () => {
      const inputNode = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();

      workflow.addNode('input', inputNode);
      workflow.addNode('agi', agiNode);

      workflow.addConnection({
        sourceNode: 'input',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      // Execute once
      const result1 = await workflow.execute();

      // Execute again - should produce consistent results
      const result2 = await workflow.execute();

      expect(result1.workflowId).toBe(result2.workflowId);
      expect(result1.taxYear).toBe(result2.taxYear);
      expect(result1.filingStatus).toBe(result2.filingStatus);
    });

    it('should handle complex multi-input scenarios', async () => {
      const input1 = new ManualEntryNode();
      const input2 = new ManualEntryNode();
      const agiNode = new AGICalculatorNode();
      const deductionNode = new DeductionCalculatorNode();

      workflow.addNode('input1', input1);
      workflow.addNode('input2', input2);
      workflow.addNode('agi', agiNode);
      workflow.addNode('deduction', deductionNode);

      // Create workflow: [Input1, Input2] -> AGI -> Deduction
      workflow.addConnection({
        sourceNode: 'input1',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'input2',
        sourceOutput: 0,
        targetNode: 'agi',
        targetInput: 0,
      });

      workflow.addConnection({
        sourceNode: 'agi',
        sourceOutput: 0,
        targetNode: 'deduction',
        targetInput: 0,
      });

      // Execute workflow
      const result = await workflow.execute();

      // AGI node should receive inputs from both input nodes
      expect(result).toBeDefined();
      expect(result.agi).toBeInstanceOf(Decimal);
      expect(result.deductions).toBeDefined();
    });
  });
});
