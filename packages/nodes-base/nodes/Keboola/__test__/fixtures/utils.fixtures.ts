import type { INodeExecutionData } from 'n8n-workflow';
import type { KeboolaUploadParams, KeboolaTableIdentifiers } from '../../V1/KeboolaV1.types';

export const fixtures = {
	csvItems: [
		{ json: { id: 1, name: 'Alice' } },
		{ json: { id: 2, name: 'Bob' } },
	] as INodeExecutionData[],

	escapedItems: [{ json: { id: 1, name: 'Alice, "the Brave"' } }] as INodeExecutionData[],

	csvColumns: ['id', 'name'],

	csvRaw: '1,Alice\n2,Bob',
	csvParsed: [
		{ id: '1', name: 'Alice' },
		{ id: '2', name: 'Bob' },
	],

	uploadParams: {
		bucketStage: 'in',
		bucketName: 'bucket',
		tableName: 'table',
		importMode: 'incremental',
		primaryKeys: [],
	} as KeboolaUploadParams,

	expectedIdentifiers: {
		bucketId: 'in.c-bucket',
		tableId: 'in.c-bucket.table',
		incremental: true,
	} as KeboolaTableIdentifiers,

	columnItems: [{ json: { a: 1, b: 2 } }] as INodeExecutionData[],
};
