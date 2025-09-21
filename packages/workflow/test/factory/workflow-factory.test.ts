import { WorkflowFactory } from '../../src/workflow-factory';

const newNodeIdGenerator = () => {
	let id = 1;
	return () => `n-${id++}`;
};

describe('WorkflowFactory', () => {
	describe('integration tests', () => {
		it('should build a complete webhook-to-response workflow', () => {
			const workflow = WorkflowFactory.create(
				{
					name: 'API Endpoint',
					active: true,
				},
				newNodeIdGenerator(),
			)
				.add('n8n-nodes-base.webhook', {
					name: 'trigger',
					httpMethod: 'POST',
					path: 'api/data',
				})
				.add('n8n-nodes-base.set', {
					name: 'process',
					assignments: {
						assignments: [
							{
								id: 'processed',
								name: 'processed_at',
								value: '={{ new Date().toISOString() }}',
								type: 'string',
							},
						],
					},
				})
				.add('n8n-nodes-base.respondToWebhook', {
					name: 'respond',
					respondWith: 'firstIncomingItem',
				})
				.connect('trigger', 'process')
				.connect('process', 'respond')
				.build();

			expect(workflow).toMatchInlineSnapshot(`
				{
				  "active": true,
				  "connections": {
				    "process": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "respond",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				    "trigger": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "process",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				  },
				  "isArchived": false,
				  "name": "API Endpoint",
				  "nodes": [
				    {
				      "id": "n-1",
				      "name": "trigger",
				      "parameters": {
				        "httpMethod": "POST",
				        "path": "api/data",
				      },
				      "position": [
				        0,
				        0,
				      ],
				      "type": "n8n-nodes-base.webhook",
				      "typeVersion": 2,
				    },
				    {
				      "id": "n-2",
				      "name": "process",
				      "parameters": {
				        "assignments": {
				          "assignments": [
				            {
				              "id": "processed",
				              "name": "processed_at",
				              "type": "string",
				              "value": "={{ new Date().toISOString() }}",
				            },
				          ],
				        },
				      },
				      "position": [
				        200,
				        0,
				      ],
				      "type": "n8n-nodes-base.set",
				      "typeVersion": 3,
				    },
				    {
				      "id": "n-3",
				      "name": "respond",
				      "parameters": {
				        "respondWith": "firstIncomingItem",
				      },
				      "position": [
				        400,
				        0,
				      ],
				      "type": "n8n-nodes-base.respondToWebhook",
				      "typeVersion": 1,
				    },
				  ],
				  "settings": {
				    "executionOrder": "v1",
				    "saveDataErrorExecution": undefined,
				    "saveDataSuccessExecution": undefined,
				    "saveManualExecutions": undefined,
				    "timezone": undefined,
				  },
				}
			`);
		});

		it('should support complex workflows with multiple branches', () => {
			const workflow = WorkflowFactory.create(undefined, newNodeIdGenerator())
				.add('n8n-nodes-base.webhook', { name: 'trigger' })
				.add('n8n-nodes-base.set', { name: 'transform1' })
				.add('n8n-nodes-base.set', { name: 'transform2' })
				.add('n8n-nodes-base.code', { name: 'merge' })
				.connect('trigger', 'transform1')
				.connect('trigger', 'transform2')
				.connect('transform1', 'merge')
				.connect('transform2', 'merge')
				.build();

			expect(workflow).toMatchInlineSnapshot(`
				{
				  "active": false,
				  "connections": {
				    "transform1": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "merge",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				    "transform2": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "merge",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				    "trigger": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "transform1",
				            "type": "main",
				          },
				          {
				            "index": 0,
				            "node": "transform2",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				  },
				  "isArchived": false,
				  "name": "Untitled Workflow",
				  "nodes": [
				    {
				      "id": "n-1",
				      "name": "trigger",
				      "parameters": {},
				      "position": [
				        0,
				        0,
				      ],
				      "type": "n8n-nodes-base.webhook",
				      "typeVersion": 2,
				    },
				    {
				      "id": "n-2",
				      "name": "transform1",
				      "parameters": {},
				      "position": [
				        200,
				        0,
				      ],
				      "type": "n8n-nodes-base.set",
				      "typeVersion": 3,
				    },
				    {
				      "id": "n-3",
				      "name": "transform2",
				      "parameters": {},
				      "position": [
				        400,
				        0,
				      ],
				      "type": "n8n-nodes-base.set",
				      "typeVersion": 3,
				    },
				    {
				      "id": "n-4",
				      "name": "merge",
				      "parameters": {},
				      "position": [
				        600,
				        0,
				      ],
				      "type": "n8n-nodes-base.code",
				      "typeVersion": 2,
				    },
				  ],
				  "settings": {
				    "executionOrder": "v1",
				    "saveDataErrorExecution": undefined,
				    "saveDataSuccessExecution": undefined,
				    "saveManualExecutions": undefined,
				    "timezone": undefined,
				  },
				}
			`);
		});

		it('should support connect options', () => {
			const workflow = WorkflowFactory.create(undefined, newNodeIdGenerator())
				.add('n8n-nodes-base.webhook', { name: 'trigger' })
				.add('n8n-nodes-base.set', { name: 'transform' })
				.connect({
					source: 'trigger',
					sourceIndex: 0,
					target: 'transform',
					targetIndex: 0,
					type: 'main',
				})
				.build();

			expect(workflow).toMatchInlineSnapshot(`
				{
				  "active": false,
				  "connections": {
				    "trigger": {
				      "main": [
				        [
				          {
				            "index": 0,
				            "node": "transform",
				            "type": "main",
				          },
				        ],
				      ],
				    },
				  },
				  "isArchived": false,
				  "name": "Untitled Workflow",
				  "nodes": [
				    {
				      "id": "n-1",
				      "name": "trigger",
				      "parameters": {},
				      "position": [
				        0,
				        0,
				      ],
				      "type": "n8n-nodes-base.webhook",
				      "typeVersion": 2,
				    },
				    {
				      "id": "n-2",
				      "name": "transform",
				      "parameters": {},
				      "position": [
				        200,
				        0,
				      ],
				      "type": "n8n-nodes-base.set",
				      "typeVersion": 3,
				    },
				  ],
				  "settings": {
				    "executionOrder": "v1",
				    "saveDataErrorExecution": undefined,
				    "saveDataSuccessExecution": undefined,
				    "saveManualExecutions": undefined,
				    "timezone": undefined,
				  },
				}
			`);
		});
	});
});
