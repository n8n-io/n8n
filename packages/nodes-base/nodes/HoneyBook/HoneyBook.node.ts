import {IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription} from "n8n-workflow";
import { HoneyBookApi } from "../../credentials/HoneyBookApi.credentials";
import { honeyBookApiRequest } from "./GenericFunctions";

export class HoneyBook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HoneyBook',
		name: 'honeyBook',
		icon: 'file:honeyBook.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume HB API',
		defaults: {
			name: 'HoneyBook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'honeyBookApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create a task',
						value: 'createTask',
						description: 'Create a task',
						action: 'Create a task',
					},
				],
				default: 'createTask',
			},
			{
				displayName: 'Description',
				name: 'taskDescription',
				type: 'string',
				displayOptions: {
					show: {
						action: ['createTask'],
					},
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('action', 0);
		const taskDescription = this.getNodeParameter('taskDescription', 0)
		const nodeStaticData = this.getWorkflowStaticData('global');

		const body: any = {
			resource,
			taskDescription,
			staticData: nodeStaticData,
		};

		const response = await honeyBookApiRequest.call(this,
			'POST',
			`/n8n/trigger_action`,
			body);

		console.log('response',response);

		const myReturnData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray({random_value: 12312312}),
			{ itemData: { item: 0 } },
		);

		return [myReturnData];
	}
}
