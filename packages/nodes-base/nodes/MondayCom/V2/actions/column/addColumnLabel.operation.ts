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
	nextStatusLabelIndex,
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
		displayName: 'Label Name',
		name: 'newLabelName',
		type: 'string',
		default: '',
		required: true,
		description: 'The text of the new label',
	},
	{
		displayName: 'Color',
		name: 'newLabelColor',
		type: 'options',
		options: STATUS_COLOR_OPTIONS,
		default: 'working_orange',
		description: 'The color of the new label, from monday’s status palette',
		displayOptions: { show: { labelColumnKind: ['status'] } },
	},
	{
		displayName: 'Options',
		name: 'addColumnLabelOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { labelColumnKind: ['status'] } },
		options: [
			{
				displayName: 'Counts as Done',
				name: 'isDone',
				type: 'boolean',
				default: false,
				description: 'Whether items with this label count as done (e.g. for battery views)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Optional label description, shown in the status tooltip',
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
				description:
					'Where to place the new label in the column’s label order; left unset, it goes at the end',
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
					'The existing label the new label is placed before or after (used with Position "After Label" / "Before Label"). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { labelPosition: ['after', 'before'] } },
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['addColumnLabel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Column: Add Label — appends one label to a status/dropdown column via the
 * typed update mutations, re-sending all existing labels (with their ids, so
 * they keep their identity) plus the new one.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const labelName = (this.getNodeParameter('newLabelName', itemIndex) as string).trim();
	if (!labelName) {
		throw new NodeOperationError(this.getNode(), 'Label Name must not be empty', { itemIndex });
	}

	const { columnId, kind, revision, labels } = await readLabelColumn.call(
		this,
		client,
		itemIndex,
		boardId,
	);

	let rows: IDataObject[];
	if (kind === 'status') {
		const options = this.getNodeParameter('addColumnLabelOptions', itemIndex, {}) as IDataObject;
		const newRow: IDataObject = {
			label: labelName,
			color: this.getNodeParameter('newLabelColor', itemIndex, 'working_orange') as string,
			index: nextStatusLabelIndex(labels),
		};
		if (options.description) newRow.description = options.description;
		if (options.isDone) newRow.is_done = true;
		const position = (options.labelPosition as StatusLabelPosition) || 'last';
		if (position === 'last') {
			// Plain append — existing labels keep their exact indexes.
			rows = [...statusSettingsToInputRows(labels), newRow];
		} else {
			const placed = placeStatusLabelRow(
				statusSettingsToInputRows(labels),
				newRow,
				position,
				options.positionLabelId ? Number(options.positionLabelId) : undefined,
			);
			if (placed === 'missing-anchor') {
				throw new NodeOperationError(
					this.getNode(),
					'Select the label the new label should be placed before or after (Position: Relative To Label)',
					{ itemIndex },
				);
			}
			rows = placed;
		}
	} else {
		rows = [...dropdownSettingsToInputRows(labels), { label: labelName }];
	}

	const data = await client.execute(LABEL_UPDATE_MUTATIONS[kind], itemIndex, {
		boardId,
		columnId,
		revision,
		labels: rows,
	});
	return (data.update_status_column ?? data.update_dropdown_column ?? {}) as IDataObject;
}
