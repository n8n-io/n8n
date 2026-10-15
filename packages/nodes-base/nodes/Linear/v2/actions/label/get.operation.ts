import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { LABEL_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [LABEL_LOCATOR];

const displayOptions = {
	show: {
		resource: ['label'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const labelId = this.getNodeParameter('labelId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query IssueLabel($labelId: String!) {
			issueLabel(id: $labelId) {
				id
				name
				color
				description
				createdAt
				updatedAt
			}
		}`,
		variables: { labelId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const label = (responseData as { data: { issueLabel: IDataObject } }).data.issueLabel;

	return label;
}
