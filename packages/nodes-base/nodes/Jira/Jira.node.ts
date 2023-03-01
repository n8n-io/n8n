import type { Readable } from 'stream';
import mergeWith from 'lodash.mergewith';

import type { IExecuteFunctions } from 'n8n-core';
import { BINARY_ENCODING } from 'n8n-core';

import type {
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	filterSortSearchListItems,
	jiraSoftwareCloudApiRequest,
	jiraSoftwareCloudApiRequestAllItems,
	simplifyIssueOutput,
	validateJSON,
} from './GenericFunctions';

import { issueAttachmentFields, issueAttachmentOperations } from './IssueAttachmentDescription';

import { issueCommentFields, issueCommentOperations } from './IssueCommentDescription';

import { issueFields, issueOperations } from './IssueDescription';

import type {
	IFields,
	IIssue,
	INotificationRecipients,
	INotify,
	NotificationRecipientsRestrictions,
} from './IssueInterface';

import { userFields, userOperations } from './UserDescription';

export class Jira implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jira Software',
		name: 'jira',
		icon: 'file:jira.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Jira Software API',
		defaults: {
			name: 'Jira Software',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jiraSoftwareCloudApi',
				required: true,
				displayOptions: {
					show: {
						jiraVersion: ['cloud'],
					},
				},
			},
			{
				name: 'jiraSoftwareServerApi',
				required: true,
				displayOptions: {
					show: {
						jiraVersion: ['server'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Jira Version',
				name: 'jiraVersion',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Issue',
						value: 'issue',
						description:
							'Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask',
					},
					{
						name: 'Issue Attachment',
						value: 'issueAttachment',
						description: 'Add, remove, and get an attachment from an issue',
					},
					{
						name: 'Issue Comment',
						value: 'issueComment',
						description: 'Get, create, update, and delete a comment from an issue',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Get, create and delete a user',
					},
				],
				default: 'issue',
			},
			...issueOperations,
			...issueFields,
			...issueAttachmentOperations,
			...issueAttachmentFields,
			...issueCommentOperations,
			...issueCommentFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		listSearch: {
			// Get all the projects to display them to user so that he can
			// select them easily
			async getProjects(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const returnData: INodeListSearchItems[] = [];
				const jiraVersion = this.getCurrentNodeParameter('jiraVersion') as string;
				let endpoint = '';
				let projects;

				if (jiraVersion === 'server') {
					endpoint = '/api/2/project';
					projects = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'GET');
				} else {
					endpoint = '/api/2/project/search';
					projects = await jiraSoftwareCloudApiRequestAllItems.call(
						this,
						'values',
						endpoint,
						'GET',
					);
				}

				if (projects.values && Array.isArray(projects.values)) {
					projects = projects.values;
				}
				for (const project of projects) {
					const projectName = project.name;
					const projectId = project.id;
					returnData.push({
						name: projectName,
						value: projectId,
					});
				}

				return { results: filterSortSearchListItems(returnData, filter) };
			},

			// Get all the issue types to display them to user so that he can
			// select them easily
			async getIssueTypes(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const projectId = this.getCurrentNodeParameter('project', { extractValue: true });
				const returnData: INodeListSearchItems[] = [];
				const { issueTypes } = await jiraSoftwareCloudApiRequest.call(
					this,
					`/api/2/project/${projectId}`,
					'GET',
				);
				for (const issueType of issueTypes) {
					const issueTypeName = issueType.name;
					const issueTypeId = issueType.id;
					returnData.push({
						name: issueTypeName,
						value: issueTypeId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});
				return { results: returnData };
			},

			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const jiraVersion = this.getCurrentNodeParameter('jiraVersion') as string;
				const query: IDataObject = {};
				let endpoint = '/api/2/users/search';

				if (jiraVersion === 'server') {
					endpoint = '/api/2/user/search';
					query.username = "'";
				}

				const users = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'GET', {}, query);
				const returnData: INodeListSearchItems[] = users.reduce(
					(activeUsers: INodeListSearchItems[], user: IDataObject) => {
						if (user.active) {
							activeUsers.push({
								name: user.displayName as string,
								value: (user.accountId ?? user.name) as string,
							});
						}
						return activeUsers;
					},
					[],
				);

				return { results: filterSortSearchListItems(returnData, filter) };
			},

			// Get all the priorities to display them to user so that he can
			// select them easily
			async getPriorities(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const returnData: INodeListSearchItems[] = [];

				const priorities = await jiraSoftwareCloudApiRequest.call(this, '/api/2/priority', 'GET');

				for (const priority of priorities) {
					const priorityName = priority.name;
					const priorityId = priority.id;

					returnData.push({
						name: priorityName,
						value: priorityId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return { results: returnData };
			},

			// Get all the transitions (status) to display them to user so that he can
			// select them easily
			async getTransitions(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const returnData: INodeListSearchItems[] = [];

				const issueKey = this.getCurrentNodeParameter('issueKey');
				const transitions = await jiraSoftwareCloudApiRequest.call(
					this,
					`/api/2/issue/${issueKey}/transitions`,
					'GET',
				);

				for (const transition of transitions.transitions) {
					returnData.push({
						name: transition.name,
						value: transition.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return { results: returnData };
			},

			// Get all the custom fields to display them to user so that he can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const returnData: INodeListSearchItems[] = [];
				const operation = this.getCurrentNodeParameter('operation') as string;
				let projectId: string;
				let issueTypeId: string;
				if (operation === 'create') {
					projectId = this.getCurrentNodeParameter('project', { extractValue: true }) as string;
					issueTypeId = this.getCurrentNodeParameter('issueType', { extractValue: true }) as string;
				} else {
					const issueKey = this.getCurrentNodeParameter('issueKey') as string;
					const res = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}`,
						'GET',
						{},
						{},
					);
					projectId = res.fields.project.id;
					issueTypeId = res.fields.issuetype.id;
				}

				const res = await jiraSoftwareCloudApiRequest.call(
					this,
					`/api/2/issue/createmeta?projectIds=${projectId}&issueTypeIds=${issueTypeId}&expand=projects.issuetypes.fields`,
					'GET',
				);

				const fields = res.projects
					.find((o: any) => o.id === projectId)
					.issuetypes.find((o: any) => o.id === issueTypeId).fields;

				for (const key of Object.keys(fields as IDataObject)) {
					const field = fields[key];
					if (field.schema && Object.keys(field.schema as IDataObject).includes('customId')) {
						returnData.push({
							name: field.name,
							value: field.key || field.fieldId,
						});
					}
				}
				return { results: returnData };
			},
		},
		loadOptions: {
			// Get all the labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const labels = await jiraSoftwareCloudApiRequest.call(this, '/api/2/label', 'GET');

				for (const label of labels.values) {
					const labelName = label;
					const labelId = label;

					returnData.push({
						name: labelName,
						value: labelId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},

			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const jiraVersion = this.getCurrentNodeParameter('jiraVersion') as string;
				const query: IDataObject = {};
				let endpoint = '/api/2/users/search';

				if (jiraVersion === 'server') {
					endpoint = '/api/2/user/search';
					query.username = "'";
				}

				const users = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'GET', {}, query);

				return users
					.reduce((activeUsers: INodePropertyOptions[], user: IDataObject) => {
						if (user.active) {
							activeUsers.push({
								name: user.displayName as string,
								value: (user.accountId || user.name) as string,
							});
						}
						return activeUsers;
					}, [])
					.sort((a: INodePropertyOptions, b: INodePropertyOptions) => {
						return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
					});
			},

			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const groups = await jiraSoftwareCloudApiRequest.call(this, '/api/2/groups/picker', 'GET');

				for (const group of groups.groups) {
					const groupName = group.name;
					const groupId = group.name;

					returnData.push({
						name: groupName,
						value: groupId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},

			// Get all the components to display them to user so that he can
			// select them easily
			async getProjectComponents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const project = this.getCurrentNodeParameter('project', { extractValue: true });
				const { values: components } = await jiraSoftwareCloudApiRequest.call(
					this,
					`/api/2/project/${project}/component`,
					'GET',
				);

				for (const component of components) {
					returnData.push({
						name: component.name,
						value: component.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const jiraVersion = this.getNodeParameter('jiraVersion', 0) as string;

		if (resource === 'issue') {
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-post
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					const summary = this.getNodeParameter('summary', i) as string;
					const projectId = this.getNodeParameter('project', i, '', {
						extractValue: true,
					}) as string;
					const issueTypeId = this.getNodeParameter('issueType', i, '', {
						extractValue: true,
					}) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);

					const assignee = this.getNodeParameter('additionalFields.assignee', i, '', {
						extractValue: true,
					});
					if (assignee) additionalFields.assignee = assignee;

					const reporter = this.getNodeParameter('additionalFields.reporter', i, '', {
						extractValue: true,
					});
					if (reporter) additionalFields.reporter = reporter;

					const priority = this.getNodeParameter('additionalFields.priority', i, '', {
						extractValue: true,
					});
					if (priority) additionalFields.priority = priority;

					const body: IIssue = {};
					const fields: IFields = {
						summary,
						project: {
							id: projectId,
						},
						issuetype: {
							id: issueTypeId,
						},
					};
					if (additionalFields.labels) {
						fields.labels = additionalFields.labels as string[];
					}
					if (additionalFields.serverLabels) {
						fields.labels = additionalFields.serverLabels as string[];
					}
					if (additionalFields.priority) {
						fields.priority = {
							id: additionalFields.priority as string,
						};
					}
					if (additionalFields.assignee) {
						if (jiraVersion === 'server') {
							fields.assignee = {
								name: additionalFields.assignee as string,
							};
						} else {
							fields.assignee = {
								id: additionalFields.assignee as string,
							};
						}
					}
					if (additionalFields.reporter) {
						if (jiraVersion === 'server') {
							fields.reporter = {
								name: additionalFields.reporter as string,
							};
						} else {
							fields.reporter = {
								id: additionalFields.reporter as string,
							};
						}
					}
					if (additionalFields.description) {
						fields.description = additionalFields.description as string;
					}
					if (additionalFields.updateHistory) {
						qs.updateHistory = additionalFields.updateHistory as boolean;
					}
					if (additionalFields.componentIds) {
						fields.components = (additionalFields.componentIds as string[]).map((id) => ({ id }));
					}
					if (additionalFields.customFieldsUi) {
						const customFields = (additionalFields.customFieldsUi as IDataObject)
							.customFieldsValues as IDataObject[];
						if (customFields) {
							// resolve resource locator fieldId value
							customFields.forEach((cf) => {
								if (typeof cf.fieldId !== 'string') {
									cf.fieldId = ((cf.fieldId as IDataObject).value as string).trim();
								}
							});
							const data = customFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
								{},
							);
							Object.assign(fields, data);
						}
					}
					const issueTypes = await jiraSoftwareCloudApiRequest.call(
						this,
						'/api/2/issuetype',
						'GET',
						body,
						qs,
					);
					const subtaskIssues = [];
					for (const issueType of issueTypes) {
						if (issueType.subtask) {
							subtaskIssues.push(issueType.id);
						}
					}
					if (!additionalFields.parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						throw new NodeOperationError(
							this.getNode(),
							'You must define a Parent Issue Key when Issue type is sub-task',
							{ itemIndex: i },
						);
					} else if (additionalFields.parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						fields.parent = {
							key: (additionalFields.parentIssueKey as string).toUpperCase(),
						};
					}
					body.fields = fields;
					responseData = await jiraSoftwareCloudApiRequest.call(this, '/api/2/issue', 'POST', body);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-put
			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i);

					const assignee = this.getNodeParameter('updateFields.assignee', i, '', {
						extractValue: true,
					});
					if (assignee) updateFields.assignee = assignee;

					const reporter = this.getNodeParameter('updateFields.reporter', i, '', {
						extractValue: true,
					});
					if (reporter) updateFields.reporter = reporter;

					const priority = this.getNodeParameter('updateFields.priority', i, '', {
						extractValue: true,
					});
					if (priority) updateFields.priority = priority;

					const statusId = this.getNodeParameter('updateFields.statusId', i, '', {
						extractValue: true,
					});
					if (statusId) updateFields.statusId = statusId;

					const body: IIssue = {};
					const fields: IFields = {};
					if (updateFields.summary) {
						fields.summary = updateFields.summary as string;
					}
					if (updateFields.issueType) {
						fields.issuetype = {
							id: updateFields.issueType as string,
						};
					}
					if (updateFields.labels) {
						fields.labels = updateFields.labels as string[];
					}
					if (updateFields.serverLabels) {
						fields.labels = updateFields.serverLabels as string[];
					}
					if (updateFields.priority) {
						fields.priority = {
							id: updateFields.priority as string,
						};
					}
					if (updateFields.assignee) {
						if (jiraVersion === 'server') {
							fields.assignee = {
								name: updateFields.assignee as string,
							};
						} else {
							fields.assignee = {
								id: updateFields.assignee as string,
							};
						}
					}
					if (updateFields.reporter) {
						if (jiraVersion === 'server') {
							fields.reporter = {
								name: updateFields.reporter as string,
							};
						} else {
							fields.reporter = {
								id: updateFields.reporter as string,
							};
						}
					}
					if (updateFields.description) {
						fields.description = updateFields.description as string;
					}
					if (updateFields.customFieldsUi) {
						const customFields = (updateFields.customFieldsUi as IDataObject)
							.customFieldsValues as IDataObject[];
						if (customFields) {
							// resolve resource locator fieldId value
							customFields.forEach((cf) => {
								if (typeof cf.fieldId !== 'string') {
									cf.fieldId = ((cf.fieldId as IDataObject).value as string).trim();
								}
							});
							const data = customFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
								{},
							);
							Object.assign(fields, data);
						}
					}
					const issueTypes = await jiraSoftwareCloudApiRequest.call(
						this,
						'/api/2/issuetype',
						'GET',
						body,
					);
					const subtaskIssues = [];
					for (const issueType of issueTypes) {
						if (issueType.subtask) {
							subtaskIssues.push(issueType.id);
						}
					}
					if (!updateFields.parentIssueKey && subtaskIssues.includes(updateFields.issueType)) {
						throw new NodeOperationError(
							this.getNode(),
							'You must define a Parent Issue Key when Issue type is sub-task',
							{ itemIndex: i },
						);
					} else if (
						updateFields.parentIssueKey &&
						subtaskIssues.includes(updateFields.issueType)
					) {
						fields.parent = {
							key: (updateFields.parentIssueKey as string).toUpperCase(),
						};
					}
					body.fields = fields;

					if (updateFields.statusId) {
						responseData = await jiraSoftwareCloudApiRequest.call(
							this,
							`/api/2/issue/${issueKey}/transitions`,
							'POST',
							{ transition: { id: updateFields.statusId } },
						);
					}

					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}`,
						'PUT',
						body,
					);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ success: true }),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-get
			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const simplifyOutput = this.getNodeParameter('simplifyOutput', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					if (additionalFields.fields) {
						qs.fields = additionalFields.fields as string;
					}
					if (additionalFields.fieldsByKey) {
						qs.fieldsByKey = additionalFields.fieldsByKey as boolean;
					}
					if (additionalFields.expand) {
						qs.expand = additionalFields.expand as string;
					}
					if (simplifyOutput) {
						qs.expand = `${qs.expand || ''},names`;
					}
					if (additionalFields.properties) {
						qs.properties = additionalFields.properties as string;
					}
					if (additionalFields.updateHistory) {
						qs.updateHistory = additionalFields.updateHistory as string;
					}
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}`,
						'GET',
						{},
						qs,
					);

					if (simplifyOutput) {
						// Use rendered fields if requested and available
						qs.expand = qs.expand || '';
						if (
							(qs.expand as string).toLowerCase().indexOf('renderedfields') !== -1 &&
							responseData.renderedFields &&
							Object.keys(responseData.renderedFields as IDataObject[]).length
						) {
							responseData.fields = mergeWith(
								responseData.fields,
								responseData.renderedFields,
								(a, b) => (b === null ? a : b),
							);
						}
						const executionData = this.helpers.constructExecutionMetaData(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
							this.helpers.returnJsonArray(simplifyIssueOutput(responseData)),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-search-post
			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i);
					const options = this.getNodeParameter('options', i);
					const body: IDataObject = {};
					if (options.fields) {
						body.fields = (options.fields as string).split(',');
					}
					if (options.jql) {
						body.jql = options.jql as string;
					}
					if (options.expand) {
						if (typeof options.expand === 'string') {
							body.expand = options.expand.split(',');
						} else {
							body.expand = options.expand;
						}
					}
					if (returnAll) {
						responseData = await jiraSoftwareCloudApiRequestAllItems.call(
							this,
							'issues',
							'/api/2/search',
							'POST',
							body,
						);
					} else {
						const limit = this.getNodeParameter('limit', i);
						body.maxResults = limit;
						responseData = await jiraSoftwareCloudApiRequest.call(
							this,
							'/api/2/search',
							'POST',
							body,
						);
						responseData = responseData.issues;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-changelog-get
			if (operation === 'changelog') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					if (returnAll) {
						responseData = await jiraSoftwareCloudApiRequestAllItems.call(
							this,
							'values',
							`/api/2/issue/${issueKey}/changelog`,
							'GET',
						);
					} else {
						qs.maxResults = this.getNodeParameter('limit', i);
						responseData = await jiraSoftwareCloudApiRequest.call(
							this,
							`/api/2/issue/${issueKey}/changelog`,
							'GET',
							{},
							qs,
						);
						responseData = responseData.values;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-notify-post
			if (operation === 'notify') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const jsonActive = this.getNodeParameter('jsonParameters', 0);
					const body: INotify = {};
					if (additionalFields.textBody) {
						body.textBody = additionalFields.textBody as string;
					}
					if (additionalFields.htmlBody) {
						body.htmlBody = additionalFields.htmlBody as string;
					}
					if (!jsonActive) {
						const notificationRecipientsValues = (
							this.getNodeParameter('notificationRecipientsUi', i) as IDataObject
						).notificationRecipientsValues as IDataObject;
						const notificationRecipients: INotificationRecipients = {};
						if (notificationRecipientsValues) {
							if (notificationRecipientsValues.reporter) {
								notificationRecipients.reporter = notificationRecipientsValues.reporter as boolean;
							}

							if (notificationRecipientsValues.assignee) {
								notificationRecipients.assignee = notificationRecipientsValues.assignee as boolean;
							}

							if (notificationRecipientsValues.assignee) {
								notificationRecipients.watchers = notificationRecipientsValues.watchers as boolean;
							}

							if (notificationRecipientsValues.voters) {
								notificationRecipients.watchers = notificationRecipientsValues.voters as boolean;
							}

							if (((notificationRecipientsValues.users as IDataObject[]) || []).length > 0) {
								notificationRecipients.users = (
									notificationRecipientsValues.users as IDataObject[]
								).map((user) => {
									return {
										accountId: user,
									};
								});
							}

							if (((notificationRecipientsValues.groups as IDataObject[]) || []).length > 0) {
								notificationRecipients.groups = (
									notificationRecipientsValues.groups as IDataObject[]
								).map((group) => {
									return {
										name: group,
									};
								});
							}
						}
						body.to = notificationRecipients;
						const notificationRecipientsRestrictionsValues = (
							this.getNodeParameter('notificationRecipientsRestrictionsUi', i) as IDataObject
						).notificationRecipientsRestrictionsValues as IDataObject;
						const notificationRecipientsRestrictions: NotificationRecipientsRestrictions = {};
						if (notificationRecipientsRestrictionsValues) {
							if (
								((notificationRecipientsRestrictionsValues.groups as IDataObject[]) || []).length >
								0
							) {
								notificationRecipientsRestrictions.groups = (
									notificationRecipientsRestrictionsValues.groups as IDataObject[]
								).map((group) => {
									return {
										name: group,
									};
								});
							}
						}
						body.restrict = notificationRecipientsRestrictions;
					} else {
						const notificationRecipientsJson = validateJSON(
							this.getNodeParameter('notificationRecipientsJson', i) as string,
						);
						if (notificationRecipientsJson) {
							body.to = notificationRecipientsJson;
						}
						const notificationRecipientsRestrictionsJson = validateJSON(
							this.getNodeParameter('notificationRecipientsRestrictionsJson', i) as string,
						);
						if (notificationRecipientsRestrictionsJson) {
							body.restrict = notificationRecipientsRestrictionsJson;
						}
					}
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}/notify`,
						'POST',
						body,
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-transitions-get
			if (operation === 'transitions') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					if (additionalFields.transitionId) {
						qs.transitionId = additionalFields.transitionId as string;
					}
					if (additionalFields.expand) {
						qs.expand = additionalFields.expand as string;
					}
					if (additionalFields.skipRemoteOnlyCondition) {
						qs.skipRemoteOnlyCondition = additionalFields.skipRemoteOnlyCondition as boolean;
					}
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}/transitions`,
						'GET',
						{},
						qs,
					);
					responseData = responseData.transitions;

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-delete
			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const deleteSubtasks = this.getNodeParameter('deleteSubtasks', i) as boolean;
					qs.deleteSubtasks = deleteSubtasks;
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}`,
						'DELETE',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ success: true }),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
		}
		if (resource === 'issueAttachment') {
			const apiVersion = jiraVersion === 'server' ? '2' : ('3' as string);

			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-issue-issueidorkey-attachments-post
			if (operation === 'add') {
				for (let i = 0; i < length; i++) {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const issueKey = this.getNodeParameter('issueKey', i) as string;

					if (items[i].binary === undefined) {
						throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
							itemIndex: i,
						});
					}
					let uploadData: Buffer | Readable;
					const item = items[i].binary as IBinaryKeyData;
					const binaryData = item[binaryPropertyName];
					if (binaryData === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`Item has no binary property called "${binaryPropertyName}"`,
							{ itemIndex: i },
						);
					}

					if (binaryData.id) {
						uploadData = this.helpers.getBinaryStream(binaryData.id);
					} else {
						uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
					}

					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/issue/${issueKey}/attachments`,
						'POST',
						{},
						{},
						undefined,
						{
							formData: {
								file: {
									value: uploadData,
									options: {
										filename: binaryData.fileName,
									},
								},
							},
						},
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-delete
			if (operation === 'remove') {
				for (let i = 0; i < length; i++) {
					const attachmentId = this.getNodeParameter('attachmentId', i) as string;
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/attachment/${attachmentId}`,
						'DELETE',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ success: true }),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-get
			if (operation === 'get') {
				const download = this.getNodeParameter('download', 0);
				for (let i = 0; i < length; i++) {
					const attachmentId = this.getNodeParameter('attachmentId', i) as string;
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/attachment/${attachmentId}`,
						'GET',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
				if (download) {
					const binaryPropertyName = this.getNodeParameter('binaryProperty', 0);
					for (const [index, attachment] of returnData.entries()) {
						returnData[index].binary = {};

						const buffer = await jiraSoftwareCloudApiRequest.call(
							this,
							'',
							'GET',
							{},
							{},
							attachment?.json.content as string,
							{ json: false, encoding: null, useStream: true },
						);

						(returnData[index].binary as IBinaryKeyData)[binaryPropertyName] =
							await this.helpers.prepareBinaryData(
								buffer as Buffer,
								attachment.json.filename as string,
								attachment.json.mimeType as string,
							);
					}
				}
			}
			if (operation === 'getAll') {
				const download = this.getNodeParameter('download', 0);
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const {
						fields: { attachment },
					} = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/2/issue/${issueKey}`,
						'GET',
						{},
						qs,
					);
					responseData = attachment;
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.slice(0, limit);
					}
					responseData = responseData.map((data: IDataObject) => ({ json: data }));

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
				if (download) {
					const binaryPropertyName = this.getNodeParameter('binaryProperty', 0);
					for (const [index, attachment] of returnData.entries()) {
						returnData[index].binary = {};
						const buffer = await jiraSoftwareCloudApiRequest.call(
							this,
							'',
							'GET',
							{},
							{},
							attachment.json.content as string,
							{ json: false, encoding: null, useStream: true },
						);
						(returnData[index].binary as IBinaryKeyData)[binaryPropertyName] =
							await this.helpers.prepareBinaryData(
								buffer as Buffer,
								attachment.json.filename as string,
								attachment.json.mimeType as string,
							);
					}
				}
			}
		}

		if (resource === 'issueComment') {
			const apiVersion = jiraVersion === 'server' ? '2' : ('3' as string);

			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
			if (operation === 'add') {
				for (let i = 0; i < length; i++) {
					const jsonParameters = this.getNodeParameter('jsonParameters', 0);
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const options = this.getNodeParameter('options', i);
					const body: IDataObject = {};
					if (options.expand) {
						qs.expand = options.expand as string;
						delete options.expand;
					}

					Object.assign(body, options);
					if (!jsonParameters) {
						const comment = this.getNodeParameter('comment', i) as string;
						if (jiraVersion === 'server') {
							Object.assign(body, { body: comment });
						} else {
							Object.assign(body, {
								body: {
									type: 'doc',
									version: 1,
									content: [
										{
											type: 'paragraph',
											content: [
												{
													type: 'text',
													text: comment,
												},
											],
										},
									],
								},
							});
						}
					} else {
						const commentJson = this.getNodeParameter('commentJson', i) as string;
						const json = validateJSON(commentJson);
						if (json === '') {
							throw new NodeOperationError(this.getNode(), 'Document Format must be a valid JSON', {
								itemIndex: i,
							});
						}

						Object.assign(body, { body: json });
					}

					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/issue/${issueKey}/comment`,
						'POST',
						body,
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-get
			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const commentId = this.getNodeParameter('commentId', i) as string;
					const options = this.getNodeParameter('options', i);
					Object.assign(qs, options);
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`,
						'GET',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const options = this.getNodeParameter('options', i);
					const body: IDataObject = {};
					Object.assign(qs, options);
					if (returnAll) {
						responseData = await jiraSoftwareCloudApiRequestAllItems.call(
							this,
							'comments',
							`/api/${apiVersion}/issue/${issueKey}/comment`,
							'GET',
							body,
							qs,
						);
					} else {
						const limit = this.getNodeParameter('limit', i);
						body.maxResults = limit;
						responseData = await jiraSoftwareCloudApiRequest.call(
							this,
							`/api/${apiVersion}/issue/${issueKey}/comment`,
							'GET',
							body,
							qs,
						);
						responseData = responseData.comments;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-delete
			if (operation === 'remove') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const commentId = this.getNodeParameter('commentId', i) as string;
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`,
						'DELETE',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ success: true }),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
			//https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-put
			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const commentId = this.getNodeParameter('commentId', i) as string;
					const options = this.getNodeParameter('options', i);
					const jsonParameters = this.getNodeParameter('jsonParameters', 0);
					const body: IDataObject = {};
					if (options.expand) {
						qs.expand = options.expand as string;
						delete options.expand;
					}
					Object.assign(qs, options);
					if (!jsonParameters) {
						const comment = this.getNodeParameter('comment', i) as string;
						if (jiraVersion === 'server') {
							Object.assign(body, { body: comment });
						} else {
							Object.assign(body, {
								body: {
									type: 'doc',
									version: 1,
									content: [
										{
											type: 'paragraph',
											content: [
												{
													type: 'text',
													text: comment,
												},
											],
										},
									],
								},
							});
						}
					} else {
						const commentJson = this.getNodeParameter('commentJson', i) as string;
						const json = validateJSON(commentJson);
						if (json === '') {
							throw new NodeOperationError(this.getNode(), 'Document Format must be a valid JSON', {
								itemIndex: i,
							});
						}

						Object.assign(body, { body: json });
					}
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`,
						'PUT',
						body,
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'user') {
			const apiVersion = jiraVersion === 'server' ? '2' : ('3' as string);

			if (operation === 'create') {
				// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-post
				for (let i = 0; i < length; i++) {
					const body = {
						name: this.getNodeParameter('username', i),
						emailAddress: this.getNodeParameter('emailAddress', i),
						displayName: this.getNodeParameter('displayName', i),
					};

					const additionalFields = this.getNodeParameter('additionalFields', i);

					Object.assign(body, additionalFields);

					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/user`,
						'POST',
						body,
						{},
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			} else if (operation === 'delete') {
				// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-delete
				for (let i = 0; i < length; i++) {
					qs.accountId = this.getNodeParameter('accountId', i);
					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/user`,
						'DELETE',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ success: true }),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			} else if (operation === 'get') {
				// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
				for (let i = 0; i < length; i++) {
					qs.accountId = this.getNodeParameter('accountId', i);

					const { expand } = this.getNodeParameter('additionalFields', i) as { expand: string[] };

					if (expand) {
						qs.expand = expand.join(',');
					}

					responseData = await jiraSoftwareCloudApiRequest.call(
						this,
						`/api/${apiVersion}/user`,
						'GET',
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
