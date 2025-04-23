import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import {
	JSONRPCMessageSchema,
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type * as express from 'express';
import { OperationalError, type Logger } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { FlushingSSEServerTransport } from './FlushingSSEServerTransport';
import type { CompressionResponse } from './FlushingSSEServerTransport';

/**
 * Parses the JSONRPC message and checks whether the method used was a tool
 * call. This is necessary in order to not have executions for listing tools
 * and other commands sent by the MCP client
 */
function wasToolCall(body: string) {
	try {
		const message: unknown = JSON.parse(body);
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		return (
			'method' in parsedMessage &&
			'id' in parsedMessage &&
			parsedMessage?.method === CallToolRequestSchema.shape.method.value
		);
	} catch {
		return false;
	}
}

export class McpServer {
	servers: { [sessionId: string]: Server } = {};

	transports: { [sessionId: string]: FlushingSSEServerTransport } = {};

	logger: Logger;

	private tools: { [sessionId: string]: Tool[] } = {};

	private resolveFunctions: { [sessionId: string]: CallableFunction } = {};

	constructor(logger: Logger) {
		this.logger = logger;
		this.logger.debug('MCP Server created');
	}

	async connectTransport(postUrl: string, resp: CompressionResponse): Promise<void> {
		const transport = new FlushingSSEServerTransport(postUrl, resp);
		const server = this.setUpServer();
		const { sessionId } = transport;
		this.transports[sessionId] = transport;
		this.servers[sessionId] = server;

		resp.on('close', async () => {
			this.logger.debug(`Deleting transport for ${sessionId}`);
			delete this.tools[sessionId];
			delete this.resolveFunctions[sessionId];
			delete this.transports[sessionId];
			delete this.servers[sessionId];
		});

		await server.connect(transport);

		// Make sure we flush the compression middleware, so that it's not waiting for more content to be added to the buffer
		if (resp.flush) {
			resp.flush();
		}
	}

	async handlePostMessage(req: express.Request, resp: CompressionResponse, connectedTools: Tool[]) {
		const sessionId = req.query.sessionId as string;
		const transport = this.transports[sessionId];
		this.tools[sessionId] = connectedTools;
		if (transport) {
			// We need to add a promise here because the `handlePostMessage` will send something to the
			// MCP Server, that will run in a different context. This means that the return will happen
			// almost immediately, and will lead to marking the sub-node as "running" in the final execution
			await new Promise(async (resolve) => {
				this.resolveFunctions[sessionId] = resolve;
				await transport.handlePostMessage(req, resp, req.rawBody.toString());
			});
			delete this.resolveFunctions[sessionId];
		} else {
			this.logger.warn(`No transport found for session ${sessionId}`);
			resp.status(401).send('No transport found for sessionId');
		}

		if (resp.flush) {
			resp.flush();
		}

		delete this.tools[sessionId]; // Clean up to avoid keeping all tools in memory

		return wasToolCall(req.rawBody.toString());
	}

	setUpServer(): Server {
		const server = new Server(
			{
				name: 'n8n-mcp-server',
				version: '0.1.0',
			},
			{
				capabilities: { tools: {} },
			},
		);

		server.setRequestHandler(ListToolsRequestSchema, async (_, extra: RequestHandlerExtra) => {
			if (!extra.sessionId) {
				throw new OperationalError('Require a sessionId for the listing of tools');
			}

			return {
				tools: this.tools[extra.sessionId].map((tool) => {
					return {
						name: tool.name,
						description: tool.description,
						// Allow additional properties on tool call input
						inputSchema: zodToJsonSchema(tool.schema, { removeAdditionalStrategy: 'strict' }),
					};
				}),
			};
		});

		server.setRequestHandler(CallToolRequestSchema, async (request, extra: RequestHandlerExtra) => {
			if (!request.params?.name || !request.params?.arguments) {
				throw new OperationalError('Require a name and arguments for the tool call');
			}
			if (!extra.sessionId) {
				throw new OperationalError('Require a sessionId for the tool call');
			}

			const requestedTool: Tool | undefined = this.tools[extra.sessionId].find(
				(tool) => tool.name === request.params.name,
			);
			if (!requestedTool) {
				throw new OperationalError('Tool not found');
			}

			try {
				const result = await requestedTool.invoke(request.params.arguments);

				this.resolveFunctions[extra.sessionId]();

				this.logger.debug(`Got request for ${requestedTool.name}, and executed it.`);

				if (typeof result === 'object') {
					return { content: [{ type: 'text', text: JSON.stringify(result) }] };
				}
				if (typeof result === 'string') {
					return { content: [{ type: 'text', text: result }] };
				}
				return { content: [{ type: 'text', text: String(result) }] };
			} catch (error) {
				this.logger.error(`Error while executing Tool ${requestedTool.name}: ${error}`);
				return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
			}
		});

		server.onclose = () => {
			this.logger.debug('Closing MCP Server');
		};
		server.onerror = (error: unknown) => {
			this.logger.error(`MCP Error: ${error}`);
		};
		return server;
	}
}

/**
 * This singleton is shared across the instance, making sure we only have one server to worry about.
 * It needs to stay in memory to keep track of the long-lived connections.
 * It requires a logger at first creation to set everything up.
 */
export class McpServerSingleton {
	static #instance: McpServerSingleton;

	private _serverData: McpServer;

	private constructor(logger: Logger) {
		this._serverData = new McpServer(logger);
	}

	static instance(logger: Logger): McpServer {
		if (!McpServerSingleton.#instance) {
			McpServerSingleton.#instance = new McpServerSingleton(logger);
			logger.debug('Created singleton for MCP Servers');
		}

		return McpServerSingleton.#instance.serverData;
	}

	get serverData() {
		return this._serverData;
	}
}
