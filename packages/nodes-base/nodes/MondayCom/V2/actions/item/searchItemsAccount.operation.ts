import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchAcrossAccount } from '../../helpers/accountSearchRequest';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import {
	includeLiveDataProperty,
	searchOptionsProperty,
	searchQueryProperty,
} from '../common.description';

const properties: INodeProperties[] = [
	searchQueryProperty,
	includeLiveDataProperty,
	searchOptionsProperty,
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['searchItemsAccount'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	return await searchAcrossAccount.call(this, client, itemIndex, 'searchItemsAccount');
}
