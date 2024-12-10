import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	handleCallOperations,
	handleKnowledgeBaseOperations,
	handleAgentOperations,
	loadVoiceOptions,
    handleLLMOperations,
    handlePhoneNumberOperations,
    handleVoiceOperations,
	handleConcurrencyOperations,
} from './ResourceHelpers';
import {  validateRetellCredentials } from './GenericFunctions';
import {
    concurrencyOperations,
    concurrencyFields,
} from './ConcurrencyDescription';
import {
	callOperations,
	callFields,
} from './CallDescription';
import {
	agentOperations,
	agentFields,
} from './AgentDescription';
import {
	llmOperations,
	llmFields,
} from './LLMDescription';
import {
	phoneNumberOperations,
	phoneNumberFields,
} from './PhoneNumberDescription';
import {
	knowledgeBaseOperations,
	knowledgeBaseFields,
} from './KnowledgeBaseDescription';
import {
	voiceOperations,
	voiceFields,
} from './VoiceDescription';

export class RetellAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RetellAI',
		name: 'retellAi',
		icon: 'file:retellai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with RetellAI API',
		defaults: {
			name: 'RetellAI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'retellAIApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.retellai.com',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Call',
						value: 'call',
					},
					{
						name: 'Concurrency',
						value: 'concurrency',
					},
					{
						name: 'Knowledge Base',
						value: 'knowledgeBase',
					},
					{
						name: 'LLM',
						value: 'llm',
					},
					{
						name: 'Phone Number',
						value: 'phoneNumber',
					},
					{
						name: 'Voice',
						value: 'voice',
					},
				],
				default: 'call',
			},
			...callOperations,
			...callFields,
			...concurrencyOperations,
			...concurrencyFields,
			...agentOperations,
			...agentFields,
			...llmOperations,
			...llmFields,
			...phoneNumberOperations,
			...phoneNumberFields,
			...knowledgeBaseOperations,
			...knowledgeBaseFields,
			...voiceOperations,
			...voiceFields,
		],
	};

	methods = {
		loadOptions: {
			async getVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadVoiceOptions.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Validate credentials before processing
		await validateRetellCredentials.call(this);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				if (resource === 'call') {
					responseData = await handleCallOperations.call(this, operation, i);
				} else if (resource === 'concurrency') {
					responseData = await handleConcurrencyOperations.call(this, operation, i);
				} else if (resource === 'agent') {
					responseData = await handleAgentOperations.call(this, operation, i);
				} else if (resource === 'llm') {
					responseData = await handleLLMOperations.call(this, operation, i);
				} else if (resource === 'phoneNumber') {
					responseData = await handlePhoneNumberOperations.call(this, operation, i);
				} else if (resource === 'knowledgeBase') {
					responseData = await handleKnowledgeBaseOperations.call(this, operation, i);
				} else if (resource === 'voice') {
					responseData = await handleVoiceOperations.call(this, operation, i);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	
}