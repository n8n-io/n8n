import {
	IExecuteFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

export class GoogleCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Calendar',
		name: 'googleCalendar',
		icon: 'file:googlecalendar.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Calendar API',
		defaults: {
			name: 'Google Calendar',
			color: '#3f87f2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
			}
		],
		properties: [

		],
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		return {
			json: {}
		};
	}
}
