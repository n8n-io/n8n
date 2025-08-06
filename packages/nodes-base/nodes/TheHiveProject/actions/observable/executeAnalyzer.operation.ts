import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { observableRLC, observableTypeOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	observableRLC,
	observableTypeOptions,
	{
		displayName: 'Analyzer Names or IDs',
		name: 'analyzers',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsDependsOn: ['observableId.value', 'dataType'],
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
	let responseData: IDataObject = {};

	const observableId = this.getNodeParameter('observableId', i, '', {
		extractValue: true,
	}) as string;

	const analyzers = (this.getNodeParameter('analyzers', i) as string[]).map((analyzer) => {
		const parts = analyzer.split('::');
		return {
			analyzerId: parts[0],
			cortexId: parts[1],
		};
	});
	let response: any;
	let body: IDataObject;

	const qs: IDataObject = {};
	for (const analyzer of analyzers) {
		body = {
			...analyzer,
			artifactId: observableId,
		};
		// execute the analyzer
		response = await theHiveApiRequest.call(
			this,
			'POST',
			'/connector/cortex/job' as string,
			body,
			qs,
		);
		const jobId = response.id;
		qs.name = 'observable-jobs';
		// query the job result (including the report)
		do {
			responseData = await theHiveApiRequest.call(
				this,
				'GET',
				`/connector/cortex/job/${jobId}`,
				body,
				qs,
			);
		} while (responseData.status === 'Waiting' || responseData.status === 'InProgress');
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
