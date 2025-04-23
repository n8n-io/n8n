/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { XataChatMessageHistory } from '@langchain/community/stores/message/xata';
import { BaseClient } from '@xata.io/client';
import { BufferMemory, BufferWindowMemory } from 'langchain/memory';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

export class MemoryXata implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Xata',
		name: 'memoryXata',
		icon: 'file:xata.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		description: 'Use Xata Memory',
		defaults: {
			name: 'Xata',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#1321A7',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryxata/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'xataApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'The key to use to store the memory',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				...sessionIdOption,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			sessionKeyProperty,
			expressionSessionKeyProperty(1.4),
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.3 } }] } },
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('xataApi');
		const nodeVersion = this.getNode().typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		}

		const xataClient = new BaseClient({
			apiKey: credentials.apiKey as string,
			branch: (credentials.branch as string) || 'main',
			databaseURL: credentials.databaseEndpoint as string,
		});

		const table = (credentials.databaseEndpoint as string).match(
			/https:\/\/[^.]+\.[^.]+\.xata\.sh\/db\/([^\/:]+)/,
		);

		if (table === null) {
			throw new NodeOperationError(
				this.getNode(),
				'It was not possible to extract the table from the Database Endpoint.',
			);
		}

		const chatHistory = new XataChatMessageHistory({
			table: table[1],
			sessionId,
			client: xataClient,
			apiKey: credentials.apiKey as string,
		});

		const memClass = this.getNode().typeVersion < 1.3 ? BufferMemory : BufferWindowMemory;
		const kOptions =
			this.getNode().typeVersion < 1.3
				? {}
				: { k: this.getNodeParameter('contextWindowLength', itemIndex) };

		const memory = new memClass({
			chatHistory,
			memoryKey: 'chat_history',
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			...kOptions,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
