import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { IPegaApiResponse } from './GenericFunctions';
import { pegaLaunchpadApiRequest, normalizeETagForIfMatch } from './GenericFunctions';
import { caseOperations, caseFields } from './CaseDescription';
import { attachmentOperations, attachmentFields } from './AttachmentDescription';
import { pulseOperations, pulseFields } from './PulseDescription';
import { assignmentOperations, assignmentFields } from './AssignmentDescription';
import { userOperations, userFields } from './UserDescription';
import { agentOperations, agentFields } from './AgentDescription';

export class PegaLaunchpad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Launchpad by Pegasystems',
		name: 'pegaLaunchpad',
		icon: 'file:pegalaunchpad.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Pega Launchpad API',
		defaults: {
			name: 'Pega Launchpad',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pegaOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
				description: 'Authentication method to use',
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://your-pega-domain.com',
				description: 'The base URL of your Pega Launchpad instance (without trailing slash)',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Agent',
						value: 'agent',
						description: 'Interact with Pega AI agents',
					},
					{
						name: 'Assignment',
						value: 'assignment',
						description: 'Represents an assignment in Pega Launchpad',
					},
					{
						name: 'Attachment',
						value: 'attachment',
						description: 'Represents an attachment in Pega Launchpad',
					},
					{
						name: 'Case',
						value: 'case',
						description: 'Represents a case in Pega Launchpad',
					},
					{
						name: 'Pulse',
						value: 'pulse',
						description: 'Represents a pulse in Pega Launchpad',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Represents user actions in Pega Launchpad',
					},
				],
				default: 'case',
			},
			...agentOperations,
			...agentFields,
			...assignmentOperations,
			...assignmentFields,
			...caseOperations,
			...caseFields,
			...attachmentOperations,
			...attachmentFields,
			...pulseOperations,
			...pulseFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData: IPegaApiResponse;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		this.logger.debug(
			`Running "Pega Launchpad" node resource "${resource}" operation "${operation}"`,
		);

		for (let i = 0; i < items.length; i++) {
			try {
				// ----------------------------------------
				//              Case
				// ----------------------------------------
				if (resource === 'case') {
					if (operation === 'create') {
						const caseTypeId = this.getNodeParameter('caseTypeId', i) as string;
						const processId = this.getNodeParameter('processId', i) as string;
						const content = this.getNodeParameter('content', i) as string;

						let parsedContent: IDataObject = {};
						if (content) {
							try {
								parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON in Case Content: ${(error as Error).message}`,
									{ itemIndex: i },
								);
							}
						}

						const body: IDataObject = {
							caseTypeID: caseTypeId,
							processID: processId,
							content: parsedContent,
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/cases',
							body,
						);
						this.logger.debug(
							`Successfully created case with ID: ${(responseData.body.ID as string) || 'unknown'}`,
						);
					} else if (operation === 'get') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const lookupDataPage = this.getNodeParameter('lookupDataPage', i) as string;

						const body: IDataObject = {
							dataViewParameters: {
								ID: caseId,
							},
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							`/dx/api/application/v2/data_views/${lookupDataPage}`,
							body,
						);
						this.logger.debug(`Successfully retrieved case: ${caseId}`);
					} else if (operation === 'getMany') {
						const dataPageId = this.getNodeParameter('dataPageId', i) as string;
						const limit = this.getNodeParameter('limit', i) as number;
						const fieldsCollection = this.getNodeParameter('fields', i) as IDataObject;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const selectFields: Array<{ field: string }> = [];
						if (fieldsCollection.fieldValues && Array.isArray(fieldsCollection.fieldValues)) {
							for (const fieldValue of fieldsCollection.fieldValues as IDataObject[]) {
								const field = fieldValue.field as string;
								if (field) {
									selectFields.push({ field });
								}
							}
						}

						if (selectFields.length === 0) {
							selectFields.push(
								{ field: 'Name' },
								{ field: 'Status' },
								{ field: 'BusinessID' },
								{ field: 'Description' },
								{ field: 'ID' },
								{ field: '@class' },
							);
						}

						const body: IDataObject = {
							query: {
								select: selectFields,
								distinctResultsOnly:
									additionalFields.distinctResultsOnly !== undefined
										? additionalFields.distinctResultsOnly
										: true,
							},
							paging: {
								pageNumber: (additionalFields.pageNumber as number) || 1,
								pageSize: limit,
							},
							useExtendedTimeout: false,
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							`/dx/api/application/v2/data_views/${dataPageId}`,
							body,
						);
						this.logger.debug(`Successfully retrieved case list from data page: ${dataPageId}`);
					} else if (operation === 'getAttachments') {
						const caseId = this.getNodeParameter('caseId', i) as string;

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'GET',
							`/dx/api/application/v2/cases/${caseId}/attachments`,
						);
						this.logger.debug(`Successfully retrieved attachments for case: ${caseId}`);
					} else if (operation === 'getHistory') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const pageSize = this.getNodeParameter('pageSize', i) as number;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const selectFields: Array<{ field: string }> = [];
						if (additionalFields.fields && (additionalFields.fields as IDataObject).fieldValues) {
							const fieldValues = (additionalFields.fields as IDataObject)
								.fieldValues as IDataObject[];
							for (const fieldValue of fieldValues) {
								const field = fieldValue.field as string;
								if (field) {
									selectFields.push({ field });
								}
							}
						}

						if (selectFields.length === 0) {
							selectFields.push(
								{ field: 'CreateDateTime' },
								{ field: 'MessageText' },
								{ field: 'PerformerUserName' },
								{ field: 'ID' },
							);
						}

						const body: IDataObject = {
							dataViewParameters: {
								ObjectID: caseId,
							},
							paging: {
								pageNumber: (additionalFields.pageNumber as number) || 1,
								pageSize,
							},
							query: {
								select: selectFields,
							},
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/data_views/ObjectHistory',
							body,
						);
						this.logger.debug(`Successfully retrieved history for case: ${caseId}`);
					} else if (operation === 'queryCases') {
						const dataPageName = this.getNodeParameter('dataPageName', i) as string;
						const pageSize = this.getNodeParameter('pageSize', i) as number;
						const fieldsCollection = this.getNodeParameter('fields', i) as IDataObject;
						const filter = this.getNodeParameter('filter', i, '{}') as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const selectFields: Array<{ field: string }> = [];
						if (fieldsCollection.fieldValues && Array.isArray(fieldsCollection.fieldValues)) {
							for (const fieldValue of fieldsCollection.fieldValues as IDataObject[]) {
								const field = fieldValue.field as string;
								if (field) {
									selectFields.push({ field });
								}
							}
						}

						if (selectFields.length === 0) {
							selectFields.push(
								{ field: 'Name' },
								{ field: 'Status' },
								{ field: 'BusinessID' },
								{ field: 'Description' },
								{ field: 'ID' },
								{ field: '@class' },
							);
						}

						const query: IDataObject = {
							select: selectFields,
							distinctResultsOnly:
								additionalFields.distinctResultsOnly !== undefined
									? additionalFields.distinctResultsOnly
									: false,
						};

						if (filter && filter !== '{}') {
							let parsedFilter: IDataObject = {};
							try {
								parsedFilter = JSON.parse(filter);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON in filter', {
									itemIndex: i,
								});
							}

							if (parsedFilter.logic && parsedFilter.filterConditions) {
								query.filter = parsedFilter;
							}
						}

						const body: IDataObject = {
							query,
							paging: {
								pageNumber: (additionalFields.pageNumber as number) || 1,
								pageSize,
							},
							useExtendedTimeout: (additionalFields.useExtendedTimeout as boolean) || false,
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							`/dx/api/application/v2/data_views/${dataPageName}`,
							body,
						);
						this.logger.debug(`Successfully queried cases from data page: ${dataPageName}`);
					}
				}

				// ----------------------------------------
				//              Attachment
				// ----------------------------------------
				else if (resource === 'attachment') {
					if (operation === 'get') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'GET',
							`/dx/api/application/v2/attachments/${attachmentId}`,
						);
						this.logger.debug(`Successfully retrieved attachment: ${attachmentId}`);
					} else if (operation === 'delete') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'DELETE',
							`/dx/api/application/v2/attachments/${attachmentId}`,
						);
						this.logger.debug(`Successfully deleted attachment: ${attachmentId}`);
					} else if (operation === 'linkToCase') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const body: IDataObject = {
							attachments: [
								{
									type: (additionalFields.type as string) || 'File',
									category: (additionalFields.category as string) || 'File',
									ID: attachmentId,
								},
							],
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							`/dx/api/application/v2/cases/${caseId}/attachments`,
							body,
						);
						this.logger.debug(`Successfully linked attachment ${attachmentId} to case: ${caseId}`);
					} else if (operation === 'upload') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;
						const appendUniqueIdToFileName =
							additionalFields.appendUniqueIdToFileName !== undefined
								? (additionalFields.appendUniqueIdToFileName as boolean)
								: true;
						const linkToCase =
							additionalFields.linkToCase !== undefined
								? (additionalFields.linkToCase as boolean)
								: true;

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const baseUrl = this.getNodeParameter('baseUrl', 0) as string;
						const cleanBaseUrl = baseUrl.replace(/\/$/, '');
						const url = `${cleanBaseUrl}/dx/api/application/v2/attachments/upload`;

						const formData = {
							appendUniqueIdToFileName: String(appendUniqueIdToFileName),
							contextID: caseId,
							file: {
								value: binaryDataBuffer,
								options: {
									filename: binaryData.fileName || 'file',
									contentType: binaryData.mimeType || 'application/octet-stream',
								},
							},
						};

						const options = {
							method: 'POST' as const,
							url,
							formData,
							headers: {
								Accept: 'application/json',
							},
							json: true,
							resolveWithFullResponse: true,
						};

						this.logger.debug(`Uploading file: ${binaryData.fileName} to case: ${caseId}`);
						const uploadFullResponse = (await this.helpers.requestOAuth2.call(
							this,
							'pegaOAuth2Api',
							options,
						)) as IDataObject;

						// requestOAuth2 with json:true + resolveWithFullResponse:true
						// wraps the response as { body, headers, statusCode }.
						// However, if the body was already parsed, body itself contains
						// the Pega payload ({ ID: "..." }).  If the wrapper was skipped
						// (some n8n versions) the top-level object IS the parsed body.
						let uploadBody: IDataObject;
						if (
							uploadFullResponse.body !== undefined &&
							typeof uploadFullResponse.body === 'object' &&
							!Array.isArray(uploadFullResponse.body)
						) {
							uploadBody = uploadFullResponse.body as IDataObject;
						} else if (typeof uploadFullResponse.body === 'string') {
							try {
								uploadBody = JSON.parse(
									uploadFullResponse.body as unknown as string,
								) as IDataObject;
							} catch {
								uploadBody = { rawBody: uploadFullResponse.body } as IDataObject;
							}
						} else if (uploadFullResponse.ID) {
							// resolveWithFullResponse was ignored — we got the parsed body directly
							uploadBody = uploadFullResponse;
						} else {
							// Fallback: treat the whole response as the body
							uploadBody = uploadFullResponse;
						}

						// Extract only plain header values to avoid circular references
						// (Node.js HTTP agent/socket objects) that cause JSON serialisation errors.
						const rawUploadHeaders = (uploadFullResponse.headers ?? {}) as Record<string, unknown>;
						const uploadHeaders: IDataObject = {};
						for (const [key, value] of Object.entries(rawUploadHeaders)) {
							if (
								typeof value === 'string' ||
								typeof value === 'number' ||
								typeof value === 'boolean'
							) {
								uploadHeaders[key] = value;
							} else if (Array.isArray(value)) {
								uploadHeaders[key] = value.join(', ');
							}
						}

						this.logger.debug(
							`Successfully uploaded attachment: ${binaryData.fileName} to case: ${caseId}`,
						);

						// Step 2: Link the uploaded attachment to the case
						if (linkToCase && uploadBody.ID) {
							const attachmentType = (additionalFields.type as string) || 'File';
							const attachmentCategory = (additionalFields.category as string) || 'File';

							const linkBody: IDataObject = {
								attachments: [
									{
										type: attachmentType,
										category: attachmentCategory,
										ID: uploadBody.ID,
									},
								],
							};

							try {
								const linkResponse = await pegaLaunchpadApiRequest.call(
									this,
									'POST',
									`/dx/api/application/v2/cases/${caseId}/attachments`,
									linkBody,
								);

								// Return combined response with both upload and link results
								responseData = {
									body: {
										...uploadBody,
										linkedToCase: true,
										linkResponse: linkResponse.body,
									},
									headers: uploadHeaders,
								};
							} catch (linkError) {
								// Even if linking fails, still return the upload result
								responseData = {
									body: {
										...uploadBody,
										linkedToCase: false,
										linkError: (linkError as Error).message,
									},
									headers: uploadHeaders,
								};
							}
						} else {
							responseData = {
								body: uploadBody,
								headers: uploadHeaders,
							};
						}
					}
				}

				// ----------------------------------------
				//              Pulse
				// ----------------------------------------
				else if (resource === 'pulse') {
					if (operation === 'add') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const body: IDataObject = {
							message,
							context: caseId,
							parentMessageId: (additionalFields.parentMessageId as string) || '',
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/messages',
							body,
						);
						this.logger.debug(`Successfully added pulse message to case: ${caseId}`);
					} else if (operation === 'get') {
						const caseId = this.getNodeParameter('caseId', i) as string;

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'GET',
							`/dx/api/application/v2/feeds/pyCaseFeed?filterFor=${caseId}`,
						);
						this.logger.debug(`Successfully retrieved pulse for case: ${caseId}`);
					} else if (operation === 'reply') {
						const caseId = this.getNodeParameter('caseId', i) as string;
						const parentMessageId = this.getNodeParameter('parentMessageId', i) as string;
						const message = this.getNodeParameter('message', i) as string;

						const body: IDataObject = {
							message,
							context: caseId,
							parentMessageId,
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/messages',
							body,
						);
						this.logger.debug(
							`Successfully replied to pulse message: ${parentMessageId} in case: ${caseId}`,
						);
					}
				}

				// ----------------------------------------
				//              Assignment
				// ----------------------------------------
				else if (resource === 'assignment') {
					if (operation === 'get') {
						const assignmentId = this.getNodeParameter('assignmentId', i) as string;

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'GET',
							`/dx/api/application/v2/assignments/${assignmentId}`,
						);
						this.logger.debug(`Successfully retrieved assignment: ${assignmentId}`);
					} else if (operation === 'performAction') {
						const assignmentId = this.getNodeParameter('assignmentId', i) as string;
						const actionName = this.getNodeParameter('actionName', i) as string;
						const ifMatch = normalizeETagForIfMatch(this.getNodeParameter('ifMatch', i) as string);
						const content = this.getNodeParameter('content', i) as string;
						const outcome = this.getNodeParameter('outcome', i, '') as string;

						let parsedContent: IDataObject = {};
						if (content) {
							try {
								parsedContent = JSON.parse(content);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON in content field', {
									itemIndex: i,
								});
							}
						}

						const body: IDataObject = {
							content: parsedContent,
							pageInstructions: [],
						};

						let endpoint = `/dx/api/application/v2/assignments/${assignmentId}/actions/${actionName}`;
						if (outcome) {
							endpoint += `?outcome=${outcome}`;
						}

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'PATCH',
							endpoint,
							body,
							{},
							{
								headers: {
									'If-Match': ifMatch,
								},
							},
						);
						this.logger.debug(
							`Successfully performed action ${actionName} on assignment: ${assignmentId}`,
						);
					}
				}

				// ----------------------------------------
				//              User
				// ----------------------------------------
				else if (resource === 'user') {
					if (operation === 'createPersona') {
						const personaId = this.getNodeParameter('personaId', i) as string;
						const content = this.getNodeParameter('content', i, '{}') as string;

						let parsedContent: IDataObject = {};
						if (content) {
							try {
								parsedContent = JSON.parse(content);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON in content field', {
									itemIndex: i,
								});
							}
						}

						const body: IDataObject = {
							objectTypeID: personaId,
							content: parsedContent,
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/objects',
							body,
						);
						this.logger.debug(`Successfully created persona: ${personaId}`);
					} else if (operation === 'getMany') {
						const dataPageName = this.getNodeParameter('dataPageName', i) as string;
						const limit = this.getNodeParameter('limit', i) as number;
						const fieldsCollection = this.getNodeParameter('fields', i) as IDataObject;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const selectFields: Array<{ field: string }> = [];
						if (fieldsCollection.fieldValues && Array.isArray(fieldsCollection.fieldValues)) {
							for (const fieldValue of fieldsCollection.fieldValues as IDataObject[]) {
								const field = fieldValue.field as string;
								if (field) {
									selectFields.push({ field });
								}
							}
						}

						if (selectFields.length === 0) {
							selectFields.push(
								{ field: 'BusinessID' },
								{ field: 'Name' },
								{ field: 'Status' },
								{ field: 'Description' },
								{ field: 'ID' },
								{ field: '@class' },
							);
						}

						const body: IDataObject = {
							dataViewParameters: {},
							paging: {
								pageNumber: (additionalFields.pageNumber as number) || 1,
								pageSize: limit,
							},
							query: {
								select: selectFields,
							},
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							`/dx/api/application/v2/data_views/${dataPageName}`,
							body,
						);
						this.logger.debug(`Successfully retrieved users from data page: ${dataPageName}`);
					} else if (operation === 'markAsActive') {
						const objectId = this.getNodeParameter('objectId', i) as string;
						const ifMatch = normalizeETagForIfMatch(this.getNodeParameter('ifMatch', i) as string);
						const reason = this.getNodeParameter('reason', i) as string;

						const body: IDataObject = {
							content: {
								ReasonForStatusUpdate: reason,
							},
							pageInstructions: [],
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'PATCH',
							`/dx/api/application/v2/objects/${objectId}/actions/MarkAsActive`,
							body,
							{},
							{
								headers: {
									'If-Match': ifMatch,
								},
							},
						);
						this.logger.debug(`Successfully marked user as active: ${objectId}`);
					} else if (operation === 'markAsInactive') {
						const objectId = this.getNodeParameter('objectId', i) as string;
						const ifMatch = normalizeETagForIfMatch(this.getNodeParameter('ifMatch', i) as string);
						const reason = this.getNodeParameter('reason', i) as string;

						const body: IDataObject = {
							content: {
								ReasonForStatusUpdate: reason,
							},
							pageInstructions: [],
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'PATCH',
							`/dx/api/application/v2/objects/${objectId}/actions/MarkAsInactive`,
							body,
							{},
							{
								headers: {
									'If-Match': ifMatch,
								},
							},
						);
						this.logger.debug(`Successfully marked user as inactive: ${objectId}`);
					}
				}

				// ----------------------------------------
				//              Agent
				// ----------------------------------------
				else if (resource === 'agent') {
					if (operation === 'initiateConversation') {
						const agentName = this.getNodeParameter('agentName', i) as string;
						const contextId = this.getNodeParameter('contextId', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const executeStarterQuestion =
							additionalFields.executeStarterQuestion !== undefined
								? (additionalFields.executeStarterQuestion as boolean)
								: false;

						const payload = JSON.stringify({
							contextID: contextId,
							executeStarterQuestion,
						});

						const baseUrl = this.getNodeParameter('baseUrl', 0) as string;
						const cleanBaseUrl = baseUrl.replace(/\/$/, '');
						const url = `${cleanBaseUrl}/dx/api/application/v2/ai-agents/${encodeURIComponent(agentName)}/conversations`;

						const options = {
							method: 'POST' as const,
							url,
							headers: {
								Accept: 'application/json, text/plain, */*',
								'Content-Type': 'application/x-www-form-urlencoded',
							},
							body: payload,
							json: true,
							resolveWithFullResponse: true,
						};

						this.logger.debug(`Initiating agent conversation: ${agentName}`);
						const agentFullResponse = (await this.helpers.requestOAuth2.call(
							this,
							'pegaOAuth2Api',
							options,
						)) as IDataObject;

						// Extract body – same pattern as the upload operation
						let agentBody: IDataObject;
						if (
							agentFullResponse.body !== undefined &&
							typeof agentFullResponse.body === 'object' &&
							!Array.isArray(agentFullResponse.body)
						) {
							agentBody = agentFullResponse.body as IDataObject;
						} else if (typeof agentFullResponse.body === 'string') {
							try {
								agentBody = JSON.parse(agentFullResponse.body as unknown as string) as IDataObject;
							} catch {
								agentBody = { rawBody: agentFullResponse.body } as IDataObject;
							}
						} else if (agentFullResponse.conversationID || agentFullResponse.ID) {
							// resolveWithFullResponse was ignored – got parsed body directly
							agentBody = agentFullResponse;
						} else {
							agentBody = agentFullResponse;
						}

						// Extract safe headers
						const rawAgentHeaders = (agentFullResponse.headers ?? {}) as Record<string, unknown>;
						const agentHeaders: IDataObject = {};
						for (const [key, value] of Object.entries(rawAgentHeaders)) {
							if (
								typeof value === 'string' ||
								typeof value === 'number' ||
								typeof value === 'boolean'
							) {
								agentHeaders[key] = value;
							} else if (Array.isArray(value)) {
								agentHeaders[key] = value.join(', ');
							}
						}

						responseData = {
							body: agentBody,
							headers: agentHeaders,
						};

						this.logger.debug(`Successfully initiated agent conversation: ${agentName}`);
					} else if (operation === 'sendMessage') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const request = this.getNodeParameter('request', i) as string;

						const payload = JSON.stringify({ request });

						const baseUrl = this.getNodeParameter('baseUrl', 0) as string;
						const cleanBaseUrl = baseUrl.replace(/\/$/, '');
						const url = `${cleanBaseUrl}/dx/api/application/v2/ai-agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`;

						const options = {
							method: 'PATCH' as const,
							url,
							headers: {
								Accept: 'application/json, text/plain, */*',
								'Content-Type': 'application/x-www-form-urlencoded',
							},
							body: payload,
							json: true,
							resolveWithFullResponse: true,
						};

						this.logger.debug(
							`Sending message to agent ${agentId}, conversation ${conversationId}`,
						);
						const msgFullResponse = (await this.helpers.requestOAuth2.call(
							this,
							'pegaOAuth2Api',
							options,
						)) as IDataObject;

						// Extract body safely
						let msgBody: IDataObject;
						if (
							msgFullResponse.body !== undefined &&
							typeof msgFullResponse.body === 'object' &&
							!Array.isArray(msgFullResponse.body)
						) {
							msgBody = msgFullResponse.body as IDataObject;
						} else if (typeof msgFullResponse.body === 'string') {
							try {
								msgBody = JSON.parse(msgFullResponse.body as unknown as string) as IDataObject;
							} catch {
								msgBody = { rawBody: msgFullResponse.body } as IDataObject;
							}
						} else {
							msgBody = msgFullResponse;
						}

						// Extract safe headers
						const rawMsgHeaders = (msgFullResponse.headers ?? {}) as Record<string, unknown>;
						const msgHeaders: IDataObject = {};
						for (const [key, value] of Object.entries(rawMsgHeaders)) {
							if (
								typeof value === 'string' ||
								typeof value === 'number' ||
								typeof value === 'boolean'
							) {
								msgHeaders[key] = value;
							} else if (Array.isArray(value)) {
								msgHeaders[key] = value.join(', ');
							}
						}

						responseData = {
							body: msgBody,
							headers: msgHeaders,
						};

						this.logger.debug(
							`Successfully sent message to agent ${agentId}, conversation ${conversationId}`,
						);
					} else if (operation === 'getFinalResponse') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;

						const body: IDataObject = {
							dataViewParameters: {
								ConversationID: conversationId,
							},
						};

						responseData = await pegaLaunchpadApiRequest.call(
							this,
							'POST',
							'/dx/api/application/v2/data_views/GetAgentFinalResponse',
							body,
						);
						this.logger.debug(
							`Successfully retrieved final response for conversation: ${conversationId}`,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({
						...responseData!.body,
						responseHeaders: responseData!.headers,
					}),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
