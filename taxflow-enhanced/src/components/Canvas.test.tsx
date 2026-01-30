/**
 * Canvas Component Tests
 * Tests the React Flow workflow canvas with drag-drop, keyboard nav, and ARIA
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { Canvas } from './Canvas';
import { useWorkflowStore } from '../store/workflowStore';
import { TaxWorkflow } from '../core/workflow/TaxWorkflow';
import { createMockTaxpayerInfo } from '../test/utils';

// Mock the store
vi.mock('../store/workflowStore');

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial render', () => {
    it('should render with empty workflow state', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      // Should show empty state message
      expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag nodes from the palette/i)).toBeInTheDocument();
    });

    it('should render control buttons', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      // Control buttons should be present
      expect(screen.getByLabelText(/Execute workflow/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Save workflow/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Export as PNG/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Clear workflow/i)).toBeInTheDocument();
    });

    it('should disable control buttons when no nodes', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      const executeButton = screen.getByLabelText(/Execute workflow/i);
      const saveButton = screen.getByLabelText(/Save workflow/i);
      const exportButton = screen.getByLabelText(/Export as PNG/i);
      const clearButton = screen.getByLabelText(/Clear workflow/i);

      // All buttons should be disabled when no nodes
      expect(executeButton).toBeDisabled();
      expect(saveButton).toBeDisabled();
      expect(exportButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Workflow state', () => {
    it('should render with a workflow instance', () => {
      const workflow = new TaxWorkflow('test-wf', 'Test Workflow', {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: createMockTaxpayerInfo(),
      });

      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: workflow,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      // Canvas should render successfully with a workflow
      expect(screen.getByLabelText(/Execute workflow/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on all control buttons', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      // All buttons should have aria-labels
      expect(screen.getByLabelText(/Execute workflow/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/Save workflow/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/Export as PNG/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/Clear workflow/i)).toHaveAttribute('aria-label');
    });

    it('should have focus-visible classes for keyboard navigation', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      const executeButton = screen.getByLabelText(/Execute workflow/i);

      // Button should have focus ring classes for visibility
      expect(executeButton.className).toMatch(/focus:ring/i);
    });

    it('should maintain tab order for keyboard navigation', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      // All control buttons should be focusable (not have tabIndex -1)
      const buttons = [
        screen.getByLabelText(/Execute workflow/i),
        screen.getByLabelText(/Save workflow/i),
        screen.getByLabelText(/Export as PNG/i),
        screen.getByLabelText(/Clear workflow/i),
      ];

      buttons.forEach((button) => {
        const tabIndex = button.getAttribute('tabindex');
        expect(tabIndex).not.toBe('-1');
      });
    });

    it('should have proper button states communicated to screen readers', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        currentWorkflow: null,
        result: null,
        error: null,
        isExecuting: false,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Canvas />);

      const executeButton = screen.getByLabelText(/Execute workflow/i);

      // Disabled state should be properly set
      expect(executeButton).toHaveAttribute('disabled');
    });
  });
});
