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
import { callFields, callOperations } from './CallDescription';
import { retellAiApiRequest } from './GenericFunctions';
import { phoneNumberFields, phoneNumberOperations } from './PhoneNumberDescription';

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
							name: 'Call',
							value: 'call',
						},
						{
							name: 'Phone Number',
							value: 'phoneNumber',
						},
					],
					default: 'call',
				},
				// Call
				...callOperations,
				...callFields,
				// Agent
				...agentOperations,
				...agentFields,
				// Phone Number
				...phoneNumberOperations,
				...phoneNumberFields,
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
