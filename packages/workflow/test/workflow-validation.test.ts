import { vi } from 'vitest';

import type { INode, INodes, INodeType, INodeTypeDescription } from '../src/interfaces';
import type { INodeTypesGetter } from '../src/workflow-validation';
import { validateWorkflowHasTriggerLikeNode } from '../src/workflow-validation';

describe('validateWorkflowHasTriggerLikeNode', () => {
	const disabledNode = { type: 'triggerNode', disabled: true } as INode;
	const unknownNode = { type: 'unknownNode' } as INode;
	const noTriggersNode = { type: 'noTriggersNode' } as INode;
	const pollNode = { type: 'pollNode' } as INode;
	const triggerNode = { type: 'triggerNode' } as INode;
	const webhookNode = { type: 'webhookNode' } as INode;

	const nodeTypes: INodeTypesGetter = {
		getByNameAndVersion: vi.fn(),
	};

	beforeEach(() => {
		vi.mocked(nodeTypes.getByNameAndVersion).mockImplementation((type): INodeType | undefined => {
			if (type === 'unknownNode') return undefined;

			const nodeType: Partial<INodeType> = {
				poll: undefined,
				trigger: undefined,
				webhook: undefined,
				description: {} as INodeTypeDescription,
			};

			if (type === 'pollNode') nodeType.poll = vi.fn();
			if (type === 'triggerNode') nodeType.trigger = vi.fn();
			if (type === 'webhookNode') nodeType.webhook = vi.fn();

			return nodeType as INodeType;
		});
	});

	test.each([
		['should skip disabled nodes', { disabledNode }, [], false],
		['should skip nodes marked as ignored', { triggerNode }, ['triggerNode'], false],
		['should skip unknown nodes', { unknownNode }, [], false],
		['should skip nodes with no trigger method', { noTriggersNode }, [], false],
		['should activate if poll method exists', { pollNode }, [], true],
		['should activate if trigger method exists', { triggerNode }, [], true],
		['should activate if webhook method exists', { webhookNode }, [], true],
		[
			'should ignore multiple node types',
			{ triggerNode, webhookNode, pollNode },
			['triggerNode', 'webhookNode', 'pollNode'],
			false,
		],
	])('%s', (_, nodes: INodes, ignoredNodes: string[], expectedValid: boolean) => {
		const result = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes, ignoredNodes);

		expect(result.isValid).toBe(expectedValid);
		if (!expectedValid) {
			expect(result.error).toBeDefined();
			expect(result.error).toContain('no trigger node');
		}
	});

	test('should return error message when no trigger nodes found', () => {
		const nodes: INodes = { noTriggersNode };
		const result = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes);

		expect(result.isValid).toBe(false);
		expect(result.error).toBe(
			'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
		);
	});
});
