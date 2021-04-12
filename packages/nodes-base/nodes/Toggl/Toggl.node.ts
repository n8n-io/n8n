import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	togglApiRequest,
} from './GenericFunctions';

export class Toggl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toggl',
		name: 'toggl',
		icon: 'file:toggl.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Toggl API',
		defaults: {
			name: 'Toggl',
			color: '#00FF00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'togglApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Time Entry',
						value: 'timeEntry',
					},
				],
				default: 'timeEntry',
				required: true,
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a time entry',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start a time entry',
					},
				],
				default: 'start',
				description: 'The operation to perform.',
			},
		],
	};

	// methods = {
	// 	loadOptions: {
	// 		// Get all the available projects to display them to user so that he can
	// 		// select them easily
	// 		async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];
	// 			const projects = await todoistApiRequest.call(this, 'GET', '/projects');
	// 			for (const project of projects) {
	// 				const projectName = project.name;
	// 				const projectId = project.id;

	// 				returnData.push({
	// 					name: projectName,
	// 					value: projectId,
	// 				});
	// 			}

	// 			return returnData;
	// 		},

	// 		// Get all the available sections in the selected project, to display them
	// 		// to user so that he can select one easily
	// 		async getSections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];

	// 			const projectId = this.getCurrentNodeParameter('project') as number;
	// 			if (projectId) {
	// 				const qs: IDataObject = { project_id: projectId };
	// 				const sections = await todoistApiRequest.call(this, 'GET', '/sections', {}, qs);
	// 				for (const section of sections) {
	// 					const sectionName = section.name;
	// 					const sectionId = section.id;

	// 					returnData.push({
	// 						name: sectionName,
	// 						value: sectionId,
	// 					});
	// 				}
	// 			}

	// 			return returnData;
	// 		},

	// 		// Get all the available labels to display them to user so that he can
	// 		// select them easily
	// 		async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// 			const returnData: INodePropertyOptions[] = [];
	// 			const labels = await todoistApiRequest.call(this, 'GET', '/labels');

	// 			for (const label of labels) {
	// 				const labelName = label.name;
	// 				const labelId = label.id;

	// 				returnData.push({
	// 					name: labelName,
	// 					value: labelId,
	// 				});
	// 			}

	// 			return returnData;
	// 		},
	// 	},
	// };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			if (resource === 'timeEntry') {
				if (operation === 'start') {
					const content = this.getNodeParameter('content', i) as string;
					const projectId = this.getNodeParameter('project', i) as number;
					const labels = this.getNodeParameter('labels', i) as number[];
					const options = this.getNodeParameter('options', i) as IDataObject;
					responseData = await togglApiRequest.call(this, 'POST', '/tasks', {});
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
