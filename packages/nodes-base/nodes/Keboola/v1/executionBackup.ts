import type { IExecuteFunctions } from 'n8n-workflow';

import {
	buildCsvFromItems,
	downloadKeboolaTable,
	ensureTableAndImport,
	uploadCsvToKeboola,
} from './storageFunctions';

export async function keboolaNodeExecution(this: IExecuteFunctions) {
	const items = this.getInputData();
	const returnItems = [];

	const credentials = await this.getCredentials('keboolaApiToken');
	const apiToken = credentials.apiToken as string;
	const apiUrl = credentials.stack as string;

	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'extract') {
		const tableId = this.getNodeParameter('tableId', 0) as string;
		const { rows } = await downloadKeboolaTable(tableId, apiUrl, apiToken);
		for (const row of rows) {
			returnItems.push({ json: row });
		}
	} else if (operation === 'upload') {
		const bucketStage = this.getNodeParameter('bucketStage', 0) as string;
		const bucketNameRaw = this.getNodeParameter('bucketName', 0) as string;
		const bucketId = `${bucketStage}.c-${bucketNameRaw}`;
		const tableName = (this.getNodeParameter('tableName', 0) as string) || 'output';
		const tableId = `${bucketId}.${tableName}`;
		const primaryKeysRaw = this.getNodeParameter('primaryKeys', 0) as string;
		const primaryKeys = primaryKeysRaw ? primaryKeysRaw.split(',').map((s) => s.trim()) : [];
		const uploadFilename = 'upload.csv';
		const importMode = this.getNodeParameter('importMode', 0) as 'full' | 'incremental';
		const incremental = importMode === 'incremental';

		console.log('🧱 Building CSV from items...');
		const columns = Object.keys(items[0].json);
		const csv = buildCsvFromItems(items, columns);
		console.log('📄 CSV Preview:\n', csv.slice(0, 300));

		const fileId = await uploadCsvToKeboola(csv, apiUrl, apiToken, uploadFilename);

		await ensureTableAndImport(
			apiUrl,
			apiToken,
			bucketId,
			tableName,
			fileId,
			primaryKeys,
			incremental,
		);

		returnItems.push({ json: { message: `✅ Uploaded ${items.length} rows to ${tableId}` } });
	}

	return this.prepareOutputData(returnItems);
}
