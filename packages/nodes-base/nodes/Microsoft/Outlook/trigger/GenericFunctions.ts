import { NodeApiError } from 'n8n-workflow';
import type { JsonObject, IDataObject, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

import { prepareFilterString, simplifyOutputMessages } from '../v2/helpers/utils';
import { downloadAttachments, microsoftApiRequest } from '../v2/transport';

// Bounds how far one poll reads into a backlog, e.g. after a restart rewinds the
// cursor. The rest is picked up by the next polls.
const MAX_PAGES_PER_FOLDER = 10;

async function getMessagesOldestFirst(
	this: IPollFunctions,
	endpoint: string,
	qs: IDataObject,
	maxPages = MAX_PAGES_PER_FOLDER,
): Promise<{ messages: IDataObject[]; capped: boolean }> {
	const messages: IDataObject[] = [];
	let nextLink: string | undefined;
	for (let page = 0; page < maxPages; page++) {
		// Poll context: 0 is the transport's fallback read, not an item index.
		const response = await microsoftApiRequest.call(
			this,
			'GET',
			endpoint,
			0,
			undefined,
			nextLink ? undefined : { ...qs, $top: 100 }, // nextLink already carries the query
			nextLink,
		);
		messages.push(...((response.value as IDataObject[] | undefined) ?? []));
		nextLink = response['@odata.nextLink'] as string | undefined;
		if (!nextLink) return { messages, capped: false };
	}
	return { messages, capped: true };
}

/**
 * Returns the messages received in the poll window, and the cursor the next poll
 * starts from. The cursor is `pollEndDate` unless a folder had more messages than
 * one poll reads.
 */
export async function getPollResponse(
	this: IPollFunctions,
	pollStartDate: string,
	pollEndDate: string,
): Promise<{ items: INodeExecutionData[]; cursor: string }> {
	let responseData;
	let cursor = pollEndDate;
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

		// A scheduled poll reads receivedDateTime to place its cursor.
		const addReceivedDateTime =
			!!qs.$select &&
			this.getMode() !== 'manual' &&
			!String(qs.$select).split(',').includes('receivedDateTime');
		if (addReceivedDateTime) {
			qs.$select = `${qs.$select},receivedDateTime`;
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
			// Oldest first, so a capped poll can resume where it stopped. Graph needs the
			// ordered property first in $filter when both are set.
			const inWindow = (from: string, to: string) => {
				const dateFilter = `receivedDateTime ge ${from} and receivedDateTime lt ${to}`;
				return filterString ? `${dateFilter} and (${filterString})` : dateFilter;
			};
			qs.$filter = inWindow(pollStartDate, pollEndDate);
			qs.$orderby = 'receivedDateTime asc';

			const endpoints =
				folderIds.length > 0 ? folderIds.map((id) => `/mailFolders/${id}/messages`) : ['/messages'];

			const results = await Promise.all(
				endpoints.map(async (endpoint) => await getMessagesOldestFirst.call(this, endpoint, qs)),
			);
			const receivedAt = (message: IDataObject) => Date.parse(message.receivedDateTime as string);
			const lastAt = (result: { messages: IDataObject[] }) =>
				result.messages.length > 0 ? receivedAt(result.messages[result.messages.length - 1]) : NaN;
			responseData = results.flatMap((result) => result.messages);

			// Each capped folder stopped at its last fetched message. Emit only what is older
			// than the earliest of those, so no folder skips messages it did not read yet.
			const cappedAt = results
				.filter((result) => result.capped)
				.map(lastAt)
				.filter(Number.isFinite);
			if (cappedAt.length > 0) {
				const boundary = Math.min(...cappedAt);
				let limit = boundary;
				if (!responseData.some((message) => receivedAt(message) < boundary)) {
					// A whole capped read shares one second, and Graph has no order inside a
					// second to resume from. Read that second in full instead of skipping it.
					// The query never reaches past pollEndDate, so neither may the cursor.
					limit = Math.min(boundary + 1000, Date.parse(pollEndDate));
					const second = {
						...qs,
						$filter: inWindow(new Date(boundary).toISOString(), new Date(limit).toISOString()),
					};
					const rereads = await Promise.all(
						endpoints
							.filter((_, i) => results[i].capped && lastAt(results[i]) === boundary)
							.map(
								async (endpoint) =>
									await getMessagesOldestFirst.call(this, endpoint, second, Infinity),
							),
					);
					const seen = new Set(responseData.map((message) => message.id));
					for (const message of rereads.flatMap((result) => result.messages)) {
						if (!seen.has(message.id)) responseData.push(message);
						seen.add(message.id);
					}
				}
				responseData = responseData.filter((message) => receivedAt(message) < limit);
				cursor = new Date(limit).toISOString();
			}
			responseData.sort((a, b) => receivedAt(a) - receivedAt(b));

			if (addReceivedDateTime && output === 'fields') {
				responseData = responseData.map(({ receivedDateTime, ...message }) => message);
			}
		} else {
			qs.$top = 1;
			// Graph does not guarantee any ordering without $orderby, so request the
			// newest message explicitly. When $orderby is combined with $filter, Graph
			// requires the ordered property to appear first in the filter, so prepend
			// an always-true receivedDateTime clause when user filters are set.
			qs.$orderby = 'receivedDateTime desc';
			if (qs.$filter) {
				// Parentheses keep user `or` filters from mixing with the date clause.
				qs.$filter = `receivedDateTime ge 1900-01-01T00:00:00Z and (${qs.$filter})`;
			}
			const endpoints =
				folderIds.length > 0 ? folderIds.map((id) => `/mailFolders/${id}/messages`) : ['/messages'];

			const results = await Promise.all(
				endpoints.map(
					async (endpoint) =>
						// Poll context: 0 is the transport's fallback read, not an item index.
						await microsoftApiRequest.call(this, 'GET', endpoint, 0, undefined, { ...qs }),
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
			// Poll context: 0 is the transport's fallback read, not an item index.
			executionData = await downloadAttachments.call(
				this,
				responseData as IDataObject[],
				prefix,
				0,
			);
		} else {
			executionData = this.helpers.returnJsonArray(responseData as IDataObject[]);
		}

		return { items: executionData, cursor };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error.message,
			description: error.description,
		});
	}
}
