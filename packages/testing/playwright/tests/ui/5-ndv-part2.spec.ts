import { test, expect } from '../../fixtures/base';

test.describe('NDV - Part 2 (Advanced Features)', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	// TODO: Migrate remaining tests from cypress/e2e/5-ndv.cy.ts
	// This file contains the more complex tests that require additional page object methods

	test.describe('Run Data & Selectors - Advanced', () => {
		test('can link and unlink run selectors between input and output', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_5.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('Set3');

			await n8n.ndv.switchInputMode('Table');
			await n8n.ndv.switchOutputMode('Table');

			// Ensure we start from linked state
			await n8n.ndv.ensureOutputRunLinking(true);
			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip

			// Verify initial selectors are synced at "2 of 2 (6 items)"
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

			// Change output selector and verify input follows (linked behavior)
			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)');
			await expect(n8n.ndv.getInputTbodyCell(0, 0)).toHaveText('1111');
			await expect(n8n.ndv.getOutputTbodyCell(0, 0)).toHaveText('1111');

			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip

			// Change input selector and verify output follows (linked behavior)
			await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

			// Unlink via output and test independent behavior
			await n8n.ndv.toggleOutputRunLinking();
			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip
			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)'); // Should remain unchanged

			// Link again and verify sync
			await n8n.ndv.toggleOutputRunLinking();
			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)'); // Should sync

			// Unlink via input and test independent behavior
			await n8n.ndv.toggleInputRunLinking();
			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip
			await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('1 of 2 (6 items)'); // Should remain unchanged

			// Link again and verify sync
			await n8n.ndv.toggleInputRunLinking();
			await n8n.ndv.getInputTbodyCell(0, 0).click(); // remove tooltip
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)'); // Should sync
		});
	});

	test.describe('Remote Options & Network', () => {
		test.skip('should not retrieve remote options when a parameter value changes', async ({
			n8n,
		}) => {
			// TODO: Implement network interception for remote options
			// NEEDS: network interception setup
			// Original Cypress test at Line 464
		});

		test.skip('Should show a notice when remote options cannot be fetched because of missing credentials', async ({
			n8n,
		}) => {
			// TODO: Implement network interception + credential handling
			// NEEDS: network interception + credential methods
			// Original Cypress test at Line 791
		});

		test.skip('Should show error state when remote options cannot be fetched', async ({ n8n }) => {
			// TODO: Implement network interception + error state handling
			// NEEDS: network interception + error state methods
			// Original Cypress test at Line 808
		});
	});

	test.describe('Floating Nodes Navigation', () => {
		test.skip('should traverse floating nodes with mouse', async ({ n8n }) => {
			// TODO: Implement floating node mouse navigation
			// NEEDS: floating node methods + complex workflow interactions
			// Original Cypress test at Line 484
		});

		test.skip('should traverse floating nodes with keyboard', async ({ n8n }) => {
			// TODO: Implement floating node keyboard navigation
			// NEEDS: keyboard navigation + floating node methods
			// Original Cypress test at Line 532
		});

		test.skip('should connect floating sub-nodes', async ({ n8n }) => {
			// TODO: Implement floating node connection functionality
			// NEEDS: node creator integration + floating node methods
			// Original Cypress test at Line 580
		});

		test.skip('should have the floating nodes in correct order', async ({ n8n }) => {
			// TODO: Implement floating node ordering validation
			// NEEDS: floating node selectors + ordering methods
			// Original Cypress test at Line 628
		});
	});

	test.describe('Parameter Management - Advanced', () => {
		test.skip('Should clear mismatched collection parameters', async ({ n8n }) => {
			// TODO: Implement parameter collection clearing
			// NEEDS: changeNodeOperation(), parameter collection methods
			// Original Cypress test at Line 753
		});

		test.skip('Should keep RLC values after operation change', async ({ n8n }) => {
			// TODO: Implement RLC value persistence testing
			// NEEDS: setRLCValue(), resourceLocatorInput() methods
			// Original Cypress test at Line 765
		});

		test.skip('Should not clear resource/operation after credential change', async ({ n8n }) => {
			// TODO: Implement credential change testing
			// NEEDS: credential management methods
			// Original Cypress test at Line 776
		});
	});

	test.describe('Node Creator Integration', () => {
		test.skip('Should open appropriate node creator after clicking on connection hint link', async ({
			n8n,
		}) => {
			// TODO: Implement node creator integration
			// NEEDS: connection hint links + node creator methods
			// Original Cypress test at Line 831
		});
	});

	test.describe('Expression Editor Features', () => {
		test.skip('should allow selecting item for expressions', async ({ n8n }) => {
			// TODO: Implement expression item selection
			// NEEDS: expression editor item selection methods
			// Original Cypress test at Line 855
		});
	});

	test.describe('Schema & Data Views', () => {
		test.skip('should show data from the correct output in schema view', async ({ n8n }) => {
			// TODO: Implement schema view output validation
			// NEEDS: schema view output methods
			// Original Cypress test at Line 882
		});
	});

	test.describe('Search Functionality - Advanced', () => {
		test.skip('should not show items count when searching in schema view', async ({ n8n }) => {
			// TODO: Implement schema search functionality
			// NEEDS: schema search methods
			// Original Cypress test at Line 928
		});

		test.skip('should show additional tooltip when searching in schema view if no matches', async ({
			n8n,
		}) => {
			// TODO: Implement search tooltip functionality
			// NEEDS: search tooltip methods
			// Original Cypress test at Line 939
		});
	});

	test.describe('Complex Edge Cases', () => {
		test.skip('ADO-2931 - should handle multiple branches of the same input with the first branch empty correctly', async ({
			n8n,
		}) => {
			// TODO: Implement complex branching edge case
			// NEEDS: advanced workflow setup + branch handling
			// Original Cypress test at Line 953
		});
	});

	test.describe('Execution Indicators - Multi-Node', () => {
		test.skip('should properly show node execution indicator for multiple nodes', async ({
			n8n,
		}) => {
			// TODO: Implement multi-node execution indicators
			// NEEDS: execution indicator methods + complex node setup
			// Original Cypress test at Line 738
		});
	});
});
