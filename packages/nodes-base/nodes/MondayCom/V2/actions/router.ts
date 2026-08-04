import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import {
	aggregateBoardData,
	changeBoardSubscribers,
	createBoard,
	duplicateBoard,
	getActivityLogs,
	getBoardSubscribers,
	getManyBoards,
	getSingleBoard,
} from './board/board.execute';
import {
	addColumnLabel,
	createColumn,
	formatColumnSchemaRow,
	updateColumn,
	updateColumnLabel,
} from './column/column.execute';
import {
	buildGroupPositionArgs,
	buildUpdateGroupMutation,
	findEdgeGroupId,
} from './group/group.execute';
import {
	archiveOrDeleteManyItems,
	bulkImportItems,
	clearColumnValues,
	createItem,
	createSubitem,
	getBulkImportJobStatus,
	getColumnValue,
	getItem,
	getManyItems,
	moveItem,
	resolveArchiveOrDeleteAction,
	searchAcrossAccount,
	updateItem,
} from './item/item.execute';
import { addFileToUpdate, buildMentionsList, getManyUpdates } from './update/update.execute';
import { SEARCH_OPERATION_ENTITY } from '../helpers/accountSearch';
import { normalizeIdList } from '../helpers/filterOptions';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	// API version is pinned node-wide (constants.ts), not per credential.
	const client = new MondayGraphQLClient(this);

	const operation = this.getNodeParameter('operation', 0) as string;

	// Bulk Import consumes ALL input items into ONE import job (in mapped
	// mode each input item is one CSV row) — run once per execution.
	if (operation === 'bulkImport') {
		try {
			const rows = await bulkImportItems.call(this, client, items.length);
			returnData.push(...rows);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: 0 },
				});
			} else {
				// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
				throw error;
			}
		}
		return [returnData];
	}

	for (let i = 0; i < items.length; i++) {
		try {
			if (operation === 'createItem') {
				const data = await createItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'createSubitem') {
				const data = await createSubitem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'updateItem') {
				const data = await updateItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'clearColumnValues') {
				const rows = await clearColumnValues.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getItem') {
				const data = await getItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getColumnValue') {
				const data = await getColumnValue.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getBulkImportStatus') {
				const rows = await getBulkImportJobStatus.call(this, client, i);
				returnData.push(...rows);
				continue;
			}

			if (operation === 'moveItem') {
				const data = await moveItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'duplicateItem') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const withUpdates = this.getNodeParameter('withUpdates', i, false) as boolean;
				const data = await client.execute(
					`mutation ($boardId: ID!, $itemId: ID!, $withUpdates: Boolean) {
						duplicate_item(board_id: $boardId, item_id: $itemId, with_updates: $withUpdates) {
							id
							name
							url
							state
							board { id name }
							group { id title }
						}
					}`,
					i,
					{ boardId, itemId, withUpdates },
				);
				returnData.push({
					json: (data.duplicate_item ?? {}) as IDataObject,
					pairedItem: { item: i },
				});
				continue;
			}

			// 'archiveItem'/'deleteItem' are the legacy operation values from
			// before the ops were unified — old workflow JSON still runs.
			if (
				operation === 'archiveOrDeleteItem' ||
				operation === 'archiveItem' ||
				operation === 'deleteItem'
			) {
				const action = resolveArchiveOrDeleteAction.call(this, operation, i);
				const itemsMode = this.getNodeParameter('itemsMode', i, 'single') as string;
				if (operation === 'archiveOrDeleteItem' && itemsMode === 'multiple') {
					const rows = await archiveOrDeleteManyItems.call(this, client, i, action);
					for (const row of rows) {
						returnData.push({ json: row, pairedItem: { item: i } });
					}
					continue;
				}
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const mutation =
					action === 'archive'
						? 'mutation ($itemId: ID!) { archive_item(item_id: $itemId) { id name state } }'
						: 'mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id name state } }';
				const data = await client.execute(mutation, i, { itemId });
				const payload = (data.archive_item ?? data.delete_item ?? {}) as IDataObject;
				returnData.push({ json: { ...payload, action }, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'archiveOrDeleteBoard') {
				const action = resolveArchiveOrDeleteAction.call(this, operation, i);
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const mutation =
					action === 'archive'
						? 'mutation ($boardId: ID!) { archive_board(board_id: $boardId) { id name state } }'
						: 'mutation ($boardId: ID!) { delete_board(board_id: $boardId) { id name state } }';
				const data = await client.execute(mutation, i, { boardId });
				const payload = (data.archive_board ?? data.delete_board ?? {}) as IDataObject;
				returnData.push({ json: { ...payload, action }, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'archiveOrDeleteGroup') {
				const action = resolveArchiveOrDeleteAction.call(this, operation, i);
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const groupId = this.getNodeParameter('groupId', i, undefined, {
					extractValue: true,
				}) as string;
				const mutation =
					action === 'archive'
						? `mutation ($boardId: ID!, $groupId: String!) {
								archive_group(board_id: $boardId, group_id: $groupId) { id title archived }
							}`
						: `mutation ($boardId: ID!, $groupId: String!) {
								delete_group(board_id: $boardId, group_id: $groupId) { id title deleted }
							}`;
				const data = await client.execute(mutation, i, { boardId, groupId });
				const payload = (data.archive_group ?? data.delete_group ?? {}) as IDataObject;
				returnData.push({ json: { ...payload, action }, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'duplicateBoard') {
				const data = await duplicateBoard.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'duplicateGroup') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const groupId = this.getNodeParameter('groupId', i, undefined, {
					extractValue: true,
				}) as string;
				const options = this.getNodeParameter('duplicateGroupOptions', i, {}) as IDataObject;
				const position = (options.groupPosition as string) || '';
				const anchorGroupId = (options.positionGroupId as string) || '';
				if ((position === 'after' || position === 'before') && !anchorGroupId) {
					throw new NodeOperationError(
						this.getNode(),
						'Select the group the duplicate should be placed before or after (Position: Relative To Group)',
						{ itemIndex: i },
					);
				}
				const data = await client.execute(
					`mutation ($boardId: ID!, $groupId: String!, $addToTop: Boolean, $groupTitle: String) {
						duplicate_group(
							board_id: $boardId,
							group_id: $groupId,
							add_to_top: $addToTop,
							group_title: $groupTitle
						) {
							id
							title
							color
							position
							archived
						}
					}`,
					i,
					{
						boardId,
						groupId,
						// duplicate_group has no relative positioning; only "top" maps to an
						// argument. The other placements reposition with update_group below.
						addToTop: position === 'top' ? true : null,
						groupTitle: (options.groupTitle as string) || null,
					},
				);
				let group = (data.duplicate_group ?? {}) as IDataObject;
				const newGroupId = group.id as string | undefined;

				if (
					newGroupId &&
					(position === 'after' || position === 'before' || position === 'bottom')
				) {
					let anchor = anchorGroupId;
					if (position === 'bottom') {
						const groupsData = await client.execute(
							`query ($ids: [ID!]) {
								boards(ids: $ids) {
									groups { id position }
								}
							}`,
							i,
							{ ids: [boardId] },
						);
						const boards = (groupsData.boards ?? []) as Array<{
							groups?: Array<{ id: string; position: string }>;
						}>;
						anchor = findEdgeGroupId(boards[0]?.groups ?? [], newGroupId, 'bottom') ?? '';
					}
					if (anchor) {
						const moved = await client.execute(
							`mutation ($boardId: ID!, $groupId: String!, $attribute: GroupAttributes!, $anchor: String!) {
								update_group(
									board_id: $boardId,
									group_id: $groupId,
									group_attribute: $attribute,
									new_value: $anchor
								) {
									id
									title
									color
									position
									archived
								}
							}`,
							i,
							{
								boardId,
								groupId: newGroupId,
								attribute:
									position === 'before' ? 'relative_position_before' : 'relative_position_after',
								anchor,
							},
						);
						group = { ...group, ...((moved.update_group ?? {}) as IDataObject) };
					}
				}

				returnData.push({
					json: group,
					pairedItem: { item: i },
				});
				continue;
			}

			if (operation === 'updateBoardSubscribers') {
				const data = await changeBoardSubscribers.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getBoardSubscribers') {
				const rows = await getBoardSubscribers.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getItemSubscribers') {
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const data = await client.execute(
					`query ($ids: [ID!]) {
						items(ids: $ids) {
							id
							name
							subscribers { id name email }
						}
					}`,
					i,
					{ ids: [itemId] },
				);
				const item = (
					(data.items ?? []) as Array<IDataObject & { subscribers?: IDataObject[] }>
				)[0];
				if (!item) {
					throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, {
						itemIndex: i,
					});
				}
				for (const subscriber of item.subscribers ?? []) {
					returnData.push({
						json: { ...subscriber, itemId: item.id, itemName: item.name },
						pairedItem: { item: i },
					});
				}
				continue;
			}

			if (operation === 'getActivityLogs') {
				const rows = await getActivityLogs.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'aggregateBoardData') {
				const rows = await aggregateBoardData.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getColumns') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const data = await client.execute(
					`query ($ids: [ID!]) {
						boards(ids: $ids) {
							columns {
								id title type description settings_str
								capabilities { calculated { function calculated_type } }
							}
						}
					}`,
					i,
					{ ids: [boardId] },
				);
				const columns =
					((data.boards ?? []) as Array<{ columns?: IDataObject[] }>)[0]?.columns ?? [];
				for (const column of columns) {
					returnData.push({ json: formatColumnSchemaRow(column), pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'updateColumn') {
				const data = await updateColumn.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'deleteColumn') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const columnId = this.getNodeParameter('deleteColumnId', i) as string;
				// API quirk (verified live 2026-07-19): delete_column returns
				// null on success (unknown IDs still error) — echo the inputs
				// so the output row is useful downstream.
				await client.execute(
					`mutation ($boardId: ID!, $columnId: String!) {
						delete_column(board_id: $boardId, column_id: $columnId) { id }
					}`,
					i,
					{ boardId, columnId },
				);
				returnData.push({
					json: { id: columnId, boardId, deleted: true },
					pairedItem: { item: i },
				});
				continue;
			}

			if (operation === 'addColumnLabel') {
				const data = await addColumnLabel.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'updateColumnLabel') {
				const data = await updateColumnLabel.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'addFileToUpdate') {
				const item = await addFileToUpdate.call(this, client, i);
				returnData.push(item);
				continue;
			}

			if (operation === 'createOrGetTag') {
				const tagName = this.getNodeParameter('tagName', i) as string;
				const tagOptions = this.getNodeParameter('tagOptions', i, {}) as IDataObject;
				const data = await client.execute(
					`mutation ($tagName: String, $boardId: ID) {
						create_or_get_tag(tag_name: $tagName, board_id: $boardId) {
							id
							name
							color
						}
					}`,
					i,
					{ tagName, boardId: (tagOptions.boardId as string) || null },
				);
				returnData.push({
					json: (data.create_or_get_tag ?? {}) as IDataObject,
					pairedItem: { item: i },
				});
				continue;
			}

			if (operation === 'createUpdate') {
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const body = this.getNodeParameter('updateBody', i) as string;
				const updateOptions = this.getNodeParameter('createUpdateOptions', i, {}) as IDataObject;
				const parentId = (updateOptions.parentId as string) || null;
				const mentions = buildMentionsList(
					updateOptions.mentionUserIds,
					updateOptions.mentionTeamIds,
				);

				const data = await client.execute(
					`mutation ($itemId: ID!, $body: String!, $parentId: ID, $mentions: [UpdateMention!]) {
						create_update(item_id: $itemId, body: $body, parent_id: $parentId, mentions_list: $mentions) {
							id
							body
							text_body
							created_at
							item_id
							creator { id name }
						}
					}`,
					i,
					{ itemId, body, parentId, mentions: mentions.length > 0 ? mentions : null },
				);
				returnData.push({
					json: (data.create_update ?? {}) as IDataObject,
					pairedItem: { item: i },
				});
				continue;
			}

			// Respond to Agent Mention is Update: Create with the targeting
			// abstracted away: item and parent update come from the mention
			// event data the trigger emitted, not from parameters.

			if (operation === 'getUpdates') {
				const rows = await getManyUpdates.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'createColumn') {
				const data = await createColumn.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'createGroup') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const groupName = this.getNodeParameter('groupName', i) as string;
				const groupOptions = this.getNodeParameter('createGroupOptions', i, {}) as IDataObject;

				const varDefs = ['$boardId: ID!', '$groupName: String!'];
				const args = ['board_id: $boardId', 'group_name: $groupName'];
				const variables: Record<string, unknown> = { boardId, groupName };
				if (groupOptions.groupColor) {
					varDefs.push('$groupColor: String');
					args.push('group_color: $groupColor');
					variables.groupColor = groupOptions.groupColor;
				}
				const positionArgs = buildGroupPositionArgs(
					groupOptions.groupPosition as string,
					groupOptions.positionGroupId as string,
				);
				if (positionArgs === 'missing-anchor') {
					throw new NodeOperationError(
						this.getNode(),
						'Select the group the new group should be placed before or after (Position: Relative To Group)',
						{ itemIndex: i },
					);
				}
				if (positionArgs.method) {
					args.push(`position_relative_method: ${positionArgs.method}`);
				}
				if (positionArgs.relativeTo) {
					varDefs.push('$relativeTo: String');
					args.push('relative_to: $relativeTo');
					variables.relativeTo = positionArgs.relativeTo;
				}

				const data = await client.execute(
					`mutation (${varDefs.join(', ')}) {
						create_group(${args.join(', ')}) {
							id
							title
							color
							position
							archived
						}
					}`,
					i,
					variables,
				);
				returnData.push({
					json: (data.create_group ?? {}) as IDataObject,
					pairedItem: { item: i },
				});
				continue;
			}

			if (operation === 'updateGroup') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const groupId = this.getNodeParameter('groupId', i, undefined, {
					extractValue: true,
				}) as string;
				const fields = this.getNodeParameter('updateGroupFields', i, {}) as IDataObject;
				const newTitle = (fields.newTitle as string) || '';
				const groupColor = (fields.groupColor as string) || '';
				const position = (fields.groupPosition as string) || '';
				const anchorGroupId = (fields.positionGroupId as string) || '';

				if (!newTitle && !groupColor && !position) {
					throw new NodeOperationError(
						this.getNode(),
						'Set at least one field to update (New Title, Color, or Position)',
						{ itemIndex: i },
					);
				}
				if ((position === 'after' || position === 'before') && !anchorGroupId) {
					throw new NodeOperationError(
						this.getNode(),
						'Select the group this group should be moved before or after (Position: Relative To Group)',
						{ itemIndex: i },
					);
				}

				const updates: Parameters<typeof buildUpdateGroupMutation>[0] = [];
				if (newTitle) updates.push({ attribute: 'title', value: newTitle });
				if (groupColor) updates.push({ attribute: 'color', value: groupColor });
				if (position === 'after' || position === 'before') {
					updates.push({
						attribute:
							position === 'before' ? 'relative_position_before' : 'relative_position_after',
						value: anchorGroupId,
					});
				} else if (position === 'top' || position === 'bottom') {
					const groupsData = await client.execute(
						`query ($ids: [ID!]) {
							boards(ids: $ids) {
								groups { id position }
							}
						}`,
						i,
						{ ids: [boardId] },
					);
					const boards = (groupsData.boards ?? []) as Array<{
						groups?: Array<{ id: string; position: string }>;
					}>;
					const anchor = findEdgeGroupId(boards[0]?.groups ?? [], groupId, position);
					// No anchor means this is the board's only group — it's already
					// at both edges, so there is nothing to move.
					if (anchor) {
						updates.push({
							attribute:
								position === 'top' ? 'relative_position_before' : 'relative_position_after',
							value: anchor,
						});
					}
				}

				let group: IDataObject = {};
				if (updates.length > 0) {
					const { query, variables } = buildUpdateGroupMutation(updates);
					const data = await client.execute(query, i, { boardId, groupId, ...variables });
					// Aliases run in order, so merging in order leaves the final state.
					for (let u = 0; u < updates.length; u++) {
						group = { ...group, ...((data[`u${u}`] ?? {}) as IDataObject) };
					}
				} else {
					const data = await client.execute(
						`query ($ids: [ID!], $groupIds: [String]) {
							boards(ids: $ids) {
								groups(ids: $groupIds) {
									id
									title
									color
									position
									archived
								}
							}
						}`,
						i,
						{ ids: [boardId], groupIds: [groupId] },
					);
					const boards = (data.boards ?? []) as Array<{ groups?: IDataObject[] }>;
					group = boards[0]?.groups?.[0] ?? {};
				}
				returnData.push({ json: group, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getGroups') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const groupOptions = this.getNodeParameter('getGroupsOptions', i, {}) as IDataObject;
				const groupIds = normalizeIdList(groupOptions.groupIds);

				const data = await client.execute(
					`query ($boardId: [ID!], $groupIds: [String]) {
						boards(ids: $boardId) {
							groups(ids: $groupIds) {
								id
								title
								color
								position
								archived
							}
						}
					}`,
					i,
					{ boardId: [boardId], groupIds: groupIds.length > 0 ? groupIds : null },
				);
				const groups = ((data.boards ?? []) as Array<{ groups?: IDataObject[] }>)[0]?.groups ?? [];
				for (const group of groups) {
					returnData.push({ json: group, pairedItem: { item: i } });
				}
				continue;
			}

			if (SEARCH_OPERATION_ENTITY[operation] !== undefined) {
				const rows = await searchAcrossAccount.call(this, client, i, operation);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'createBoard') {
				const data = await createBoard.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getBoards') {
				const rows = await getManyBoards.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getItems') {
				const rows = await getManyItems.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getBoard') {
				const board = await getSingleBoard.call(this, client, i);
				returnData.push({ json: board, pairedItem: { item: i } });
				continue;
			}

			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported`,
				{ itemIndex: i },
			);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: i },
				});
				continue;
			}
			// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
			throw error;
		}
	}

	return [returnData];
}
