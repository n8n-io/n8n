import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { McpSession } from '../../../services/mcp-api-helper';

/**
 * E2E tests for the MCP Server Trigger node.
 *
 * Tests cover:
 * - SSE and Streamable HTTP transports
 * - Authentication (none, bearer, header)
 * - Tool listing and execution
 * - Session management
 * - Error handling
 */

test.describe('MCP Trigger Node', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	test.describe('Streamable HTTP Transport', () => {
		test('should initialize session and return mcp-session-id', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Get the MCP path from the workflow
			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);

			expect(session.sessionId).toBeTruthy();
			expect(session.transport).toBe('streamableHttp');
		});

		test('should list tools via Streamable HTTP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);
			const tools = await api.mcp.listTools(session, mcpPath);

			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('echo');
			expect(tools[0].description).toContain('Echoes');
		});

		test('should call tool via Streamable HTTP', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);
			const result = await api.mcp.callTool(session, mcpPath, 'echo', {
				message: 'Hello from E2E test!',
			});

			expect(result.content).toBeDefined();
			expect(result.content.length).toBeGreaterThan(0);
			expect(result.content[0].text).toContain('Hello from E2E test!');
		});

		test('should close session via DELETE', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);
			const deleteResponse = await api.mcp.streamableHttpDelete(session, mcpPath);

			// DELETE should return success (200 or 202)
			expect(deleteResponse.status()).toBeLessThan(300);
		});
	});

	test.describe('SSE Transport', () => {
		test('should establish SSE connection and return session', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.sseSetup(mcpPath);

			try {
				expect(session.sessionId).toBeTruthy();
				expect(session.transport).toBe('sse');
				expect(session.postUrl).toBeTruthy();
			} finally {
				api.mcp.sseClose(session);
			}
		});

		test('should list connected tools via SSE', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.sseSetup(mcpPath);

			try {
				const tools = await api.mcp.listTools(session, mcpPath);

				expect(tools).toHaveLength(1);
				expect(tools[0].name).toBe('echo');
			} finally {
				api.mcp.sseClose(session);
			}
		});

		test('should call tool and receive response via SSE', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.sseSetup(mcpPath);

			try {
				const result = await api.mcp.callTool(session, mcpPath, 'echo', {
					message: 'SSE test message',
				});

				expect(result.content).toBeDefined();
				expect(result.content[0].text).toContain('SSE test message');
			} finally {
				api.mcp.sseClose(session);
			}
		});
	});

	test.describe('Authentication', () => {
		test('should reject unauthenticated request with bearerAuth', async ({ api }) => {
			const token = `secret-token-${nanoid()}`;
			const credential = await api.credentials.createCredential({
				type: 'httpBearerAuth',
				name: `mcp-bearer-${nanoid()}`,
				data: { token },
			});

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-bearer-auth.json',
				{
					transform: (wf) => {
						const mcpNode = wf.nodes?.find((n) => n.type.includes('mcpTrigger'));
						if (mcpNode) {
							mcpNode.credentials = {
								httpBearerAuth: { id: credential.id, name: credential.name },
							};
						}
						return wf;
					},
				},
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Try without auth - should fail
			const noAuthResponse = await api.webhooks.trigger(mcpPath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: api.mcp.createMessage('initialize', {
					protocolVersion: '2024-11-05',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				}),
			});

			expect(noAuthResponse.status()).toBe(403);
		});

		test('should accept valid bearer token', async ({ api }) => {
			const token = `secret-token-${nanoid()}`;
			const credential = await api.credentials.createCredential({
				type: 'httpBearerAuth',
				name: `mcp-bearer-${nanoid()}`,
				data: { token },
			});

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-bearer-auth.json',
				{
					transform: (wf) => {
						const mcpNode = wf.nodes?.find((n) => n.type.includes('mcpTrigger'));
						if (mcpNode) {
							mcpNode.credentials = {
								httpBearerAuth: { id: credential.id, name: credential.name },
							};
						}
						return wf;
					},
				},
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Try with valid auth - should succeed
			const session = await api.mcp.streamableHttpInitialize(mcpPath, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(session.sessionId).toBeTruthy();
		});

		test('should accept valid header auth', async ({ api }) => {
			const headerName = `X-Auth-${nanoid(8)}`;
			const headerValue = `secret-value-${nanoid()}`;
			const credential = await api.credentials.createCredential({
				type: 'httpHeaderAuth',
				name: `mcp-header-${nanoid()}`,
				data: { name: headerName, value: headerValue },
			});

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-header-auth.json',
				{
					transform: (wf) => {
						const mcpNode = wf.nodes?.find((n) => n.type.includes('mcpTrigger'));
						if (mcpNode) {
							mcpNode.credentials = {
								httpHeaderAuth: { id: credential.id, name: credential.name },
							};
						}
						return wf;
					},
				},
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Try without auth - should fail
			const noAuthResponse = await api.webhooks.trigger(mcpPath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: api.mcp.createMessage('initialize', {
					protocolVersion: '2024-11-05',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				}),
			});
			expect(noAuthResponse.status()).toBe(403);

			// Try with valid auth - should succeed
			const session = await api.mcp.streamableHttpInitialize(mcpPath, {
				headers: { [headerName]: headerValue },
			});

			expect(session.sessionId).toBeTruthy();
		});
	});

	test.describe('Tool Operations', () => {
		test('should return all connected tools in tools/list', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-multi-tool.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);
			const tools = await api.mcp.listTools(session, mcpPath);

			expect(tools).toHaveLength(3);

			const toolNames = tools.map((t) => t.name).sort();
			expect(toolNames).toEqual(['add', 'echo', 'multiply']);
		});

		test('should execute tool with arguments', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-multi-tool.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);

			// Test echo tool
			const echoResult = await api.mcp.callTool(session, mcpPath, 'echo', {
				message: 'Multi-tool test',
			});
			expect(echoResult.content[0].text).toContain('Multi-tool test');

			// Test add tool
			const addResult = await api.mcp.callTool(session, mcpPath, 'add', { a: 5, b: 3 });
			expect(addResult.content[0].text).toContain('8');

			// Test multiply tool
			const multiplyResult = await api.mcp.callTool(session, mcpPath, 'multiply', { a: 4, b: 7 });
			expect(multiplyResult.content[0].text).toContain('28');
		});

		test('should return error for unknown tool', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			const session = await api.mcp.streamableHttpInitialize(mcpPath);

			// Try to call a non-existent tool
			const message = api.mcp.createMessage('tools/call', {
				name: 'nonexistent_tool',
				arguments: {},
			});

			const response = await api.mcp.streamableHttpSendMessage(session, mcpPath, message);
			const body = await response.text();

			// Should get an error response
			expect(body).toContain('error');
		});
	});

	test.describe('Session Management', () => {
		test('should reject requests with invalid session ID', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Create a fake session with an invalid session ID
			const fakeSession: McpSession = {
				sessionId: 'invalid-session-id-12345',
				transport: 'streamableHttp',
			};

			const message = api.mcp.createMessage('tools/list');
			const response = await api.mcp.streamableHttpSendMessage(fakeSession, mcpPath, message);

			// Should return an error status (404 or 401)
			expect(response.status()).toBeGreaterThanOrEqual(400);
		});

		test('should cleanup session on DELETE request', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize and then delete session
			const session = await api.mcp.streamableHttpInitialize(mcpPath);
			await api.mcp.streamableHttpDelete(session, mcpPath);

			// Try to use the deleted session - should fail
			const message = api.mcp.createMessage('tools/list');
			const response = await api.mcp.streamableHttpSendMessage(session, mcpPath, message);

			expect(response.status()).toBeGreaterThanOrEqual(400);
		});
	});

	test.describe('Error Handling', () => {
		test('should return 404 for non-existent endpoint', async ({ api }) => {
			const response = await api.webhooks.trigger('webhook/non-existent-mcp-endpoint-12345', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: api.mcp.createMessage('initialize'),
			});

			expect(response.status()).toBe(404);
		});

		test('should handle malformed JSON-RPC messages', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// First establish a valid session
			const session = await api.mcp.streamableHttpInitialize(mcpPath);

			// Send malformed message (missing required fields)
			const malformedMessage = {
				// Missing jsonrpc version
				id: nanoid(),
				method: 'tools/list',
			};

			const response = await api.mcp.streamableHttpSendMessage(session, mcpPath, malformedMessage);

			// Server should handle gracefully (either error response or parse error)
			// The exact behavior depends on implementation
			const body = await response.text();
			expect(body).toBeTruthy(); // Should return some response
		});
	});
});

// Queue mode tests - tagged with @mode:queue to run only in queue infrastructure
test.describe('MCP Trigger - Queue Mode', () => {
	test('@mode:queue should return 202 Accepted for tool call in queue mode', async ({ api }) => {
		const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
			'mcp-trigger/mcp-trigger-basic.json',
		);
		await api.workflows.activate(workflowId, createdWorkflow.versionId!);

		const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
		const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

		// In SSE mode with queue mode enabled, tool calls should return 202 Accepted
		// because the execution is queued and response comes via Redis pub/sub
		const session = await api.mcp.sseSetup(mcpPath);

		try {
			const message = api.mcp.createMessage('tools/call', {
				name: 'echo',
				arguments: { message: 'Queue mode test' },
			});

			const response = await api.mcp.sseSendMessage(session, message);

			// In queue mode, SSE tool calls may return 202 Accepted
			// The actual result would come back asynchronously
			expect([200, 202]).toContain(response.status());
		} finally {
			api.mcp.sseClose(session);
		}
	});
});

// Multi-main tests - tagged with @mode:multi-main to run only in multi-main infrastructure
test.describe('MCP Trigger - Multi-Main', () => {
	test.describe('Streamable HTTP Transport', () => {
		test('@mode:multi-main should handle tool call on different main than session creator', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			// This test verifies that MCP sessions work correctly in multi-main setups
			// where the session might be created on one main but tool calls routed to another

			// Skip if not in multi-main mode (need at least 2 mains)
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains for multi-main testing');

			// Create workflow via load balancer (normal flow)
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize session on main-1 (direct access, bypassing load balancer)
			const main1Api = await createApiForMain(0);
			const session = await main1Api.mcp.streamableHttpInitialize(mcpPath);

			expect(session.sessionId).toBeTruthy();

			// Send tool call to main-2 (different main than where session was created)
			// This tests that session state is properly shared across mains via Redis
			const main2Api = await createApiForMain(1);
			const result = await main2Api.mcp.callTool(session, mcpPath, 'echo', {
				message: 'Cross-main test',
			});

			expect(result.content).toBeDefined();
			expect(result.content[0].text).toContain('Cross-main test');
		});

		test('@mode:multi-main should handle multiple tool calls across different mains', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			// Test that multiple tool calls can be distributed across mains
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains for multi-main testing');

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-multi-tool.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize session on main-1
			const main1Api = await createApiForMain(0);
			const session = await main1Api.mcp.streamableHttpInitialize(mcpPath);

			// Alternate tool calls between mains to simulate load balancer behavior
			const main2Api = await createApiForMain(1);

			// Call 1: main-1
			const echoResult = await main1Api.mcp.callTool(session, mcpPath, 'echo', {
				message: 'From main 1',
			});
			expect(echoResult.content[0].text).toContain('From main 1');

			// Call 2: main-2
			const addResult = await main2Api.mcp.callTool(session, mcpPath, 'add', { a: 10, b: 20 });
			expect(addResult.content[0].text).toContain('30');

			// Call 3: main-1 again
			const multiplyResult = await main1Api.mcp.callTool(session, mcpPath, 'multiply', {
				a: 5,
				b: 6,
			});
			expect(multiplyResult.content[0].text).toContain('30');

			// Call 4: main-2 again
			const echoResult2 = await main2Api.mcp.callTool(session, mcpPath, 'echo', {
				message: 'From main 2',
			});
			expect(echoResult2.content[0].text).toContain('From main 2');
		});
	});

	test.describe('SSE Transport', () => {
		test('@mode:multi-main should handle SSE tool call on different main than session creator', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			// This test verifies that SSE-based MCP sessions work correctly in multi-main setups
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains for multi-main testing');

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-basic.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize SSE session on main-1
			const main1Api = await createApiForMain(0);
			const session = await main1Api.mcp.sseSetup(mcpPath);

			try {
				expect(session.sessionId).toBeTruthy();
				expect(session.transport).toBe('sse');

				// Send tool call to main-2 (different main than where SSE session was created)
				// This tests that SSE session state is properly shared across mains via Redis
				// Use callToolCrossMain to POST to main2's URL while receiving on main1's SSE stream
				const main2McpPath = `${mainUrls[1]}/${mcpPath}`;
				const result = await main1Api.mcp.callToolCrossMain(session, main2McpPath, 'echo', {
					message: 'SSE cross-main test',
				});

				expect(result.content).toBeDefined();
				expect(result.content[0].text).toContain('SSE cross-main test');
			} finally {
				main1Api.mcp.sseClose(session);
			}
		});

		test('@mode:multi-main should handle multiple SSE tool calls across different mains', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			// Test that multiple SSE tool calls can be distributed across mains
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains for multi-main testing');

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-multi-tool.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize SSE session on main-1
			const main1Api = await createApiForMain(0);
			const session = await main1Api.mcp.sseSetup(mcpPath);

			// Construct full URL paths for cross-main calls
			const main2McpPath = `${mainUrls[1]}/${mcpPath}`;

			try {
				// Call 1: main-1 (where SSE connection was established)
				const echoResult = await main1Api.mcp.callTool(session, mcpPath, 'echo', {
					message: 'SSE from main 1',
				});
				expect(echoResult.content[0].text).toContain('SSE from main 1');

				// Call 2: main-2 (different main, tests Redis pub/sub for response routing)
				// Use callToolCrossMain to POST to main2 but receive response on main1's SSE stream
				const addResult = await main1Api.mcp.callToolCrossMain(session, main2McpPath, 'add', {
					a: 15,
					b: 25,
				});
				expect(addResult.content[0].text).toContain('40');

				// Call 3: main-1 again
				const multiplyResult = await main1Api.mcp.callTool(session, mcpPath, 'multiply', {
					a: 7,
					b: 8,
				});
				expect(multiplyResult.content[0].text).toContain('56');

				// Call 4: main-2 again
				const echoResult2 = await main1Api.mcp.callToolCrossMain(session, main2McpPath, 'echo', {
					message: 'SSE from main 2',
				});
				expect(echoResult2.content[0].text).toContain('SSE from main 2');
			} finally {
				main1Api.mcp.sseClose(session);
			}
		});

		test('@mode:multi-main should list tools via SSE from different main', async ({
			api,
			mainUrls,
			createApiForMain,
		}) => {
			// Test that tools/list works across mains with SSE transport
			test.skip(mainUrls.length < 2, 'Requires at least 2 mains for multi-main testing');

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-multi-tool.json',
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
			const mcpPath = `webhook/${mcpNode?.parameters.path as string}`;

			// Initialize SSE session on main-1
			const main1Api = await createApiForMain(0);
			const session = await main1Api.mcp.sseSetup(mcpPath);

			try {
				// List tools via main-2 (different main)
				// Use listToolsCrossMain to POST to main2 but receive response on main1's SSE stream
				const main2McpPath = `${mainUrls[1]}/${mcpPath}`;
				const tools = await main1Api.mcp.listToolsCrossMain(session, main2McpPath);

				expect(tools).toHaveLength(3);
				const toolNames = tools.map((t) => t.name).sort();
				expect(toolNames).toEqual(['add', 'echo', 'multiply']);
			} finally {
				main1Api.mcp.sseClose(session);
			}
		});
	});
});
