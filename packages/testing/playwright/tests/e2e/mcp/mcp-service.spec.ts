import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E tests for the Internal MCP Service (/mcp-server/http).
 *
 * This tests the built-in MCP server that exposes n8n workflows to external
 * MCP clients (like Claude AI). It provides 3 tools:
 * - search_workflows: Search for workflows available in MCP
 * - get_workflow_details: Get detailed information about a workflow
 * - execute_workflow: Execute a workflow and get results
 *
 * Authentication is via Bearer token (MCP API key).
 *
 * NOTE: Tests run serially because n8n only supports ONE MCP API key at a time.
 * Each test uses rotateMcpApiKey() to get a usable key (since getMcpApiKey()
 * returns REDACTED after the first call), and rotation invalidates the previous
 * key. Running in parallel would cause race conditions where tests invalidate
 * each other's keys.
 */

test.describe('MCP Service', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	// Run tests serially - n8n only supports one MCP API key at a time,
	// and rotation invalidates the previous key
	test.describe.configure({ mode: 'serial' });

	// Enable MCP access before each test
	test.beforeEach(async ({ api }) => {
		await api.setMcpAccess(true);
	});

	test.describe('Authentication', () => {
		test('should reject requests without bearer token', async ({ api }) => {
			const message = api.mcp.createMessage('tools/list');
			const response = await api.mcp.internalMcpSendMessageNoAuth(message);

			expect(response.status()).toBe(401);
		});

		test('should reject requests with invalid bearer token', async ({ api }) => {
			const message = api.mcp.createMessage('tools/list');
			const response = await api.mcp.internalMcpSendMessageNoAuth(message, {
				Authorization: 'Bearer invalid-token-12345',
			});

			expect(response.status()).toBe(401);
		});

		test('should accept valid API key', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			const message = api.mcp.createMessage('tools/list');
			const response = await api.mcp.internalMcpSendMessage(apiKey, message);

			expect(response.status()).toBeLessThan(300);
		});

		test('should reject requests after key rotation with old key', async ({ api }) => {
			const { apiKey: oldKey } = await api.rotateMcpApiKey();
			const { apiKey: newKey } = await api.rotateMcpApiKey();

			const message = api.mcp.createMessage('tools/list');
			const responseWithOldKey = await api.mcp.internalMcpSendMessageNoAuth(message, {
				Authorization: `Bearer ${oldKey}`,
			});
			expect(responseWithOldKey.status()).toBe(401);

			const responseWithNewKey = await api.mcp.internalMcpSendMessage(newKey, message);
			expect(responseWithNewKey.status()).toBeLessThan(300);
		});
	});

	test.describe('MCP Settings', () => {
		test('should reject when MCP access is disabled', async ({ api }) => {
			await api.setMcpAccess(false);

			try {
				const { apiKey } = await api.rotateMcpApiKey();
				const message = api.mcp.createMessage('tools/list');
				const response = await api.mcp.internalMcpSendMessage(apiKey, message);

				expect(response.status()).toBe(403);
				const body = await response.json();
				expect(body.message).toContain('MCP access is disabled');
			} finally {
				await api.setMcpAccess(true);
			}
		});
	});

	test.describe('tools/list', () => {
		test('should return all 3 built-in tools', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();
			const tools = await api.mcp.internalMcpListTools(apiKey);

			expect(tools).toHaveLength(3);

			const toolNames = tools.map((t) => t.name).sort();
			expect(toolNames).toEqual(['execute_workflow', 'get_workflow_details', 'search_workflows']);
		});

		test('should include proper tool descriptions and schemas', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();
			const tools = await api.mcp.internalMcpListTools(apiKey);

			const searchTool = tools.find((t) => t.name === 'search_workflows');
			expect(searchTool).toBeDefined();
			expect(searchTool!.description).toContain('Search');
			expect(searchTool!.inputSchema).toBeDefined();

			const detailsTool = tools.find((t) => t.name === 'get_workflow_details');
			expect(detailsTool).toBeDefined();
			expect(detailsTool!.description).toContain('workflow');
			expect(detailsTool!.inputSchema).toBeDefined();

			const executeTool = tools.find((t) => t.name === 'execute_workflow');
			expect(executeTool).toBeDefined();
			expect(executeTool!.description).toContain('Execute');
			expect(executeTool!.inputSchema).toBeDefined();
		});
	});

	test.describe('search_workflows', () => {
		test('should return workflows marked as available in MCP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpSearchWorkflows(apiKey);

			expect(result.count).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeGreaterThanOrEqual(1);

			const foundWorkflow = result.data.find((w) => w.id === workflowId);
			expect(foundWorkflow).toBeDefined();
			expect(foundWorkflow!.active).toBe(true);
			expect(foundWorkflow!.nodes).toBeDefined();
			expect(foundWorkflow!.scopes).toBeDefined();
		});

		test('should NOT return workflows not marked as available in MCP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-unavailable.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpSearchWorkflows(apiKey);

			const foundWorkflow = result.data.find((w) => w.id === workflowId);
			expect(foundWorkflow).toBeUndefined();
		});

		test('should support limit parameter', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			const result = await api.mcp.internalMcpSearchWorkflows(apiKey, { limit: 1 });

			expect(result.data.length).toBeLessThanOrEqual(1);
		});

		test('should support query filter for name search', async ({ api }) => {
			const uniqueName = `Searchable-${nanoid(8)}`;
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-basic.json',
				{
					transform: (wf) => {
						wf.name = uniqueName;
						return wf;
					},
				},
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();

			const result = await api.mcp.internalMcpSearchWorkflows(apiKey, { query: uniqueName });

			expect(result.data.length).toBe(1);
			expect(result.data[0].id).toBe(workflowId);
		});

		test('should return workflow metadata (id, name, nodes, scopes)', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpSearchWorkflows(apiKey);

			const foundWorkflow = result.data.find((w) => w.id === workflowId);
			expect(foundWorkflow).toBeDefined();

			expect(foundWorkflow!.id).toBe(workflowId);
			expect(foundWorkflow!.name).toBeTruthy();
			expect(foundWorkflow!.nodes).toBeInstanceOf(Array);
			expect(foundWorkflow!.scopes).toBeInstanceOf(Array);
			expect(typeof foundWorkflow!.canExecute).toBe('boolean');
		});
	});

	test.describe('get_workflow_details', () => {
		test('should return detailed info for accessible workflow', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpGetWorkflowDetails(apiKey, workflowId);

			expect(result.workflow).toBeDefined();
			expect(result.workflow.id).toBe(workflowId);
			expect(result.workflow.nodes).toBeDefined();
			expect(result.workflow.connections).toBeDefined();
			expect(result.workflow.settings).toBeDefined();
			expect(result.workflow.scopes).toBeDefined();
			expect(typeof result.workflow.canExecute).toBe('boolean');
		});

		test('should return error for non-existent workflow', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			const fakeWorkflowId = 'nonexistent-workflow-id-12345';

			await expect(api.mcp.internalMcpGetWorkflowDetails(apiKey, fakeWorkflowId)).rejects.toThrow();
		});

		test('should return error for workflow not available in MCP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-unavailable.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();

			await expect(api.mcp.internalMcpGetWorkflowDetails(apiKey, workflowId)).rejects.toThrow();
		});

		test('should include trigger info in response', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-webhook.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpGetWorkflowDetails(apiKey, workflowId);

			expect(result.triggerInfo).toBeDefined();
		});
	});

	test.describe('execute_workflow', () => {
		test('should execute workflow successfully', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpExecuteWorkflow(apiKey, workflowId);

			expect(result.success).toBe(true);
			expect(result.executionId).toBeTruthy();
			expect(result.result).toBeDefined();
		});

		test('should return error for non-existent workflow', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();
			const fakeWorkflowId = 'nonexistent-workflow-id-12345';

			const result = await api.mcp.internalMcpExecuteWorkflow(apiKey, fakeWorkflowId);

			expect(result.success).toBe(false);
			expect(result.error).toBeTruthy();
		});

		test('should return error for workflow not available in MCP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-unavailable.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpExecuteWorkflow(apiKey, workflowId);

			expect(result.success).toBe(false);
			expect(result.error).toBeTruthy();
		});

		test('should execute webhook workflow with inputs', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-service/mcp-available-webhook.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { apiKey } = await api.rotateMcpApiKey();
			const result = await api.mcp.internalMcpExecuteWorkflow(apiKey, workflowId, {
				type: 'webhook',
				webhookData: {
					method: 'POST',
					body: { message: 'Hello from MCP test' },
				},
			});

			expect(result.success).toBe(true);
			expect(result.executionId).toBeTruthy();
		});
	});

	test.describe('Error Handling', () => {
		test('should handle malformed JSON-RPC messages', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			// Missing required 'jsonrpc: "2.0"' field
			const malformedMessage = {
				id: nanoid(),
				method: 'tools/list',
			};

			const response = await api.mcp.internalMcpSendMessage(apiKey, malformedMessage);

			// Server returns 400 Bad Request for malformed JSON-RPC
			expect(response.status()).toBe(400);

			const body = await response.json();
			expect(body.error).toBeDefined();
			expect(body.error.code).toBe(-32700); // Parse error
			expect(body.error.message).toBeTruthy();
		});

		test('should handle unknown methods', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			const message = api.mcp.createMessage('unknown/method');
			const response = await api.mcp.internalMcpSendMessage(apiKey, message);

			// Server returns 200 OK with SSE response containing error
			expect(response.status()).toBe(200);
			expect(response.headers()['content-type']).toContain('text/event-stream');

			// Parse SSE format: extract JSON from "data: {...}" line
			const text = await response.text();
			const dataLine = text.split('\n').find((line) => line.startsWith('data:'))!;
			const body = JSON.parse(dataLine.slice(5).trim()) as {
				error: { code: number; message: string };
			};

			expect(body.error).toBeDefined();
			expect(body.error.code).toBe(-32601); // Method not found
			expect(body.error.message).toBeTruthy();
		});

		test('should handle invalid tool parameters', async ({ api }) => {
			const { apiKey } = await api.rotateMcpApiKey();

			const message = api.mcp.createMessage('tools/call', {
				name: 'search_workflows',
				arguments: {
					limit: 'not-a-number',
				},
			});

			const response = await api.mcp.internalMcpSendMessage(apiKey, message);

			// Server returns 200 OK with SSE response
			expect(response.ok()).toBe(true);
			expect(response.headers()['content-type']).toContain('text/event-stream');

			// Parse SSE format: extract JSON from "data: {...}" line
			const text = await response.text();
			const dataLine = text.split('\n').find((line) => line.startsWith('data:'))!;
			const body = JSON.parse(dataLine.slice(5).trim()) as {
				error?: unknown;
				result?: unknown;
				jsonrpc: string;
			};

			expect(body.jsonrpc).toBe('2.0');
			// Should return either a JSON-RPC error or a successful result
			expect(body.error !== undefined || body.result !== undefined).toBe(true);
		});
	});
});
