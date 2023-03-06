import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createConnection } from '../../transport';

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
	const returnData: INodeExecutionData[] = [];
	const _items = this.getInputData();

	const options = this.getNodeParameter('options', 0);

	const queryBatching = (options.queryBatching as string) || 'multiple';

	if (queryBatching === 'multiple') {
	}

	if (queryBatching === 'independently') {
	}

	if (queryBatching === 'transaction') {
	}

	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials, options);

	await connection.end();

	return returnData;
}
