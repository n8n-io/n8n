import { Workflow } from '@/Workflow';
import type { INode } from '@/index';
import * as Helpers from './Helpers';

const webhookNode: INode = {
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	id: '111f1db0-e7be-44c5-9ce9-3e35362490f0',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
	webhookId: 'de0f8dcb-7b64-4f22-b66d-d8f74d6aefb7',
};

const secondWebhookNode = {
	...webhookNode,
	name: 'Webhook 2',
	id: '222f1db0-e7be-44c5-9ce9-3e35362490f1',
};

const executeWorkflowTriggerNode: INode = {
	name: 'Execute Workflow Trigger',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	id: '78d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const respondToWebhookNode: INode = {
	name: 'Respond to Webhook',
	type: 'n8n-nodes-base.respondToWebhook',
	id: '66d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const args: ConstructorParameters<typeof Workflow>[number] = {
	nodes: [],
	connections: {},
	active: false,
	nodeTypes: Helpers.NodeTypes(),
	pinData: {
		[webhookNode.name]: [{ json: { key: 'value' } }],
		[executeWorkflowTriggerNode.name]: [{ json: { key: 'value' } }],
	},
};

describe('Workflow.selectPinnedActivatorStarter()', () => {
	afterEach(() => {
		args.nodes = [];
	});

	it('should return `null` if no pinned activators', () => {
		const workflow = new Workflow(args);
		jest.spyOn(workflow, 'findAllPinnedActivators').mockReturnValueOnce([]);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toBeNull();
	});

	it('should select webhook node if only choice', () => {
		args.nodes.push(webhookNode);
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toEqual(webhookNode);
	});

	it('should return `null` if no choice', () => {
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toBeNull();
	});

	it('should return `null` if Respond to Webhook is only choice', () => {
		args.nodes.push(respondToWebhookNode);
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toBeNull();
	});

	it('should select execute workflow trigger if only choice', () => {
		args.nodes.push(executeWorkflowTriggerNode);
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toEqual(executeWorkflowTriggerNode);
	});

	it('should favor webhook node over execute workflow trigger', () => {
		args.nodes.push(webhookNode, executeWorkflowTriggerNode);
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toEqual(webhookNode);
	});

	it('should favor first webhook node over second webhook node', () => {
		args.nodes.push(webhookNode, secondWebhookNode);
		const workflow = new Workflow(args);

		const node = workflow.selectPinnedActivatorStarter([]);

		expect(node).toEqual(webhookNode);
	});
});
