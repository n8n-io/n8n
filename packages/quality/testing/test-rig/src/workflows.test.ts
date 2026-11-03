import { chain, nodes, webhookPath } from './workflows';

describe('chain', () => {
	it('connects the nodes in order and lays them out left to right', () => {
		const workflow = chain('demo', [
			nodes.webhook('p'),
			nodes.code('Code', 'return [];'),
			nodes.noOp('End'),
		]);
		expect(workflow.connections).toEqual({
			Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
			Code: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
		});
		expect((workflow.nodes as Array<{ position: number[] }>).map((n) => n.position)).toEqual([
			[0, 0],
			[220, 0],
			[440, 0],
		]);
		expect(workflow.name).toMatch(/^demo \S{6}$/);
		expect(workflow.settings).toEqual({ executionOrder: 'v1' });
	});

	it('gives each webhook path a unique suffix and the webhook node its path as id', () => {
		expect(webhookPath('x')).not.toBe(webhookPath('x'));
		expect(nodes.webhook('p', 'lastNode')).toMatchObject({
			webhookId: 'p',
			parameters: { responseMode: 'lastNode' },
		});
	});
});
