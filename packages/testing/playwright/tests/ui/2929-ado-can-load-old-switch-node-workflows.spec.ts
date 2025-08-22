import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const requirements: TestRequirements = {
	entry: {
		type: 'imported-workflow',
		workflow: 'Switch_node_with_null_connection.json',
	},
};

test.describe('ADO-2929 can load Switch nodes', () => {
	test('can load workflows with Switch nodes with null at connection index @auth:owner', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(requirements);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await n8n.canvas.deleteNodeByName('Switch');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});
});
