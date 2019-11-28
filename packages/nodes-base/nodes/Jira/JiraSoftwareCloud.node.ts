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
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		let qs: IDataObject = {};
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'issue') {
				if (operation === 'create') {
					const summary = this.getNodeParameter('summary', i) as string;
					const projectId = this.getNodeParameter('project', i) as string;
					const issueTypeId = this.getNodeParameter('issueType', i) as string;
					const hasParentIssue = this.getNodeParameter('hasParentIssue', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
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
					if (hasParentIssue) {
						const parentIssueKey = this.getNodeParameter('parentIssueKey', i) as string;
						if (!parentIssueKey && issueTypeId === 'sub-task') {
							throw new Error('You must define a Parent Issue Key when Issue type is sub-task');

						} else if (parentIssueKey && issueTypeId === 'sub-task') {
							fields.parent = {
								key: parentIssueKey,
							};
						}
					}
					body.fields = fields;
					try {
						responseData = await jiraSoftwareCloudApiRequest.call(this, '/issue', 'POST', body);
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
