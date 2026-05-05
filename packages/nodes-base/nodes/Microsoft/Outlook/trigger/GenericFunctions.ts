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
		const filters: IDataObject =
			(this.getNodeParameter('filters', {}) as IDataObject | undefined) ?? {};
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

		// parentFolderId is not a filterable property on GET /me/messages (see message
		// resource: https://learn.microsoft.com/en-us/graph/api/resources/message), so
		// folder scoping must use GET /me/mailFolders/{id}/messages per folder instead:
		// https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messages
		const { foldersToInclude: rawFolderIds, ...otherFilters } = filters;
		const folderIds = ((rawFolderIds as string[] | undefined) ?? []).filter((id) => id !== '');

		const filterString = prepareFilterString({ filters: otherFilters });
		if (filterString) {
			qs.$filter = filterString;
		}

		if (this.getMode() !== 'manual') {
			const dateFilter = `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`;
			qs.$filter = qs.$filter ? `${qs.$filter} and ${dateFilter}` : dateFilter;

			const endpoints =
				folderIds.length > 0 ? folderIds.map((id) => `/mailFolders/${id}/messages`) : ['/messages'];

			const results = await Promise.all(
				endpoints.map(
					async (endpoint) =>
						await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, undefined, {
							...qs,
						}),
				),
			);
			responseData = results.flat();
		} else {
			qs.$top = 1;
			const endpoints =
				folderIds.length > 0 ? folderIds.map((id) => `/mailFolders/${id}/messages`) : ['/messages'];

			const results = await Promise.all(
				endpoints.map(
					async (endpoint) =>
						await microsoftApiRequest.call(this, 'GET', endpoint, undefined, { ...qs }),
				),
			);
			responseData = results.flatMap((result) => (result.value as IDataObject[]) ?? []).slice(0, 1);
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
