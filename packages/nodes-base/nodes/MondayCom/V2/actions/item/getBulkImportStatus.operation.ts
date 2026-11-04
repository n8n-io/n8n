import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { summarizeJobStatus } from '../../helpers/bulkImport';
import { fetchBulkImportJobStatus, fetchBulkImportReportRows } from '../../helpers/bulkImportJob';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'bulkImportJobId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description:
			'The job ID returned by a Bulk Import run. Poll every 10 seconds. Note: if the import report is ready, the report URL expires after 10 minutes.',
	},
	{
		displayName: 'Options',
		name: 'bulkImportStatusOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Include Row Results',
				name: 'includeRowResults',
				type: 'boolean',
				default: false,
				description:
					"Whether to also output one item per imported row from monday's import report (serial number, status, item ID, error), when the report is ready",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['getBulkImportStatus'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Item: Get Bulk Import Status — one fetch_job_status poll for a job ID
 * from a previous Bulk Import run (the no-wait path).
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const jobId = (this.getNodeParameter('bulkImportJobId', itemIndex) as string).trim();
	if (!jobId) {
		throw new NodeOperationError(this.getNode(), 'Job ID is required', { itemIndex });
	}
	const options = this.getNodeParameter('bulkImportStatusOptions', itemIndex, {}) as IDataObject;

	const status = await fetchBulkImportJobStatus(client, itemIndex, jobId);
	if (status.status === undefined) {
		throw new NodeOperationError(this.getNode(), `No import job found for job ID ${jobId}`, {
			itemIndex,
		});
	}

	const results: IDataObject[] = [summarizeJobStatus(jobId, status)];

	if (options.includeRowResults === true && status.report_created && status.report_url) {
		// The router pairs every row to this item, so only the JSON is needed.
		const reportRows = await fetchBulkImportReportRows.call(
			this,
			jobId,
			status.report_url,
			false,
			itemIndex,
			0,
		);
		results.push(...reportRows.map((row) => row.json));
	}

	return results;
}
