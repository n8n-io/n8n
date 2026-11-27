import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	dropdownSettingsToInputRows,
	placeStatusLabelRow,
	STATUS_COLOR_OPTIONS,
	type StatusLabelPosition,
	statusSettingsToInputRows,
} from '../../helpers/columnDefaults';
import { LABEL_UPDATE_MUTATIONS, readLabelColumn } from '../../helpers/columnEdit';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { labelColumnIdProperty, labelColumnKindProperty } from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	labelColumnKindProperty,
	labelColumnIdProperty,
	{
		displayName: 'Label Name or ID',
		name: 'existingLabelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getColumnLabels',
			loadOptionsDependsOn: ['boardId.value', 'labelColumnKind', 'labelColumnId'],
		},
		default: '',
		required: true,
		description:
			'The label to modify (by its label ID). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Changes',
		name: 'labelChanges',
		type: 'collection',
		placeholder: 'Add change',
		default: {},
		description: 'What to change on the label. Anything not set keeps its current value.',
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: STATUS_COLOR_OPTIONS,
				default: 'working_orange',
				description: 'The new color (status columns only)',
				displayOptions: { show: { '/labelColumnKind': ['status'] } },
			},
			{
				displayName: 'Counts as Done',
				name: 'isDone',
				type: 'boolean',
				default: false,
				description:
					'Whether items with this label count as done (status columns only, e.g. for battery views)',
				displayOptions: { show: { '/labelColumnKind': ['status'] } },
			},
			{
				displayName: 'Deactivated',
				name: 'isDeactivated',
				type: 'boolean',
				default: false,
				description:
					'Whether the label is deactivated. Deactivating hides it from pickers — this is how labels are "deleted"; setting it back to false reactivates the label.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new label description (status columns only)',
				displayOptions: { show: { '/labelColumnKind': ['status'] } },
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				description:
					'The new label text. Existing item values follow the rename (labels are tracked by ID).',
			},
			{
				displayName: 'Position',
				name: 'labelPosition',
				type: 'options',
				options: [
					{ name: 'After Label', value: 'after' },
					{ name: 'At Beginning', value: 'first' },
					{ name: 'At End', value: 'last' },
					{ name: 'Before Label', value: 'before' },
				],
				default: 'last',
				description: 'Where to move the label in the column’s label order (status columns only)',
				displayOptions: { show: { '/labelColumnKind': ['status'] } },
			},
			{
				// Prefix keeps it next to Position; suffixing "Name or ID" would break that.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Position: Relative To Label',
				name: 'positionLabelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getColumnLabels',
					loadOptionsDependsOn: ['boardId.value', 'labelColumnKind', 'labelColumnId'],
				},
				default: '',
				description:
					'The existing label this label is moved before or after (used with Position "After Label" / "Before Label"). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: { '/labelColumnKind': ['status'], labelPosition: ['after', 'before'] },
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['updateColumnLabel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Column: Update Label — modifies one label (by id) of a status/dropdown
 * column: rename, recolor, description, counts-as-done, or (de)activation.
 * Unchanged labels are re-sent as-is; only the set fields change.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const labelId = Number(this.getNodeParameter('existingLabelId', itemIndex));
	const changes = this.getNodeParameter('labelChanges', itemIndex, {}) as IDataObject;
	if (Object.keys(changes).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Add at least one change to apply to the label', {
			itemIndex,
		});
	}

	const { columnId, kind, revision, labels } = await readLabelColumn.call(
		this,
		client,
		itemIndex,
		boardId,
	);

	if (!labels.some((label) => label.id === labelId)) {
		throw new NodeOperationError(
			this.getNode(),
			`Label with ID ${labelId} was not found on column "${columnId}"`,
			{ itemIndex },
		);
	}

	let rows = (
		kind === 'status' ? statusSettingsToInputRows(labels) : dropdownSettingsToInputRows(labels)
	).map((row) => {
		if (row.id !== labelId) return row;
		const updated = { ...row };
		if (typeof changes.newName === 'string' && changes.newName.trim() !== '') {
			updated.label = (changes.newName as string).trim();
		}
		if (changes.isDeactivated !== undefined) updated.is_deactivated = changes.isDeactivated;
		if (kind === 'status') {
			if (changes.color) updated.color = changes.color;
			if (changes.description !== undefined) updated.description = changes.description;
			if (changes.isDone !== undefined) updated.is_done = changes.isDone;
		}
		return updated;
	});

	if (kind === 'status' && changes.labelPosition) {
		const target = rows.find((row) => row.id === labelId) as IDataObject;
		const placed = placeStatusLabelRow(
			rows.filter((row) => row.id !== labelId),
			target,
			changes.labelPosition as StatusLabelPosition,
			changes.positionLabelId ? Number(changes.positionLabelId) : undefined,
		);
		if (placed === 'missing-anchor') {
			throw new NodeOperationError(
				this.getNode(),
				'Select the label this label should be moved before or after (Position: Relative To Label) — it must exist on the column and cannot be the moved label itself',
				{ itemIndex },
			);
		}
		rows = placed;
	}

	const data = await client.execute(LABEL_UPDATE_MUTATIONS[kind], itemIndex, {
		boardId,
		columnId,
		revision,
		labels: rows,
	});
	return (data.update_status_column ?? data.update_dropdown_column ?? {}) as IDataObject;
}
