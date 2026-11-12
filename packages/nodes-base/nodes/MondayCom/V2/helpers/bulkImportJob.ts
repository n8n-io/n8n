import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { MondayGraphQLClient } from '../transport/MondayGraphQLClient';
import { parseReportRows, type RawItemsJobStatus } from './bulkImport';
import { assertPresignedStorageUrl, PRESIGNED_URL_REQUEST_OPTIONS } from './fileTransfer';

/**
 * Downloads and parses monday's per-row import report. The report URL is a
 * pre-signed S3 GET that expires after 10 minutes — always fetched
 * immediately, never emitted downstream. Rows in mapped mode pair back to
 * the input item they came from (serialNo is the 1-based data-row number).
 */
export async function fetchBulkImportReportRows(
	this: IExecuteFunctions,
	jobId: string,
	reportUrl: string,
	pairToInputRows: boolean,
	fallbackItemIndex: number,
	inputItemCount: number,
): Promise<INodeExecutionData[]> {
	assertPresignedStorageUrl(this.getNode(), reportUrl, 'report', fallbackItemIndex);
	const reportText = (await this.helpers.httpRequest({
		url: reportUrl,
		...PRESIGNED_URL_REQUEST_OPTIONS,
	})) as string;

	return parseReportRows(String(reportText)).map((row) => {
		const serialNo = typeof row.serialNo === 'number' ? row.serialNo : undefined;
		const pairedIndex =
			pairToInputRows && serialNo !== undefined && serialNo >= 1 && serialNo <= inputItemCount
				? serialNo - 1
				: fallbackItemIndex;
		return {
			json: { jobId, ...row },
			pairedItem: { item: pairedIndex },
		};
	});
}

/** One fetch_job_status poll. */
export async function fetchBulkImportJobStatus(
	client: MondayGraphQLClient,
	itemIndex: number,
	jobId: string,
): Promise<RawItemsJobStatus> {
	const data = await client.execute(ITEMS_JOB_STATUS_QUERY, itemIndex, { jobId });
	return (data.fetch_job_status ?? {}) as RawItemsJobStatus;
}

/** Selection set for fetch_job_status — shared by the wait loop and the status op. */
export const ITEMS_JOB_STATUS_QUERY = `query ($jobId: ID!) {
	fetch_job_status(job_id: $jobId) {
		... on ItemsJobStatus {
			status
			counts { submitted invalid skipped created updated failed }
			progress_percentage
			failure_reason
			failure_message
			fully_imported
			report_created
			report_url
		}
	}
}`;
