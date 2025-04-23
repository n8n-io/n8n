/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '../../../../utils/sharedFields';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Call n8n Workflow Tool',
	name: 'toolWorkflow',
	group: ['transform'],
	description: 'Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.',
	defaults: {
		name: 'Call n8n Workflow Tool',
	},
	version: [2, 2.1, 2.2],
	inputs: [],
	outputs: [NodeConnectionTypes.AiTool],
	outputNames: ['Tool'],
	properties: [
		getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
		{
			displayName:
				'See an example of a workflow to suggest meeting slots using AI <a href="/templates/1953" target="_blank">here</a>.',
			name: 'noticeTemplateExample',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: 'e.g. My_Color_Tool',
			validateType: 'string-alphanumeric',
			description:
				'The name of the function to be called, could contain letters, numbers, and underscores only',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lte: 2.1 } }],
				},
			},
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			placeholder:
				'Call this tool to get a random color. The input should be a string with comma separated names of colors to exclude.',
			typeOptions: {
				rows: 3,
			},
		},

		{
			displayName:
				'This tool will call the workflow you define below, and look in the last node for the response. The workflow needs to start with an Execute Workflow trigger',
			name: 'executeNotice',
			type: 'notice',
			default: '',
		},

		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			options: [
				{
					name: 'Database',
					value: 'database',
					description: 'Load the workflow from the database by ID',
				},
				{
					name: 'Define Below',
					value: 'parameter',
					description: 'Pass the JSON code of a workflow',
				},
			],
			default: 'database',
			description: 'Where to get the workflow to execute from',
		},

		// ----------------------------------
		//         source:database
		// ----------------------------------
		{
			displayName: 'Workflow',
			name: 'workflowId',
			type: 'workflowSelector',
			displayOptions: {
				show: {
					source: ['database'],
				},
			},
			default: '',
			required: true,
		},
		// -----------------------------------------------
		//         Resource mapper for workflow inputs
		// -----------------------------------------------
		{
			displayName: 'Workflow Inputs',
			name: 'workflowInputs',
			type: 'resourceMapper',
			noDataExpression: true,
			default: {
				mappingMode: 'defineBelow',
				value: null,
			},
			required: true,
			typeOptions: {
				loadOptionsDependsOn: ['workflowId.value'],
				resourceMapper: {
					localResourceMapperMethod: 'loadSubWorkflowInputs',
					valuesLabel: 'Workflow Inputs',
					mode: 'map',
					fieldWords: {
						singular: 'workflow input',
						plural: 'workflow inputs',
					},
					addAllFields: true,
					multiKeyMatch: false,
					supportAutoMap: false,
				},
			},
			displayOptions: {
				show: {
					source: ['database'],
				},
				hide: {
					workflowId: [''],
				},
			},
		},
		// ----------------------------------
		//         source:parameter
		// ----------------------------------
		{
			displayName: 'Workflow JSON',
			name: 'workflowJson',
			type: 'json',
			typeOptions: {
				rows: 10,
			},
			displayOptions: {
				show: {
					source: ['parameter'],
				},
			},
			default: '\n\n\n\n\n\n\n\n\n',
			required: true,
			description: 'The workflow JSON code to execute',
		},
	],
};
