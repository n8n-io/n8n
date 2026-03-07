/**
 * TopologicalSort Tests
 * Tests the topological sorting algorithm used for workflow execution order
 */

import { describe, it, expect } from 'vitest';
import { TopologicalSort, type TaxConnection } from './TopologicalSort';

describe('TopologicalSort', () => {
  describe('Linear dependency chain', () => {
    it('should sort linear chain correctly: A → B → C', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'C', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B', 'C'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toEqual(['A', 'B', 'C']);
    });

    it('should handle reverse order input: C, B, A', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'C', targetInput: 0 },
      ];
      const nodeIds = ['C', 'B', 'A']; // Input in reverse order

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toEqual(['A', 'B', 'C']);
    });
  });

  describe('Diamond dependency pattern', () => {
    it('should sort diamond pattern: A → B,C → D', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'C', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'D', targetInput: 0 },
        { sourceNode: 'C', sourceOutput: 0, targetNode: 'D', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B', 'C', 'D'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      // A must come first, D must come last, B and C can be in any order
      expect(sorted[0]).toBe('A');
      expect(sorted[3]).toBe('D');
      expect(sorted.slice(1, 3).sort()).toEqual(['B', 'C']);
    });

    it('should handle multiple diamond patterns', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'C', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'D', targetInput: 0 },
        { sourceNode: 'C', sourceOutput: 0, targetNode: 'D', targetInput: 0 },
        { sourceNode: 'D', sourceOutput: 0, targetNode: 'E', targetInput: 0 },
        { sourceNode: 'D', sourceOutput: 0, targetNode: 'F', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B', 'C', 'D', 'E', 'F'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted[0]).toBe('A');
      expect(sorted.indexOf('D')).toBeGreaterThan(sorted.indexOf('B'));
      expect(sorted.indexOf('D')).toBeGreaterThan(sorted.indexOf('C'));
    });
  });

  describe('Cycle detection', () => {
    it('should detect simple cycle: A → B → A', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'A', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B'];

      expect(() => {
        TopologicalSort.sort(nodeIds, connections);
      }).toThrow(/cycle|circular/i);
    });

    it('should detect complex cycle: A → B → C → A', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
        { sourceNode: 'B', sourceOutput: 0, targetNode: 'C', targetInput: 0 },
        { sourceNode: 'C', sourceOutput: 0, targetNode: 'A', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B', 'C'];

      expect(() => {
        TopologicalSort.sort(nodeIds, connections);
      }).toThrow(/cycle|circular/i);
    });

    it('should detect self-loop: A → A', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'A', targetInput: 0 },
      ];
      const nodeIds = ['A'];

      expect(() => {
        TopologicalSort.sort(nodeIds, connections);
      }).toThrow(/cycle|circular/i);
    });
  });

  describe('Independent nodes', () => {
    it('should handle independent nodes (no connections)', () => {
      const connections: TaxConnection[] = [];
      const nodeIds = ['A', 'B', 'C'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toHaveLength(3);
      expect(sorted.sort()).toEqual(['A', 'B', 'C']);
    });

    it('should handle mix of connected and independent nodes', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B', 'C', 'D'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toHaveLength(4);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
    });
  });

  describe('Edge cases', () => {
    it('should handle empty workflow (no nodes)', () => {
      const connections: TaxConnection[] = [];
      const nodeIds: string[] = [];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toEqual([]);
    });

    it('should handle single node', () => {
      const connections: TaxConnection[] = [];
      const nodeIds = ['A'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toEqual(['A']);
    });

    it('should handle two connected nodes', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'A', sourceOutput: 0, targetNode: 'B', targetInput: 0 },
      ];
      const nodeIds = ['A', 'B'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      expect(sorted).toEqual(['A', 'B']);
    });
  });

  describe('Complex workflows', () => {
    it('should sort complex tax workflow correctly', () => {
      // Workflow: Input → AGI → Deductions → TaxCalc → Credits → Result
      const connections: TaxConnection[] = [
        { sourceNode: 'w2Input', sourceOutput: 0, targetNode: 'agiCalc', targetInput: 0 },
        { sourceNode: '1099Input', sourceOutput: 0, targetNode: 'agiCalc', targetInput: 1 },
        { sourceNode: 'agiCalc', sourceOutput: 0, targetNode: 'deductions', targetInput: 0 },
        { sourceNode: 'deductions', sourceOutput: 0, targetNode: 'taxCalc', targetInput: 0 },
        { sourceNode: 'taxCalc', sourceOutput: 0, targetNode: 'credits', targetInput: 0 },
        { sourceNode: 'credits', sourceOutput: 0, targetNode: 'result', targetInput: 0 },
      ];
      const nodeIds = ['w2Input', '1099Input', 'agiCalc', 'deductions', 'taxCalc', 'credits', 'result'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      // Verify order
      expect(sorted.indexOf('agiCalc')).toBeGreaterThan(sorted.indexOf('w2Input'));
      expect(sorted.indexOf('agiCalc')).toBeGreaterThan(sorted.indexOf('1099Input'));
      expect(sorted.indexOf('deductions')).toBeGreaterThan(sorted.indexOf('agiCalc'));
      expect(sorted.indexOf('taxCalc')).toBeGreaterThan(sorted.indexOf('deductions'));
      expect(sorted.indexOf('credits')).toBeGreaterThan(sorted.indexOf('taxCalc'));
      expect(sorted.indexOf('result')).toBeGreaterThan(sorted.indexOf('credits'));
    });

    it('should handle multiple input nodes converging to single node', () => {
      const connections: TaxConnection[] = [
        { sourceNode: 'input1', sourceOutput: 0, targetNode: 'merger', targetInput: 0 },
        { sourceNode: 'input2', sourceOutput: 0, targetNode: 'merger', targetInput: 1 },
        { sourceNode: 'input3', sourceOutput: 0, targetNode: 'merger', targetInput: 2 },
      ];
      const nodeIds = ['input1', 'input2', 'input3', 'merger'];

      const sorted = TopologicalSort.sort(nodeIds, connections);

      // All inputs should come before merger
      expect(sorted.indexOf('merger')).toBeGreaterThan(sorted.indexOf('input1'));
      expect(sorted.indexOf('merger')).toBeGreaterThan(sorted.indexOf('input2'));
      expect(sorted.indexOf('merger')).toBeGreaterThan(sorted.indexOf('input3'));
      expect(sorted[sorted.length - 1]).toBe('merger');
    });
  });
});
