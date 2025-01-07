import { NodeApiError } from 'n8n-workflow';
import type { JsonObject, IDataObject, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

import { prepareFilterString, simplifyOutputMessages } from '../v2/helpers/utils';
import {
	downloadAttachments,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from '../v2/transport';

export async function getPollResponse(
	this: IPollFunctions,
	pollStartDate: string,
	pollEndDate: string,
) {
	let responseData;
	const qs = {} as IDataObject;
	try {
		const filters = this.getNodeParameter('filters', {}) as IDataObject;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const output = this.getNodeParameter('output') as string;
		if (output === 'fields') {
			const fields = this.getNodeParameter('fields') as string[];

			if (options.downloadAttachments) {
				fields.push('hasAttachments');
			}

			qs.$select = fields.join(',');
		}

		if (output === 'simple') {
			qs.$select =
				'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';
		}

		const filterString = prepareFilterString({ filters });

		if (filterString) {
			qs.$filter = filterString;
		}

		const endpoint = '/messages';
		if (this.getMode() !== 'manual') {
			if (qs.$filter) {
				qs.$filter = `${qs.$filter} and receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`;
			} else {
				qs.$filter = `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`;
			}
			responseData = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				endpoint,
				undefined,
				qs,
			);
		} else {
			qs.$top = 1;
			responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
			responseData = responseData.value;
		}

		if (output === 'simple') {
			responseData = simplifyOutputMessages(responseData as IDataObject[]);
		}

		let executionData: INodeExecutionData[] = [];

		if (options.downloadAttachments) {
			const prefix = (options.attachmentsPrefix as string) || 'attachment_';
			executionData = await downloadAttachments.call(this, responseData as IDataObject[], prefix);
		} else {
			executionData = this.helpers.returnJsonArray(responseData as IDataObject[]);
		}

		return executionData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error.message,
			description: error.description,
		});
	}
}
