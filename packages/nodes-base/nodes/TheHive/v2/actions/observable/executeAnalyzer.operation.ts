import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { observableDataType } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Observable ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the observable',
	},
	observableDataType,
	{
		displayName: 'Analyzer Names or IDs',
		name: 'analyzers',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsDependsOn: ['id', 'dataType'],
			loadOptionsMethod: 'loadAnalyzers',
		},
		displayOptions: {
			hide: {
				id: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['executeAnalyzer'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData: IDataObject[] = [];

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
