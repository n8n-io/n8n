/**
 * NodePalette Component Tests
 * Tests node palette rendering, search, drag-drop, keyboard nav, and accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, userEvent } from '../test/utils';
import { NodePalette } from './NodePalette';

describe('NodePalette', () => {
  beforeEach(() => {
    // Reset any state between tests
  });

  describe('Initial render', () => {
    it('should render all node categories', () => {
      render(<NodePalette />);

      // Check for all category headers
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Calculation')).toBeInTheDocument();
      expect(screen.getByText('Forms')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('should render node palette header', () => {
      render(<NodePalette />);

      expect(screen.getByText('Node Palette')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    it('should render sample nodes from each category', () => {
      render(<NodePalette />);

      // Check for nodes in different categories
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      expect(screen.getByText('AGI Calculator')).toBeInTheDocument();
      expect(screen.getByText('Form 1040 Generator')).toBeInTheDocument();
      expect(screen.getByText('IRS Validator')).toBeInTheDocument();
      expect(screen.getByText('PDF Package Generator')).toBeInTheDocument();
    });

    it('should show all categories expanded by default', () => {
      render(<NodePalette />);

      // All category buttons should have aria-expanded="true"
      const inputCategory = screen.getByLabelText(/Toggle Input category/i);
      const calculationCategory = screen.getByLabelText(/Toggle Calculation category/i);

      expect(inputCategory).toHaveAttribute('aria-expanded', 'true');
      expect(calculationCategory).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Category expansion/collapse', () => {
    it('should collapse category when header is clicked', () => {
      render(<NodePalette />);

      const inputCategory = screen.getByLabelText(/Toggle Input category/i);

      // Initially expanded, nodes should be visible
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(inputCategory);

      // Should be collapsed
      expect(inputCategory).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument();
    });

    it('should expand collapsed category when header is clicked', () => {
      render(<NodePalette />);

      const inputCategory = screen.getByLabelText(/Toggle Input category/i);

      // Collapse first
      fireEvent.click(inputCategory);
      expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument();

      // Expand again
      fireEvent.click(inputCategory);
      expect(inputCategory).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter nodes based on search query', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      // Search for "AGI"
      await user.type(searchInput, 'AGI');

      // Should show AGI Calculator
      expect(screen.getByText('AGI Calculator')).toBeInTheDocument();

      // Should not show unrelated nodes
      expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument();
      expect(screen.queryByText('Form 1040 Generator')).not.toBeInTheDocument();
    });

    it('should filter by node description', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      // Search for "IRS" (in description of IRS Validator)
      await user.type(searchInput, 'validate');

      // Should show validators
      expect(screen.getByText('IRS Validator')).toBeInTheDocument();
      expect(screen.getByText('Math Check Validator')).toBeInTheDocument();
    });

    it('should show empty state when no results found', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      // Search for something that doesn't exist
      await user.type(searchInput, 'nonexistent node xyz');

      expect(screen.getByText('No nodes found')).toBeInTheDocument();
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      // Search with lowercase
      await user.type(searchInput, 'manual entry');

      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    });
  });

  describe('Drag and drop functionality', () => {
    it('should have draggable nodes', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);

      // Node should be draggable
      expect(manualEntryNode).toHaveAttribute('draggable');
    });

    it('should set correct data on drag start', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);

      // Create a mock dataTransfer object
      const setDataMock = vi.fn();
      const dataTransfer = {
        setData: setDataMock,
        effectAllowed: '',
      };

      // Use fireEvent.dragStart with mock dataTransfer
      fireEvent.dragStart(manualEntryNode, {
        dataTransfer,
      });

      // Should set the node type and display name
      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'manualEntry');
      expect(setDataMock).toHaveBeenCalledWith('displayName', 'Manual Entry');
    });
  });

  describe('Keyboard navigation', () => {
    it('should support Enter key on node items', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);
      const consoleSpy = vi.spyOn(console, 'log');

      // Press Enter
      fireEvent.keyDown(manualEntryNode, { key: 'Enter', code: 'Enter' });

      // Should log keyboard selection (placeholder for future modal)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual Entry')
      );

      consoleSpy.mockRestore();
    });

    it('should support Space key on node items', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);
      const consoleSpy = vi.spyOn(console, 'log');

      // Press Space
      fireEvent.keyDown(manualEntryNode, { key: ' ', code: 'Space' });

      // Should log keyboard selection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual Entry')
      );

      consoleSpy.mockRestore();
    });

    it('should have proper tabIndex for keyboard users', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);

      // Should be focusable
      expect(manualEntryNode).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on search input', () => {
      render(<NodePalette />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      expect(searchInput).toHaveAttribute('aria-label', 'Search nodes');
    });

    it('should have ARIA labels on category toggle buttons', () => {
      render(<NodePalette />);

      expect(screen.getByLabelText(/Toggle Input category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Toggle Calculation category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Toggle Forms category/i)).toBeInTheDocument();
    });

    it('should have ARIA labels on node items', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node to canvas/i);

      expect(manualEntryNode).toHaveAttribute('role', 'button');
      expect(manualEntryNode).toHaveAttribute('aria-label');
    });

    it('should have proper aria-expanded states', () => {
      render(<NodePalette />);

      const inputCategory = screen.getByLabelText(/Toggle Input category/i);

      // Should indicate expanded state
      expect(inputCategory).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have focus ring styles for keyboard navigation', () => {
      render(<NodePalette />);

      const manualEntryNode = screen.getByLabelText(/Add Manual Entry node/i);

      // Should have focus styles
      expect(manualEntryNode.className).toMatch(/focus:ring/i);
    });
  });
});
