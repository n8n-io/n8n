import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	jiraSoftwareCloudApiRequest,
	jiraSoftwareCloudApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';
import {
	issueOpeations,
	issueFields,
} from './IssueDescription';
import {
	IIssue,
	IFields,
	INotify,
	INotificationRecipients,
	NotificationRecipientsRestrictions,
 } from './IssueInterface';

export class JiraSoftwareCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jira Software Cloud',
		name: 'Jira Software Cloud',
		icon: 'file:jira.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Jira Software Cloud API',
		defaults: {
			name: 'Jira Software Cloud',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jiraSoftwareCloudApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Issue',
						value: 'issue',
						description: 'Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask',
					},
				],
				default: 'issue',
				description: 'Resource to consume.',
			},
			...issueOpeations,
			...issueFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the projects to display them to user so that he can
			// select them easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let projects;
				try {
					projects = await jiraSoftwareCloudApiRequest.call(this, '/project/search', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const project of projects.values) {
					const projectName = project.name;
					const projectId = project.id;

					returnData.push({
						name: projectName,
						value: projectId,
					});
				}
				return returnData;
			},

			// Get all the issue types to display them to user so that he can
			// select them easily
			async getIssueTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let issueTypes;
				try {
					issueTypes = await jiraSoftwareCloudApiRequest.call(this, '/issuetype', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const issueType of issueTypes) {
					const issueTypeName = issueType.name;
					const issueTypeId = issueType.id;

					returnData.push({
						name: issueTypeName,
						value: issueTypeId,
					});
				}
				return returnData;
			},

			// Get all the labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let labels;
				try {
					labels = await jiraSoftwareCloudApiRequest.call(this, '/label', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const label of labels.values) {
					const labelName = label;
					const labelId = label;

					returnData.push({
						name: labelName,
						value: labelId,
					});
				}
				return returnData;
			},

			// Get all the priorities to display them to user so that he can
			// select them easily
			async getPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let priorities;
				try {
					priorities = await jiraSoftwareCloudApiRequest.call(this, '/priority', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const priority of priorities) {
					const priorityName = priority.name;
					const priorityId = priority.id;

					returnData.push({
						name: priorityName,
						value: priorityId,
					});
				}
				return returnData;
			},

			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let users;
				try {
					users = await jiraSoftwareCloudApiRequest.call(this, '/users/search', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const user of users) {
					const userName = user.displayName;
					const userId = user.accountId;

					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},

			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let groups;
				try {
					groups = await jiraSoftwareCloudApiRequest.call(this, '/groups/picker', 'GET');
				} catch (err) {
					throw new Error(`Jira Error: ${err}`);
				}
				for (const group of groups.groups) {
					const groupName = group.name;
					const groupId = group.name;

					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'issue') {
				if (operation === 'create') {
					const summary = this.getNodeParameter('summary', i) as string;
					const projectId = this.getNodeParameter('project', i) as string;
					const issueTypeId = this.getNodeParameter('issueType', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const parentIssueKey = this.getNodeParameter('parentIssueKey', i) as string;
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
					if (additionalFields.priority) {
						fields.priority = {
							id: additionalFields.priority as string,
						};
					}
					if (additionalFields.assignee) {
						fields.assignee = {
							id: additionalFields.assignee as string,
						};
					}
					if (additionalFields.description) {
						fields.description = additionalFields.description as string;
					}
					if (additionalFields.updateHistory) {
						qs.updateHistory = additionalFields.updateHistory as boolean;
					}
					const issueTypes = await jiraSoftwareCloudApiRequest.call(this, '/issuetype', 'GET', body, qs);
					const subtaskIssues = [];
					for (const issueType of issueTypes) {
						if (issueType.subtask) {
							subtaskIssues.push(issueType.id);
						}
					}
					if (!parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						throw new Error('You must define a Parent Issue Key when Issue type is sub-task');

					} else if (parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						fields.parent = {
							key: parentIssueKey.toUpperCase(),
						};
					}
					body.fields = fields;
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, '/issue', 'POST', body);
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'update') {
					const summary = this.getNodeParameter('summary', i) as string;
					const issueTypeId = this.getNodeParameter('issueType', i) as string;
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const parentIssueKey = this.getNodeParameter('parentIssueKey', i) as string;
					const body: IIssue = {};
					const fields: IFields = {
						summary,
						issuetype: {
							id: issueTypeId
						}
					};
					if (additionalFields.labels) {
						fields.labels = additionalFields.labels as string[];
					}
					if (additionalFields.priority) {
						fields.priority = {
							id: additionalFields.priority as string,
						};
					}
					if (additionalFields.assignee) {
						fields.assignee = {
							id: additionalFields.assignee as string,
						};
					}
					if (additionalFields.description) {
						fields.description = additionalFields.description as string;
					}
					const issueTypes = await jiraSoftwareCloudApiRequest.call(this, '/issuetype', 'GET', body);
					const subtaskIssues = [];
					for (const issueType of issueTypes) {
						if (issueType.subtask) {
							subtaskIssues.push(issueType.id);
						}
					}
					if (!parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						throw new Error('You must define a Parent Issue Key when Issue type is sub-task');

					} else if (parentIssueKey && subtaskIssues.includes(issueTypeId)) {
						fields.parent = {
							key: parentIssueKey.toUpperCase(),
						};
					}
					body.fields = fields;
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}`, 'PUT', body);
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'get') {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const fields = this.getNodeParameter('fields', i) as string;
					const fieldsByKey = this.getNodeParameter('fieldsByKey', i) as boolean;
					const expand = this.getNodeParameter('expand', i) as string;
					const properties = this.getNodeParameter('properties', i) as string;
					const updateHistory = this.getNodeParameter('updateHistory', i) as boolean;
					qs.fields = fields;
					qs.fieldsByKey = fieldsByKey;
					qs.expand = expand;
					qs.properties = properties;
					qs.updateHistory = updateHistory;
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}`, 'GET', {}, qs);
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'changelog') {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					try {
						if (returnAll) {
							responseData = await jiraSoftwareCloudApiRequestAllItems.call(this, 'values',`/issue/${issueKey}/changelog`, 'GET');
						} else {
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}/changelog`, 'GET', {}, qs);
							responseData = responseData.values;
						}
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'notify') {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const textBody = this.getNodeParameter('textBody', i) as string;
					const htmlBody = this.getNodeParameter('htmlBody', i) as string;
					const jsonActive = this.getNodeParameter('jsonParameters', 0) as boolean;
					const body: INotify = {};
					body.htmlBody = htmlBody;
					body.textBody = textBody;
					if (!jsonActive) {
						const notificationRecipientsValues = (this.getNodeParameter('notificationRecipientsUi', i) as IDataObject).notificationRecipientsValues as IDataObject[];
						const notificationRecipients: INotificationRecipients = {};
						if (notificationRecipientsValues) {
							// @ts-ignore
							if (notificationRecipientsValues.reporter) {
								// @ts-ignore
								notificationRecipients.reporter = notificationRecipientsValues.reporter as boolean;
							}
							// @ts-ignore
							if (notificationRecipientsValues.assignee) {
								// @ts-ignore
								notificationRecipients.assignee = notificationRecipientsValues.assignee as boolean;
							}
							// @ts-ignore
							if (notificationRecipientsValues.assignee) {
								// @ts-ignore
								notificationRecipients.watchers = notificationRecipientsValues.watchers as boolean;
							}
							// @ts-ignore
							if (notificationRecipientsValues.voters) {
								// @ts-ignore
								notificationRecipients.watchers = notificationRecipientsValues.voters as boolean;
							}
							// @ts-ignore
							if (notificationRecipientsValues.users.length > 0) {
								// @ts-ignore
								notificationRecipients.users = notificationRecipientsValues.users.map(user => {
									return {
										accountId: user
									};
								});
							}
							// @ts-ignore
							if (notificationRecipientsValues.groups.length > 0) {
								// @ts-ignore
								notificationRecipients.groups = notificationRecipientsValues.groups.map(group => {
									return {
										name: group
									};
								});
							}
						}
						body.to = notificationRecipients;
						const notificationRecipientsRestrictionsValues = (this.getNodeParameter('notificationRecipientsRestrictionsUi', i) as IDataObject).notificationRecipientsRestrictionsValues as IDataObject[];
						const notificationRecipientsRestrictions: NotificationRecipientsRestrictions = {};
						if (notificationRecipientsRestrictionsValues) {
							// @ts-ignore
							if (notificationRecipientsRestrictionsValues.groups. length > 0) {
								// @ts-ignore
								notificationRecipientsRestrictions.groups = notificationRecipientsRestrictionsValues.groups.map(group => {
									return {
										name: group
									};
								});
							}
						}
						body.restrict = notificationRecipientsRestrictions;
					} else {
						const notificationRecipientsJson = validateJSON(this.getNodeParameter('notificationRecipientsJson', i) as string);
						if (notificationRecipientsJson) {
							body.to = notificationRecipientsJson;
						}
						const notificationRecipientsRestrictionsJson = validateJSON(this.getNodeParameter('notificationRecipientsRestrictionsJson', i) as string);
						if (notificationRecipientsRestrictionsJson) {
							body.restrict = notificationRecipientsRestrictionsJson;
						}
					}
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}/notify`, 'POST', body, qs);
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'transitions') {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const transitionId = this.getNodeParameter('transitionId', i) as string;
					const expand = this.getNodeParameter('expand', i) as string;
					if (transitionId) {
						qs.transitionId = transitionId;
					}
					if (expand) {
						qs.expand = expand;
					}
					qs.skipRemoteOnlyCondition = this.getNodeParameter('skipRemoteOnlyCondition', i) as boolean;

					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}/transitions`, 'GET', {}, qs);
						responseData = responseData.transitions;
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'delete') {
					const issueKey = this.getNodeParameter('issueKey', i) as string;
					const deleteSubtasks = this.getNodeParameter('deleteSubtasks', i) as boolean;
					qs.deleteSubtasks = deleteSubtasks;
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, `/issue/${issueKey}`, 'DELETE', {}, qs);
					} catch (err) {
						throw new Error(`Jira Error: ${JSON.stringify(err)}`);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
