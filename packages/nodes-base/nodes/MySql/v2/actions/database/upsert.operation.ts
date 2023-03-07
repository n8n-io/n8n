import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { QueryMode, QueryWithValues } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { runQueries } from '../../helpers/utils';

import { optionsCollection, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [tableRLC, optionsCollection];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['upsert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const _table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;

	const nodeOptions = this.getNodeParameter('options', 0);
	const queryBatching = (nodeOptions.queryBatching as QueryMode) || 'multiple';

	const queries: QueryWithValues[] = [];

	if (queryBatching === 'multiple') {
	} else {
		for (let i = 0; i < items.length; i++) {}
	}

	returnData = await runQueries.call(this, queries, nodeOptions);

	return returnData;
}
