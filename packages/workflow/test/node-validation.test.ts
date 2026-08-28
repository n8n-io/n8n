import type { INode, INodeType, IConnections, INodeTypeDescription } from '../src/interfaces';
import {
	validateNodeCredentials,
	getUnconnectedRequiredInputs,
	isNodeConnected,
	isTriggerLikeNode,
	type NodeCredentialIssue,
	type WorkflowForInputValidation,
} from '../src/node-validation';

describe('node-validation', () => {
	describe('validateNodeCredentials', () => {
		const createNode = (
			credentials?: Record<string, { id: string }>,
			parameters?: Record<string, unknown>,
		): INode => ({
			name: 'Test Node',
			type: 'n8n-nodes-base.test',
			id: 'node-1',
			typeVersion: 1,
			position: [0, 0],
			credentials: credentials as INode['credentials'],
			parameters: (parameters || {}) as INode['parameters'],
		});

		const createNodeType = (credentials?: INodeTypeDescription['credentials']): INodeType => ({
			description: {
				displayName: 'Test Node',
				name: 'test',
				group: ['transform'],
				version: 1,
				description: 'Test node',
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				credentials: credentials || [],
			},
		});

		it('should return no issues when node has all required credentials', () => {
			const node = createNode({ testCredential: { id: 'cred-1' } });
			const nodeType = createNodeType([
				{
					name: 'testCredential',
					displayName: 'Test Credential',
					required: true,
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues).toEqual([]);
		});

		it('should return missing issue when required credential is not set', () => {
			const node = createNode();
			const nodeType = createNodeType([
				{
					name: 'testCredential',
					displayName: 'Test Credential',
					required: true,
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues).toEqual([
				{
					type: 'missing',
					displayName: 'Test Credential',
					credentialName: 'testCredential',
				},
			]);
		});

		it('should return not-configured issue when credential has no ID', () => {
			const node = createNode({ testCredential: { id: '' } });
			const nodeType = createNodeType([
				{
					name: 'testCredential',
					displayName: 'Test Credential',
					required: true,
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues).toEqual([
				{
					type: 'not-configured',
					displayName: 'Test Credential',
					credentialName: 'testCredential',
				},
			]);
		});

		it('should skip optional credentials', () => {
			const node = createNode();
			const nodeType = createNodeType([
				{
					name: 'optionalCredential',
					displayName: 'Optional Credential',
					required: false,
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues).toEqual([]);
		});

		it('should respect displayOptions and skip hidden credentials', () => {
			const node = createNode(undefined, { authentication: 'none' });
			const nodeType = createNodeType([
				{
					name: 'basicAuth',
					displayName: 'Basic Auth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			// Should be empty because basicAuth is hidden when authentication='none'
			expect(issues).toEqual([]);
		});

		it('should validate credentials when displayOptions match', () => {
			const node = createNode(undefined, { authentication: 'basicAuth' });
			const nodeType = createNodeType([
				{
					name: 'basicAuth',
					displayName: 'Basic Auth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			// Should have issue because basicAuth is shown but not set
			expect(issues).toEqual([
				{
					type: 'missing',
					displayName: 'Basic Auth',
					credentialName: 'basicAuth',
				},
			]);
		});

		it('should return multiple issues for multiple missing credentials', () => {
			const node = createNode();
			const nodeType = createNodeType([
				{
					name: 'credential1',
					displayName: 'Credential 1',
					required: true,
				},
				{
					name: 'credential2',
					displayName: 'Credential 2',
					required: true,
				},
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues).toHaveLength(2);
			expect(issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ credentialName: 'credential1' }),
					expect.objectContaining({ credentialName: 'credential2' }),
				]),
			);
		});

		it('should use credential name as displayName fallback', () => {
			const node = createNode();
			const nodeType = createNodeType([
				{
					name: 'testCredential',
					required: true,
					// No displayName provided
				} as any,
			]);

			const issues = validateNodeCredentials(node, nodeType);

			expect(issues[0].displayName).toBe('testCredential');
		});
	});

	describe('isNodeConnected', () => {
		it('should return true when node has outgoing connections', () => {
			const connections: IConnections = {
				'Node A': {
					main: [[{ node: 'Node B', type: 'main', index: 0 }]],
				},
			};
			const connectionsByDestination: IConnections = {};

			const result = isNodeConnected('Node A', connections, connectionsByDestination);

			expect(result).toBe(true);
		});

		it('should return true when node has incoming connections', () => {
			const connections: IConnections = {};
			const connectionsByDestination: IConnections = {
				'Node B': {
					main: [[{ node: 'Node A', type: 'main', index: 0 }]],
				},
			};

			const result = isNodeConnected('Node B', connections, connectionsByDestination);

			expect(result).toBe(true);
		});

		it('should return true when node has both incoming and outgoing connections', () => {
			const connections: IConnections = {
				'Node B': {
					main: [[{ node: 'Node C', type: 'main', index: 0 }]],
				},
			};
			const connectionsByDestination: IConnections = {
				'Node B': {
					main: [[{ node: 'Node A', type: 'main', index: 0 }]],
				},
			};

			const result = isNodeConnected('Node B', connections, connectionsByDestination);

			expect(result).toBe(true);
		});

		it('should return false when node has no connections', () => {
			const connections: IConnections = {
				'Node A': {
					main: [[{ node: 'Node B', type: 'main', index: 0 }]],
				},
			};
			const connectionsByDestination: IConnections = {};

			const result = isNodeConnected('Node C', connections, connectionsByDestination);

			expect(result).toBe(false);
		});

		it('should return false when node exists but has empty connections', () => {
			const connections: IConnections = {
				'Node A': {},
			};
			const connectionsByDestination: IConnections = {
				'Node A': {},
			};

			const result = isNodeConnected('Node A', connections, connectionsByDestination);

			expect(result).toBe(false);
		});
	});

	describe('isTriggerLikeNode', () => {
		it('should return true for node with trigger function', () => {
			const nodeType: INodeType = {
				description: {
					displayName: 'Trigger Node',
					name: 'trigger',
					group: ['trigger'],
					version: 1,
					description: 'Test trigger',
					defaults: { name: 'Trigger' },
					inputs: [],
					outputs: ['main'],
					properties: [],
				},
				trigger: async () => ({
					closeFunction: async () => {},
					manualTriggerFunction: async () => {},
				}),
			};

			expect(isTriggerLikeNode(nodeType)).toBe(true);
		});

		it('should return true for node with webhook function', () => {
			const nodeType: INodeType = {
				description: {
					displayName: 'Webhook Node',
					name: 'webhook',
					group: ['trigger'],
					version: 1,
					description: 'Test webhook',
					defaults: { name: 'Webhook' },
					inputs: [],
					outputs: ['main'],
					properties: [],
				},
				webhook: async () => ({ workflowData: [[]] }),
			};

			expect(isTriggerLikeNode(nodeType)).toBe(true);
		});

		it('should return true for node with poll function', () => {
			const nodeType: INodeType = {
				description: {
					displayName: 'Poll Node',
					name: 'poll',
					group: ['trigger'],
					version: 1,
					description: 'Test poll',
					defaults: { name: 'Poll' },
					inputs: [],
					outputs: ['main'],
					properties: [],
				},
				poll: async () => [[]],
			};

			expect(isTriggerLikeNode(nodeType)).toBe(true);
		});

		it('should return false for regular node', () => {
			const nodeType: INodeType = {
				description: {
					displayName: 'Regular Node',
					name: 'regular',
					group: ['transform'],
					version: 1,
					description: 'Test regular node',
					defaults: { name: 'Regular' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				},
				execute: async () => [[]],
			};

			expect(isTriggerLikeNode(nodeType)).toBe(false);
		});

		it('should return false for node with only execute function', () => {
			const nodeType: INodeType = {
				description: {
					displayName: 'Execute Node',
					name: 'execute',
					group: ['transform'],
					version: 1,
					description: 'Test execute node',
					defaults: { name: 'Execute' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				},
				execute: async () => [[]],
			};

			expect(isTriggerLikeNode(nodeType)).toBe(false);
		});
	});
	describe('getUnconnectedRequiredInputs', () => {
		const parser: INode = {
			name: 'Parser',
			type: 'parser',
			id: 'parser-1',
			typeVersion: 1,
			position: [0, 0],
			parameters: { autoFix: true },
		};

		const model: INode = {
			name: 'Model',
			type: 'model',
			id: 'model-1',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		/** An expression, so inputs depend on the node's parameters. */
		const description = {
			inputs:
				'={{ $parameter.autoFix ? [{ displayName: "Model", type: "ai_languageModel", required: true }] : [] }}',
		} as unknown as INodeTypeDescription;

		const makeWorkflow = (
			parents: string[],
			nodes: Record<string, INode>,
		): WorkflowForInputValidation =>
			({
				expression: {
					getSimpleParameterValue: (node: INode) =>
						(node.parameters as { autoFix?: boolean }).autoFix
							? [{ displayName: 'Model', type: 'ai_languageModel', required: true }]
							: [],
				},
				getNode: (name: string) => nodes[name] ?? null,
				getParentNodes: () => parents,
			}) as unknown as WorkflowForInputValidation;

		it('reports a required input with nothing connected', () => {
			const result = getUnconnectedRequiredInputs(
				makeWorkflow([], { Parser: parser }),
				parser,
				description,
			);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('ai_languageModel');
		});

		it('reports nothing once an enabled node is connected', () => {
			const result = getUnconnectedRequiredInputs(
				makeWorkflow(['Model'], { Parser: parser, Model: model }),
				parser,
				description,
			);

			expect(result).toEqual([]);
		});

		it('treats a disabled source as not connected', () => {
			const result = getUnconnectedRequiredInputs(
				makeWorkflow(['Model'], { Parser: parser, Model: { ...model, disabled: true } }),
				parser,
				description,
			);

			expect(result).toHaveLength(1);
		});

		it('reports nothing when a failed inputs expression is treated as empty', () => {
			const throwing = {
				expression: {
					getSimpleParameterValue: () => {
						throw new Error('boom');
					},
				},
				getNode: () => parser,
				getParentNodes: () => [],
			} as unknown as WorkflowForInputValidation;

			expect(getUnconnectedRequiredInputs(throwing, parser, description)).toEqual([]);
		});

		it('surfaces a failed inputs expression when asked to', () => {
			const throwing = {
				expression: {
					getSimpleParameterValue: () => {
						throw new Error('boom');
					},
				},
				getNode: () => parser,
				getParentNodes: () => [],
			} as unknown as WorkflowForInputValidation;

			expect(() =>
				getUnconnectedRequiredInputs(throwing, parser, description, {
					throwOnExpressionError: true,
				}),
			).toThrow('boom');
		});

		it('reports nothing when the parameters do not make the input required', () => {
			const off = { ...parser, parameters: { autoFix: false } };
			const result = getUnconnectedRequiredInputs(
				makeWorkflow([], { Parser: off }),
				off,
				description,
			);

			expect(result).toEqual([]);
		});
	});
});
