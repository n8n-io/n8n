import type { INode, INodeTypeDescription } from '../src/interfaces';
import { resolveNodeWebhook } from '../src/node-helpers';

describe('resolveNodeWebhook', () => {
	const makeNode = (webhookId?: string): Pick<INode, 'webhookId'> => ({ webhookId });

	const withWebhooks: Pick<INodeTypeDescription, 'webhooks'> = {
		webhooks: [{ httpMethod: 'GET', path: '', name: 'default', isFullPath: false }],
	};

	const withoutWebhooks: Pick<INodeTypeDescription, 'webhooks'> = {
		webhooks: undefined,
	};

	test('assigns webhookId when webhooks is non-empty and node has no webhookId', () => {
		const node = makeNode();

		resolveNodeWebhook(node, withWebhooks);

		expect(node.webhookId).toBeDefined();
		expect(typeof node.webhookId).toBe('string');
	});

	test('does not assign webhookId when webhooks is undefined', () => {
		const node = makeNode();

		resolveNodeWebhook(node, withoutWebhooks);

		expect(node.webhookId).toBeUndefined();
	});

	test('does not assign webhookId when webhooks is empty', () => {
		const node = makeNode();

		resolveNodeWebhook(node, { webhooks: [] });

		expect(node.webhookId).toBeUndefined();
	});

	test('preserves existing webhookId', () => {
		const node = makeNode('existing-id');

		resolveNodeWebhook(node, withWebhooks);

		expect(node.webhookId).toBe('existing-id');
	});
});
