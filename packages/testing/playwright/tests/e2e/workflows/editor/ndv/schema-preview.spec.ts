import { test, expect } from '../../../../../fixtures/base';

test.describe('Schema Preview', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
	test('should show schema preview for regular nodes but not triggers', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		await n8n.canvas.addNode('Gmail', { trigger: 'On message received' });
		await n8n.ndv.close();

		await n8n.canvas.addNode('Edit Fields (Set)');
		await n8n.ndv.inputPanel.get().getByText('No input data').waitFor();
		await n8n.ndv.close();

		await n8n.canvas.addNode('Hacker News', { action: 'Get an article' });
		await n8n.ndv.close();

		await n8n.canvas.addNode('Edit Fields (Set)');
		await expect(n8n.ndv.inputPanel.getSchemaItem('author')).toBeVisible();
	});
});
