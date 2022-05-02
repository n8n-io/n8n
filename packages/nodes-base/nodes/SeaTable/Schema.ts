import {TColumnType, TDateTimeFormat, TInheritColumnKey} from './types';

export type ColumnType = keyof typeof schema.columnTypes;

export const schema = {
		rowFetchSegmentLimit: 1000,
		dateTimeFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
		internalNames: {
				'_id': 'text',
				'_creator': 'creator',
				'_ctime': 'ctime',
				'_last_modifier': 'last-modifier',
				'_mtime': 'mtime',
				'_seq': 'auto-number',
		},
		columnTypes: {
				text: 'Text',
				'long-text': 'Long Text',
				number: 'Number',
				collaborator: 'Collaborator',
				date: 'Date',
				duration: 'Duration',
				'single-select': 'Single Select',
				'multiple-select': 'Multiple Select',
				email: 'Email',
				url: 'URL',
				'rate': 'Rating',
				checkbox: 'Checkbox',
				formula: 'Formula',
				creator: 'Creator',
				ctime: 'Created time',
				'last-modifier': 'Last Modifier',
				mtime: 'Last modified time',
				'auto-number': 'Auto number',
		},
		nonUpdateAbleColumnTypes: {
				'creator': 'creator',
				'ctime': 'ctime',
				'last-modifier': 'last-modifier',
				'mtime': 'mtime',
				'auto-number': 'auto-number',
		},
} as {
		rowFetchSegmentLimit: number,
		dateTimeFormat: TDateTimeFormat,
		internalNames: { [key in TInheritColumnKey]: ColumnType }
		columnTypes: { [key in TColumnType]: string }
		nonUpdateAbleColumnTypes: { [key in ColumnType]: ColumnType }
};
