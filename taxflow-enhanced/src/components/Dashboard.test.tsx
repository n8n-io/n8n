/**
 * Dashboard Component Tests
 * Tests the tax calculation results dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { Dashboard } from './Dashboard';
import { useWorkflowStore } from '../store/workflowStore';
import { createMockTaxReturn } from '../test/utils';

// Mock the store
vi.mock('../store/workflowStore');

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should show empty state when no result', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        result: null,
        error: null,
        isExecuting: false,
        currentWorkflow: null,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Dashboard />);

      expect(screen.getByText('No Results Yet')).toBeInTheDocument();
      expect(screen.getByText(/Build your workflow on the canvas/i)).toBeInTheDocument();
    });
  });

  describe('Executing state', () => {
    it('should show loading state during execution', () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        result: null,
        error: null,
        isExecuting: true,
        currentWorkflow: null,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Dashboard />);

      expect(screen.getByText('Executing Workflow')).toBeInTheDocument();
      expect(screen.getByText('Processing tax calculations...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when execution fails', () => {
      const error = new Error('Workflow execution failed');

      vi.mocked(useWorkflowStore).mockReturnValue({
        result: null,
        error,
        isExecuting: false,
        currentWorkflow: null,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Dashboard />);

      expect(screen.getByText('Execution Error')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    it('should display tax summary cards when result is available', () => {
      const mockResult = createMockTaxReturn();

      vi.mocked(useWorkflowStore).mockReturnValue({
        result: mockResult,
        error: null,
        isExecuting: false,
        currentWorkflow: null,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Dashboard />);

      // Check for summary cards
      expect(screen.getByText('AGI')).toBeInTheDocument();
      expect(screen.getByText('Deductions')).toBeInTheDocument();
      expect(screen.getByText('Taxable Income')).toBeInTheDocument();
      expect(screen.getByText('Total Tax')).toBeInTheDocument();
    });

    it('should enable export buttons when result is available', () => {
      const mockResult = createMockTaxReturn();

      vi.mocked(useWorkflowStore).mockReturnValue({
        result: mockResult,
        error: null,
        isExecuting: false,
        currentWorkflow: null,
        selectedNodeId: null,
        setWorkflow: vi.fn(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
        selectNode: vi.fn(),
        executeWorkflow: vi.fn(),
        clearError: vi.fn(),
      });

      render(<Dashboard />);

      const pdfButton = screen.getByLabelText('Generate PDF package');
      const excelButton = screen.getByLabelText('Download Excel report');

      expect(pdfButton).toBeEnabled();
      expect(excelButton).toBeEnabled();
    });
  });
});
