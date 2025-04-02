import { Node } from 'n8n-workflow';
import type {
	INodeExecutionData,
	INodeInputConfiguration,
	INodeParameters,
	INodeTypeDescription,
	IRun,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';

type Tool = {
	toolName: string;
	toolDescription: string;
};

const configuredOutputs = (parameters: INodeParameters): INodeInputConfiguration[] => {
	const tools = ((parameters.tools as any).tools ?? []) as Tool[];
	return tools.map(({ toolName }) => ({
		type: 'main',
		displayName: toolName,
	}));
};

export class McpTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'MCP Trigger',
		name: 'mcpTrigger',
		group: ['trigger'],
		description: 'Invoke tools over a MCP connection',
		icon: 'file:mcp.svg',
		iconColor: 'black',
		version: [1],
		defaults: {
			name: 'MCP Trigger',
		},
		// TODO: add CORS options
		inputs: [],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
			{
				name: 'jwtAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['jwtAuth'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'JWT Auth',
						value: 'jwtAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate',
			},
			// {
			// 	displayName: 'Transport',
			// 	name: 'transport',
			// 	type: 'options',
			// 	options: [
			// 		{
			// 			name: 'Server Sent Events',
			// 			value: 'sse',
			// 		},
			// 		{
			// 			name: 'WebSockets',
			// 			value: 'websocket',
			// 		},
			// 		{
			// 			name: 'HTTP Stream',
			// 			value: 'httpStream',
			// 		},
			// 	],
			// 	default: 'sse',
			// 	description: 'The underlying transport to use for this server',
			// },
			{
				displayName: 'Tools',
				name: 'tools',
				placeholder: 'Add Tool',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'Tools available on this MCP server',
				default: {},
				options: [
					{
						name: 'tools',
						displayName: 'Tools',
						values: [
							{
								displayName: 'Tool Name',
								name: 'toolName',
								type: 'string',
								noDataExpression: true,
								required: true,
								default: '',
							},
							{
								displayName: 'Tool Description',
								name: 'toolDescription',
								type: 'string',
								noDataExpression: true,
								required: true,
								default: '',
							},
							{
								displayName: 'Respond',
								name: 'responseMode',
								type: 'options',
								options: [
									{
										name: 'Immediately',
										value: 'onReceived',
										description: 'As soon as this node executes',
									},
									{
										name: 'When Last Node Finishes',
										value: 'lastNode',
										description: 'Returns data of the last-executed node',
									},
								],
								default: 'onReceived',
								description: 'When and how to respond to an invocation',
							},
							{
								displayName: 'Response Data',
								name: 'responseData',
								type: 'options',
								displayOptions: {
									show: {
										responseMode: ['lastNode'],
									},
								},
								options: [
									{
										name: 'All Entries',
										value: 'allEntries',
										description:
											'Returns all the entries of the last node. Always returns an array.',
									},
									{
										name: 'First Entry JSON',
										value: 'firstEntryJson',
										description:
											'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
									},
									{
										name: 'First Entry Binary',
										value: 'firstEntryBinary',
										description:
											'Returns the binary data of the first entry of the last node. Always returns a binary file.',
									},
									{
										name: 'No Response Body',
										value: 'noData',
										description: 'Returns without a body',
									},
								],
								default: 'firstEntryJson',
								description:
									'What data should be returned. If it should return all items as an array or only the first item as object.',
							},
							{
								displayName: 'Response Data',
								name: 'responseData',
								type: 'string',
								displayOptions: {
									show: {
										responseMode: ['onReceived'],
									},
								},
								default: 'ok',
								placeholder: 'success',
								description: 'Custom response data to send',
							},
						],
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// TODO: resolve response promis based on the responseMode, using responseData
		const onMessage = async (message: INodeExecutionData[][]) => {
			const responsePromise = this.helpers.createDeferredPromise<IRun>();
			this.emit(message, undefined, responsePromise);
			await responsePromise?.promise;
		};

		const manualTriggerFunction = async () => {
			// TODO: register with TestMCPManager, so that SSE/Websocket messages can be forwarded here
		};

		const closeFunction = async () => {
			// TOOD: deregister
		};

		if (this.getMode() === 'trigger') {
			// TODO: Register with LiveMCPManager
			return { closeFunction };
		}

		return { closeFunction, manualTriggerFunction };
	}
}
