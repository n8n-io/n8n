import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { agentFields, agentOperations } from './AgentDescription';
import { batchCallFields, batchCallOperations } from './BatchCallDescription';
import { callFields, callOperations } from './CallDescription';
import { chatFields, chatOperations } from './ChatDescription';
import { chatAgentFields, chatAgentOperations } from './ChatAgentDescription';
import {
	conversationFlowFields,
	conversationFlowOperations,
} from './ConversationFlowDescription';
import {
	conversationFlowComponentFields,
	conversationFlowComponentOperations,
} from './ConversationFlowComponentDescription';
import { retellAiApiRequest } from './GenericFunctions';
import { knowledgeBaseFields, knowledgeBaseOperations } from './KnowledgeBaseDescription';
import { phoneNumberFields, phoneNumberOperations } from './PhoneNumberDescription';
import { retellLlmFields, retellLlmOperations } from './RetellLlmDescription';
import { testFields, testOperations } from './TestDescription';
import { voiceFields, voiceOperations } from './VoiceDescription';

export class RetellAiV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			defaults: {
				name: 'Retell AI',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'retellAiApi',
					required: true,
				},
			],
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
							name: 'Batch Call',
							value: 'batchCall',
						},
						{
							name: 'Call',
							value: 'call',
						},
						{
							name: 'Chat',
							value: 'chat',
						},
						{
							name: 'Chat Agent',
							value: 'chatAgent',
						},
						{
							name: 'Conversation Flow',
							value: 'conversationFlow',
						},
						{
							name: 'Flow Component',
							value: 'conversationFlowComponent',
						},
						{
							name: 'Knowledge Base',
							value: 'knowledgeBase',
						},
						{
							name: 'Phone Number',
							value: 'phoneNumber',
						},
						{
							name: 'Retell LLM',
							value: 'retellLlm',
						},
						{
							name: 'Test',
							value: 'test',
						},
						{
							name: 'Voice',
							value: 'voice',
						},
					],
					default: 'call',
				},
				// Agent
				...agentOperations,
				...agentFields,
				// Batch Call
				...batchCallOperations,
				...batchCallFields,
				// Call
				...callOperations,
				...callFields,
				// Chat
				...chatOperations,
				...chatFields,
				// Chat Agent
				...chatAgentOperations,
				...chatAgentFields,
				// Conversation Flow
				...conversationFlowOperations,
				...conversationFlowFields,
				// Flow Component
				...conversationFlowComponentOperations,
				...conversationFlowComponentFields,
				// Knowledge Base
				...knowledgeBaseOperations,
				...knowledgeBaseFields,
				// Phone Number
				...phoneNumberOperations,
				...phoneNumberFields,
				// Retell LLM
				...retellLlmOperations,
				...retellLlmFields,
				// Test
				...testOperations,
				...testFields,
				// Voice
				...voiceOperations,
				...voiceFields,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let responseData: IDataObject | IDataObject[];

		for (let i = 0; i < items.length; i++) {
			try {
				responseData = {};

				// ----------------------------------------------------------------
				//                             Call
				// ----------------------------------------------------------------
				if (resource === 'call') {
					if (operation === 'createPhoneCall') {
						const fromNumber = this.getNodeParameter('fromNumber', i) as string;
						const toNumber = this.getNodeParameter('toNumber', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							from_number: fromNumber,
							to_number: toNumber,
						};

						if (additionalFields.overrideAgentId) {
							body.override_agent_id = additionalFields.overrideAgentId;
						}
						if (additionalFields.metadata) {
							body.metadata =
								typeof additionalFields.metadata === 'string'
									? JSON.parse(additionalFields.metadata)
									: additionalFields.metadata;
						}
						if (additionalFields.retellLlmDynamicVariables) {
							body.retell_llm_dynamic_variables =
								typeof additionalFields.retellLlmDynamicVariables === 'string'
									? JSON.parse(additionalFields.retellLlmDynamicVariables)
									: additionalFields.retellLlmDynamicVariables;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/v2/create-phone-call',
							body,
						)) as IDataObject;
					}

					if (operation === 'createWebCall') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							agent_id: agentId,
						};

						if (additionalFields.metadata) {
							body.metadata =
								typeof additionalFields.metadata === 'string'
									? JSON.parse(additionalFields.metadata)
									: additionalFields.metadata;
						}
						if (additionalFields.retellLlmDynamicVariables) {
							body.retell_llm_dynamic_variables =
								typeof additionalFields.retellLlmDynamicVariables === 'string'
									? JSON.parse(additionalFields.retellLlmDynamicVariables)
									: additionalFields.retellLlmDynamicVariables;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/v2/create-web-call',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const callId = this.getNodeParameter('callId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/v2/get-call/${callId}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filterFields = this.getNodeParameter('filterFields', i) as IDataObject;

						const body: IDataObject = {};
						const filterCriteria: IDataObject = {};

						if (filterFields.agentId) {
							filterCriteria.agent_id = [filterFields.agentId];
						}
						if (
							filterFields.callStatus &&
							(filterFields.callStatus as string[]).length > 0
						) {
							filterCriteria.call_status = filterFields.callStatus;
						}
						if (filterFields.callType) {
							filterCriteria.call_type = [filterFields.callType];
						}
						if (filterFields.direction) {
							filterCriteria.direction = [filterFields.direction];
						}

						if (Object.keys(filterCriteria).length > 0) {
							body.filter_criteria = filterCriteria;
						}

						if (filterFields.sortOrder) {
							body.sort_order = filterFields.sortOrder;
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							body.limit = limit;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/v2/list-calls',
							body,
						)) as IDataObject[];

						// The list-calls endpoint returns an array directly
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}

					if (operation === 'update') {
						const callId = this.getNodeParameter('callId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.metadata) {
							body.metadata =
								typeof updateFields.metadata === 'string'
									? JSON.parse(updateFields.metadata)
									: updateFields.metadata;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/v2/update-call/${callId}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const callId = this.getNodeParameter('callId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/v2/delete-call/${callId}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                             Agent
				// ----------------------------------------------------------------
				if (resource === 'agent') {
					if (operation === 'create') {
						const voiceId = this.getNodeParameter('voiceId', i) as string;
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							voice_id: voiceId,
						};

						// Build the response_engine object based on the selected type
						const responseEngine: IDataObject = {
							type: responseEngineType,
						};

						if (responseEngineType === 'retell-llm') {
							const llmId = this.getNodeParameter('llmId', i) as string;
							responseEngine.llm_id = llmId;
						} else if (responseEngineType === 'custom-llm') {
							const llmWebsocketUrl = this.getNodeParameter(
								'llmWebsocketUrl',
								i,
							) as string;
							responseEngine.llm_websocket_url = llmWebsocketUrl;
						} else if (responseEngineType === 'conversation-flow') {
							const conversationFlowId = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
							responseEngine.conversation_flow_id = conversationFlowId;
						}

						body.response_engine = responseEngine;

						if (additionalFields.agentName) {
							body.agent_name = additionalFields.agentName;
						}
						if (additionalFields.language) {
							body.language = additionalFields.language;
						}
						if (additionalFields.webhookUrl) {
							body.webhook_url = additionalFields.webhookUrl;
						}
						if (additionalFields.beginMessage) {
							body.begin_message = additionalFields.beginMessage;
						}
						if (additionalFields.enableVoicemailDetection !== undefined) {
							body.enable_voicemail_detection =
								additionalFields.enableVoicemailDetection;
						}
						if (additionalFields.maxCallDurationMs) {
							body.max_call_duration_ms = additionalFields.maxCallDurationMs;
						}
						if (additionalFields.endCallAfterSilenceMs) {
							body.end_call_after_silence_ms = additionalFields.endCallAfterSilenceMs;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-agent',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-agents',
						)) as IDataObject[];

						// The list-agents endpoint returns an array directly
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.agentName) {
							body.agent_name = updateFields.agentName;
						}
						if (updateFields.voiceId) {
							body.voice_id = updateFields.voiceId;
						}
						if (updateFields.language) {
							body.language = updateFields.language;
						}
						if (updateFields.webhookUrl) {
							body.webhook_url = updateFields.webhookUrl;
						}
						if (updateFields.beginMessage) {
							body.begin_message = updateFields.beginMessage;
						}
						if (updateFields.enableVoicemailDetection !== undefined) {
							body.enable_voicemail_detection = updateFields.enableVoicemailDetection;
						}
						if (updateFields.maxCallDurationMs) {
							body.max_call_duration_ms = updateFields.maxCallDurationMs;
						}
						if (updateFields.endCallAfterSilenceMs) {
							body.end_call_after_silence_ms = updateFields.endCallAfterSilenceMs;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-agent/${agentId}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'publish') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							`/publish-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'getVersions') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-agent-versions/${agentId}`,
						)) as IDataObject[];

						// The get-agent-versions endpoint returns an array directly
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}
				}

				// ----------------------------------------------------------------
				//                          Phone Number
				// ----------------------------------------------------------------
				if (resource === 'phoneNumber') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {};

						if (additionalFields.areaCode) {
							body.area_code = additionalFields.areaCode;
						}
						if (additionalFields.countryCode) {
							body.country_code = additionalFields.countryCode;
						}
						if (additionalFields.nickname) {
							body.nickname = additionalFields.nickname;
						}
						if (additionalFields.inboundAgentId) {
							body.inbound_agent_id = additionalFields.inboundAgentId;
						}
						if (additionalFields.outboundAgentId) {
							body.outbound_agent_id = additionalFields.outboundAgentId;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-phone-number',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-phone-number/${encodeURIComponent(phoneNumber)}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-phone-numbers',
						)) as IDataObject[];

						// The list-phone-numbers endpoint returns an array directly
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}

					if (operation === 'delete') {
						const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-phone-number/${encodeURIComponent(phoneNumber)}`,
						)) as IDataObject;
					}

					if (operation === 'update') {
						const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.inboundAgentId) {
							body.inbound_agent_id = updateFields.inboundAgentId;
						}
						if (updateFields.outboundAgentId) {
							body.outbound_agent_id = updateFields.outboundAgentId;
						}
						if (updateFields.nickname) {
							body.nickname = updateFields.nickname;
						}
						if (updateFields.inboundWebhookUrl) {
							body.inbound_webhook_url = updateFields.inboundWebhookUrl;
						}
						if (updateFields.allowedInboundCountryList) {
							body.allowed_inbound_country_list = (
								updateFields.allowedInboundCountryList as string
							)
								.split(',')
								.map((c: string) => c.trim());
						}
						if (updateFields.allowedOutboundCountryList) {
							body.allowed_outbound_country_list = (
								updateFields.allowedOutboundCountryList as string
							)
								.split(',')
								.map((c: string) => c.trim());
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-phone-number/${encodeURIComponent(phoneNumber)}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'import') {
						const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							phone_number: phoneNumber,
						};

						if (additionalFields.inboundAgentId) {
							body.inbound_agent_id = additionalFields.inboundAgentId;
						}
						if (additionalFields.outboundAgentId) {
							body.outbound_agent_id = additionalFields.outboundAgentId;
						}
						if (additionalFields.nickname) {
							body.nickname = additionalFields.nickname;
						}
						if (additionalFields.terminationUri) {
							body.termination_uri = additionalFields.terminationUri;
						}
						if (additionalFields.sipTrunkAuthUsername) {
							body.sip_trunk_auth_username = additionalFields.sipTrunkAuthUsername;
						}
						if (additionalFields.sipTrunkAuthPassword) {
							body.sip_trunk_auth_password = additionalFields.sipTrunkAuthPassword;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/import-phone-number',
							body,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                          Batch Call
				// ----------------------------------------------------------------
				if (resource === 'batchCall') {
					if (operation === 'create') {
						const fromNumber = this.getNodeParameter('fromNumber', i) as string;
						const tasksData = this.getNodeParameter('tasks', i) as IDataObject;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const tasks =
							typeof tasksData === 'string' ? JSON.parse(tasksData) : tasksData;

						const body: IDataObject = {
							from_number: fromNumber,
							tasks,
						};

						if (additionalFields.name) {
							body.name = additionalFields.name;
						}
						if (additionalFields.triggerTimestamp) {
							body.trigger_timestamp = additionalFields.triggerTimestamp;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/v2/create-batch-call',
							body,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                             Chat
				// ----------------------------------------------------------------
				if (resource === 'chat') {
					if (operation === 'create') {
						const chatAgentId = this.getNodeParameter('chatAgentId', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							chat_agent_id: chatAgentId,
						};

						if (additionalFields.metadata) {
							body.metadata =
								typeof additionalFields.metadata === 'string'
									? JSON.parse(additionalFields.metadata)
									: additionalFields.metadata;
						}
						if (additionalFields.retellLlmDynamicVariables) {
							body.retell_llm_dynamic_variables =
								typeof additionalFields.retellLlmDynamicVariables === 'string'
									? JSON.parse(additionalFields.retellLlmDynamicVariables)
									: additionalFields.retellLlmDynamicVariables;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-chat',
							body,
						)) as IDataObject;
					}

					if (operation === 'createCompletion') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const content = this.getNodeParameter('content', i) as string;

						const body: IDataObject = {
							content,
						};

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							`/create-chat-completion/${chatId}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const chatId = this.getNodeParameter('chatId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-chat/${chatId}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-chat',
						)) as IDataObject[];

						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.metadata) {
							body.metadata =
								typeof updateFields.metadata === 'string'
									? JSON.parse(updateFields.metadata)
									: updateFields.metadata;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-chat/${chatId}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'end') {
						const chatId = this.getNodeParameter('chatId', i) as string;

						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/end-chat/${chatId}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                          Chat Agent
				// ----------------------------------------------------------------
				if (resource === 'chatAgent') {
					if (operation === 'create') {
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const responseEngine: IDataObject = { type: responseEngineType };
						if (responseEngineType === 'retell-llm') {
							responseEngine.llm_id = this.getNodeParameter('llmId', i) as string;
						} else if (responseEngineType === 'custom-llm') {
							responseEngine.llm_websocket_url = this.getNodeParameter(
								'llmWebsocketUrl',
								i,
							) as string;
						} else if (responseEngineType === 'conversation-flow') {
							responseEngine.conversation_flow_id = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
						}

						const body: IDataObject = { response_engine: responseEngine };

						if (additionalFields.agentName) {
							body.agent_name = additionalFields.agentName;
						}
						if (additionalFields.language) {
							body.language = additionalFields.language;
						}
						if (additionalFields.webhookUrl) {
							body.webhook_url = additionalFields.webhookUrl;
						}

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-chat-agent',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-chat-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-chat-agents',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.agentName) body.agent_name = updateFields.agentName;
						if (updateFields.language) body.language = updateFields.language;
						if (updateFields.webhookUrl) body.webhook_url = updateFields.webhookUrl;
						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-chat-agent/${agentId}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-chat-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'publish') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							`/publish-chat-agent/${agentId}`,
						)) as IDataObject;
					}

					if (operation === 'getVersions') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-chat-agent-versions/${agentId}`,
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}
				}

				// ----------------------------------------------------------------
				//                       Conversation Flow
				// ----------------------------------------------------------------
				if (resource === 'conversationFlow') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const body: IDataObject = {};
						const nodes = this.getNodeParameter('nodes', i) as string;
						if (nodes) body.nodes = typeof nodes === 'string' ? JSON.parse(nodes) : nodes;
						const startSpeaker = this.getNodeParameter('startSpeaker', i) as string;
						if (startSpeaker) body.start_speaker = startSpeaker;
						const model = this.getNodeParameter('model', i) as string;
						if (model) body.model = model;
						if (additionalFields.globalPrompt) {
							body.global_prompt = additionalFields.globalPrompt;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-conversation-flow',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const id = this.getNodeParameter('conversationFlowId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-conversation-flow/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-conversation-flows',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('conversationFlowId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.globalPrompt) body.global_prompt = updateFields.globalPrompt;
						if (updateFields.nodes) {
							body.nodes =
								typeof updateFields.nodes === 'string'
									? JSON.parse(updateFields.nodes as string)
									: updateFields.nodes;
						}
						if (updateFields.model) body.model = updateFields.model;
						if (updateFields.startSpeaker) {
							body.start_speaker = updateFields.startSpeaker;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-conversation-flow/${id}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const id = this.getNodeParameter('conversationFlowId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-conversation-flow/${id}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                    Conversation Flow Component
				// ----------------------------------------------------------------
				if (resource === 'conversationFlowComponent') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const nodes = this.getNodeParameter('nodes', i) as string;
						const body: IDataObject = {
							name,
							nodes: typeof nodes === 'string' ? JSON.parse(nodes) : nodes,
						};
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-conversation-flow-component',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const id = this.getNodeParameter('componentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-conversation-flow-component/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-conversation-flow-components',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('componentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.name) body.name = updateFields.name;
						if (updateFields.nodes) {
							body.nodes =
								typeof updateFields.nodes === 'string'
									? JSON.parse(updateFields.nodes as string)
									: updateFields.nodes;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-conversation-flow-component/${id}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const id = this.getNodeParameter('componentId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-conversation-flow-component/${id}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                        Knowledge Base
				// ----------------------------------------------------------------
				if (resource === 'knowledgeBase') {
					if (operation === 'create') {
						const name = this.getNodeParameter('knowledgeBaseName', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const body: IDataObject = {
							knowledge_base_name: name,
						};
						if (additionalFields.knowledgeBaseUrls) {
							body.knowledge_base_urls =
								typeof additionalFields.knowledgeBaseUrls === 'string'
									? JSON.parse(additionalFields.knowledgeBaseUrls as string)
									: additionalFields.knowledgeBaseUrls;
						}
						if (additionalFields.knowledgeBaseTexts) {
							body.knowledge_base_texts =
								typeof additionalFields.knowledgeBaseTexts === 'string'
									? JSON.parse(additionalFields.knowledgeBaseTexts as string)
									: additionalFields.knowledgeBaseTexts;
						}
						if (additionalFields.enableAutoRefresh !== undefined) {
							body.enable_auto_refresh = additionalFields.enableAutoRefresh;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-knowledge-base',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const id = this.getNodeParameter('knowledgeBaseId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-knowledge-base/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-knowledge-bases',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'delete') {
						const id = this.getNodeParameter('knowledgeBaseId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-knowledge-base/${id}`,
						)) as IDataObject;
					}

					if (operation === 'addSources') {
						const id = this.getNodeParameter('knowledgeBaseId', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const body: IDataObject = {};
						if (additionalFields.knowledgeBaseUrls) {
							body.knowledge_base_urls =
								typeof additionalFields.knowledgeBaseUrls === 'string'
									? JSON.parse(additionalFields.knowledgeBaseUrls as string)
									: additionalFields.knowledgeBaseUrls;
						}
						if (additionalFields.knowledgeBaseTexts) {
							body.knowledge_base_texts =
								typeof additionalFields.knowledgeBaseTexts === 'string'
									? JSON.parse(additionalFields.knowledgeBaseTexts as string)
									: additionalFields.knowledgeBaseTexts;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							`/add-knowledge-base-sources/${id}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'deleteSource') {
						const kbId = this.getNodeParameter('knowledgeBaseId', i) as string;
						const sourceId = this.getNodeParameter('sourceId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-knowledge-base-source/${kbId}/${sourceId}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                          Retell LLM
				// ----------------------------------------------------------------
				if (resource === 'retellLlm') {
					if (operation === 'create') {
						const model = this.getNodeParameter('model', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						const body: IDataObject = { model };
						if (additionalFields.generalPrompt) {
							body.general_prompt = additionalFields.generalPrompt;
						}
						if (additionalFields.beginMessage) {
							body.begin_message = additionalFields.beginMessage;
						}
						if (additionalFields.generalTools) {
							body.general_tools =
								typeof additionalFields.generalTools === 'string'
									? JSON.parse(additionalFields.generalTools as string)
									: additionalFields.generalTools;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-retell-llm',
							body,
						)) as IDataObject;
					}

					if (operation === 'get') {
						const id = this.getNodeParameter('llmId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-retell-llm/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-retell-llms',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}

					if (operation === 'update') {
						const id = this.getNodeParameter('llmId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.model) body.model = updateFields.model;
						if (updateFields.generalPrompt) {
							body.general_prompt = updateFields.generalPrompt;
						}
						if (updateFields.beginMessage) {
							body.begin_message = updateFields.beginMessage;
						}
						if (updateFields.generalTools) {
							body.general_tools =
								typeof updateFields.generalTools === 'string'
									? JSON.parse(updateFields.generalTools as string)
									: updateFields.generalTools;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'PATCH',
							`/update-retell-llm/${id}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'delete') {
						const id = this.getNodeParameter('llmId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-retell-llm/${id}`,
						)) as IDataObject;
					}
				}

				// ----------------------------------------------------------------
				//                             Test
				// ----------------------------------------------------------------
				if (resource === 'test') {
					if (operation === 'createTestCase') {
						const name = this.getNodeParameter('name', i) as string;
						const userPrompt = this.getNodeParameter('userPrompt', i) as string;
						const metrics = this.getNodeParameter('metrics', i) as string;
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;

						const responseEngine: IDataObject = { type: responseEngineType };
						if (responseEngineType === 'retell-llm') {
							responseEngine.llm_id = this.getNodeParameter('llmId', i) as string;
						} else if (responseEngineType === 'conversation-flow') {
							responseEngine.conversation_flow_id = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
						}

						const body: IDataObject = {
							name,
							user_prompt: userPrompt,
							metrics:
								typeof metrics === 'string'
									? metrics.split(',').map((m: string) => m.trim())
									: metrics,
							response_engine: responseEngine,
						};

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-test-case-definition',
							body,
						)) as IDataObject;
					}

					if (operation === 'getTestCase') {
						const id = this.getNodeParameter('testCaseDefinitionId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-test-case-definition/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getTestCases') {
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;
						const qs: IDataObject = { type: responseEngineType };
						if (responseEngineType === 'retell-llm') {
							qs.llm_id = this.getNodeParameter('llmId', i) as string;
						} else if (responseEngineType === 'conversation-flow') {
							qs.conversation_flow_id = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-test-case-definitions',
							{},
							qs,
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}

					if (operation === 'updateTestCase') {
						const id = this.getNodeParameter('testCaseDefinitionId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.name) body.name = updateFields.name;
						if (updateFields.userPrompt) body.user_prompt = updateFields.userPrompt;
						if (updateFields.metrics) {
							body.metrics =
								typeof updateFields.metrics === 'string'
									? (updateFields.metrics as string)
											.split(',')
											.map((m: string) => m.trim())
									: updateFields.metrics;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'PUT',
							`/update-test-case-definition/${id}`,
							body,
						)) as IDataObject;
					}

					if (operation === 'deleteTestCase') {
						const id = this.getNodeParameter('testCaseDefinitionId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'DELETE',
							`/delete-test-case-definition/${id}`,
						)) as IDataObject;
					}

					if (operation === 'createBatchTest') {
						const name = this.getNodeParameter('name', i) as string;
						const testCaseIds = this.getNodeParameter(
							'testCaseDefinitionIds',
							i,
						) as string;
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;

						const responseEngine: IDataObject = { type: responseEngineType };
						if (responseEngineType === 'retell-llm') {
							responseEngine.llm_id = this.getNodeParameter('llmId', i) as string;
						} else if (responseEngineType === 'conversation-flow') {
							responseEngine.conversation_flow_id = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
						}

						const body: IDataObject = {
							name,
							test_case_definition_ids:
								typeof testCaseIds === 'string'
									? testCaseIds.split(',').map((id: string) => id.trim())
									: testCaseIds,
							response_engine: responseEngine,
						};

						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/create-batch-test',
							body,
						)) as IDataObject;
					}

					if (operation === 'getBatchTest') {
						const id = this.getNodeParameter('batchTestId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-batch-test/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getBatchTests') {
						const responseEngineType = this.getNodeParameter(
							'responseEngineType',
							i,
						) as string;
						const qs: IDataObject = { type: responseEngineType };
						if (responseEngineType === 'retell-llm') {
							qs.llm_id = this.getNodeParameter('llmId', i) as string;
						} else if (responseEngineType === 'conversation-flow') {
							qs.conversation_flow_id = this.getNodeParameter(
								'conversationFlowId',
								i,
							) as string;
						}
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-batch-tests',
							{},
							qs,
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}

					if (operation === 'getTestRun') {
						const id = this.getNodeParameter('testRunId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-test-run/${id}`,
						)) as IDataObject;
					}

					if (operation === 'getTestRuns') {
						const batchTestId = this.getNodeParameter('batchTestId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/list-test-runs/${batchTestId}`,
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}
				}

				// ----------------------------------------------------------------
				//                            Voice
				// ----------------------------------------------------------------
				if (resource === 'voice') {
					if (operation === 'addCommunity') {
						const voiceId = this.getNodeParameter('providerVoiceId', i) as string;
						const voiceName = this.getNodeParameter('voiceName', i) as string;
						const body: IDataObject = {
							voice_id: voiceId,
							voice_name: voiceName,
						};
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/add-community-voice',
							body,
						)) as IDataObject;
					}

					if (operation === 'clone') {
						const voiceName = this.getNodeParameter('voiceName', i) as string;
						const body: IDataObject = { voice_name: voiceName };
						responseData = (await retellAiApiRequest.call(
							this,
							'POST',
							'/clone-voice',
							body,
						)) as IDataObject;
					}

					if (operation === 'search') {
						const query = this.getNodeParameter('searchQuery', i) as string;
						const qs: IDataObject = {};
						if (query) qs.query = query;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/search-community-voice',
							{},
							qs,
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
					}

					if (operation === 'get') {
						const voiceId = this.getNodeParameter('voiceId', i) as string;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							`/get-voice/${voiceId}`,
						)) as IDataObject;
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = (await retellAiApiRequest.call(
							this,
							'GET',
							'/list-voices',
						)) as IDataObject[];
						if (!Array.isArray(responseData)) {
							responseData = [responseData as IDataObject];
						}
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = (responseData as IDataObject[]).slice(0, limit);
						}
					}
				}

				// Build execution output
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as JsonObject).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
