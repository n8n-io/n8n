import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import { normalizeIdList } from '../../helpers/filterOptions';
import { extractUserRowIds } from '../../helpers/userLocator';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

/**
 * Builds create_update's mentions_list from the Mention Users / Mention
 * Teams options. Users come from a searchable rows collection (or an
 * array/CSV via expressions); teams from a bounded multiOptions dropdown.
 */
export function buildMentionsList(
	userIds: unknown,
	teamIds: unknown,
): Array<{ id: string; type: string }> {
	return [
		...extractUserRowIds(userIds).map((id) => ({ id, type: 'User' })),
		...normalizeIdList(teamIds).map((id) => ({ id, type: 'Team' })),
	];
}

/**
 * Update: Add File — add_file_to_update through the /v2/file multipart
 * endpoint, taking the file from an input binary field.
 */
export async function addFileToUpdate(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const updateId = (this.getNodeParameter('updateId', itemIndex) as string).trim();
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;

	// The update ID is inlined into the mutation (the file endpoint only
	// supports the $file variable) — enforce numeric to keep the query intact.
	if (!/^\d+$/.test(updateId)) {
		throw new NodeOperationError(this.getNode(), 'Update ID must be a number', { itemIndex });
	}

	const binaryMetadata = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const fileBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	const data = await client.uploadFile(
		`mutation ($file: File!) {
			add_file_to_update(update_id: ${updateId}, file: $file) {
				id
				name
				url
				public_url
				file_extension
				file_size
			}
		}`,
		fileBuffer,
		binaryMetadata.fileName ?? 'file',
		binaryMetadata.mimeType ?? 'application/octet-stream',
	);

	return {
		json: (data.add_file_to_update ?? {}) as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

/**
 * Update: Get Many — updates(limit, page) account-wide, or the updates
 * connection of one item. Replies and assets are opt-in (they add
 * complexity cost per update).
 */
export async function getManyUpdates(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const scope = this.getNodeParameter('updatesScope', itemIndex) as string;
	const options = this.getNodeParameter('getUpdatesOptions', itemIndex, {}) as IDataObject;
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const page = (options.page as number) ?? 1;

	const extraFields = [
		options.includeReplies === true
			? 'replies { id body text_body created_at creator { id name } }'
			: '',
		options.includeAssets === true ? 'assets { id name url file_extension }' : '',
	].join('\n');
	const updateFields = `
		id
		body
		text_body
		created_at
		updated_at
		item_id
		creator { id name }
		${extraFields}
	`;

	if (scope === 'account') {
		const data = await client.execute(
			`query ($limit: Int!, $page: Int!) {
				updates(limit: $limit, page: $page) { ${updateFields} }
			}`,
			itemIndex,
			{ limit, page },
		);
		return (data.updates ?? []) as IDataObject[];
	}

	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const data = await client.execute(
		`query ($ids: [ID!], $limit: Int!, $page: Int!) {
			items(ids: $ids) {
				updates(limit: $limit, page: $page) { ${updateFields} }
			}
		}`,
		itemIndex,
		{ ids: [itemId], limit, page },
	);
	return ((data.items ?? []) as Array<{ updates?: IDataObject[] }>)[0]?.updates ?? [];
}

/**
 * Standard user profile, shared by User: Get and User: Get Many. Audited
 * against API 2026-10 (2026-07-19): the deprecated fields are gone from the
 * pinned schema — kind replaces is_admin/is_guest/is_view_only, status
 * replaces enabled/is_pending, photo_url replaces the flat photo_* fields.
 */
