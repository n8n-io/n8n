import axios, { type AxiosError } from 'axios';
import FormData from 'form-data';
import type { INodeExecutionData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type {
	JobStatus,
	CreateBucketRequest,
	CreateTableRequest,
	ImportTableRequest,
	KeboolaTableIdentifiers,
	KeboolaCredentials,
	UploadParams,
} from './KeboolaV1.types';
import {
	validateJobStatus,
	validateUploadResponse,
	validateTableDetail,
	validateBucketDetail,
	assertNotErrorResponse,
	isJobSuccess,
	isJobFailure,
} from './KeboolaV1.types';
import {
	validateBucketId,
	createUploadUrl,
	delay,
	buildCsvFromItems,
	createTableIdentifiers,
	extractColumnsFromItems,
	formatUploadSuccessMessage,
} from './KeboolaV1.utils';

const MAX_JOB_ATTEMPTS = 30;
const POLLING_INTERVAL_MS = 2000;

export class KeboolaJobTimeoutError extends Error {
	constructor(message: string = 'Job did not complete within the timeout period') {
		super(message);
		this.name = 'KeboolaJobTimeoutError';
	}
}

export class KeboolaJobFailedError extends Error {
	readonly jobData: JobStatus;

	constructor(jobData: JobStatus) {
		super(
			`Job failed with status '${jobData.status}': ${jobData.error?.message || 'Unknown error'}`,
		);
		this.name = 'KeboolaJobFailedError';
		this.jobData = jobData;
	}
}

export class KeboolaUploadError extends Error {
	readonly response: unknown;

	constructor(response: unknown) {
		super(`Upload failed: ${JSON.stringify(response)}`);
		this.name = 'KeboolaUploadError';
		this.response = response;
	}
}

export class KeboolaValidationError extends Error {
	constructor(
		message: string,
		readonly originalError: Error,
	) {
		super(message);
		this.name = 'KeboolaValidationError';
	}
}

export async function waitForJobCompletion(
	jobUrl: string,
	headers: Record<string, string>,
	maxAttempts: number = MAX_JOB_ATTEMPTS,
): Promise<void> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const { data } = await axios.get(jobUrl, { headers });

			assertNotErrorResponse(data);
			const jobStatus = validateJobStatus(data);

			if (isJobSuccess(jobStatus)) {
				return;
			}

			if (isJobFailure(jobStatus)) {
				throw new KeboolaJobFailedError(jobStatus);
			}

			await delay(POLLING_INTERVAL_MS);
		} catch (error) {
			if (error instanceof KeboolaJobFailedError) {
				throw error;
			}
			if (error instanceof KeboolaValidationError) {
				throw error;
			}

			if (attempt === maxAttempts) {
				throw error;
			}
			await delay(POLLING_INTERVAL_MS);
		}
	}

	throw new KeboolaJobTimeoutError();
}

export async function createBucket(
	bucketId: string,
	apiUrl: string,
	headers: Record<string, string>,
): Promise<void> {
	const { stage, name } = validateBucketId(bucketId);

	console.log(`Creating bucket '${name}' in stage '${stage}'...`);

	const requestData: CreateBucketRequest = {
		name,
		stage: stage as 'in' | 'out',
	};

	const response = await axios.post(`${apiUrl}/v2/storage/buckets`, requestData, { headers });
	assertNotErrorResponse(response.data);
	const bucketDetail = validateBucketDetail(response.data);

	console.log(`Bucket created successfully: ${bucketDetail.id}`);
}

export async function checkTableExists(
	tableId: string,
	apiUrl: string,
	headers: Record<string, string>,
): Promise<boolean> {
	try {
		const response = await axios.get(`${apiUrl}/v2/storage/tables/${tableId}`, { headers });
		assertNotErrorResponse(response.data);
		const tableDetail = validateTableDetail(response.data);
		console.log(`Table exists: ${tableDetail.id} (${tableDetail.rowsCount} rows)`);
		return true;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			console.log(`Table does not exist: ${tableId}`);
			return false;
		}
		console.log(
			'Table check failed:',
			(error as AxiosError).response?.data || (error as Error).message,
		);
		throw error;
	}
}

export async function createTable(
	bucketId: string,
	tableName: string,
	fileId: number,
	apiUrl: string,
	headers: Record<string, string>,
	primaryKeys?: string[],
	incremental: boolean = false,
): Promise<void> {
	const payload: CreateTableRequest = {
		name: tableName,
		dataFileId: fileId,
		delimiter: ',',
		enclosure: '"',
		incremental,
		...(primaryKeys && primaryKeys.length > 0 && { primaryKey: primaryKeys.join(',') }),
	};

	const createUrl = `${apiUrl}/v2/storage/buckets/${bucketId}/tables-async`;
	const response = await axios.post(createUrl, payload, { headers });

	assertNotErrorResponse(response.data);
	const job = validateJobStatus(response.data);

	await waitForJobCompletion(`${apiUrl}/v2/storage/jobs/${job.id}`, headers);
	console.log(`Table created successfully: ${bucketId}.${tableName}`);
}

export async function importToExistingTable(
	tableId: string,
	fileId: number,
	apiUrl: string,
	headers: Record<string, string>,
): Promise<void> {
	const payload: ImportTableRequest = {
		dataFileId: fileId,
		delimiter: ',',
		enclosure: '"',
		incremental: false,
	};

	const importUrl = `${apiUrl}/v2/storage/tables/${tableId}/import-async`;
	const response = await axios.post(importUrl, payload, { headers });

	assertNotErrorResponse(response.data);
	const job = validateJobStatus(response.data);

	await waitForJobCompletion(`${apiUrl}/v2/storage/jobs/${job.id}`, headers);
	console.log(`Table import completed: ${tableId}`);
}

export async function uploadCsvToKeboola(
	csv: string,
	apiUrl: string,
	apiToken: string,
	uploadFilename: string = 'upload.csv',
): Promise<number> {
	const form = new FormData();
	form.append('name', uploadFilename);
	form.append('data', Buffer.from(csv), {
		filename: uploadFilename,
		contentType: 'text/csv',
	});
	form.append('notify', '0');
	form.append('isPermanent', '0');
	form.append('tags[]', 'n8n-upload');

	const uploadUrl = createUploadUrl(apiUrl);

	try {
		const response = await axios.post(uploadUrl, form, {
			headers: {
				...form.getHeaders(),
				'X-StorageApi-Token': apiToken,
			},
		});

		assertNotErrorResponse(response.data);
		const uploadResponse = validateUploadResponse(response.data);

		console.log(`File uploaded successfully: ${uploadResponse.name} (ID: ${uploadResponse.id})`);
		return uploadResponse.id;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const errorDetails = {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			};
			console.error('Upload request error:', errorDetails);
		}

		if (error instanceof KeboolaValidationError) {
			throw error;
		}

		const errorData = axios.isAxiosError(error) ? error.response?.data : (error as Error).message;
		throw new KeboolaUploadError(errorData);
	}
}

export async function ensureBucketExists(
	bucketId: string,
	apiUrl: string,
	apiToken: string,
): Promise<void> {
	const headers = { 'X-StorageApi-Token': apiToken };

	try {
		const response = await axios.get(`${apiUrl}/v2/storage/buckets/${bucketId}`, { headers });
		assertNotErrorResponse(response.data);
		const bucketDetail = validateBucketDetail(response.data);
		console.log(`Bucket exists: ${bucketDetail.id} (${bucketDetail.name})`);
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			await createBucket(bucketId, apiUrl, headers);
		} else {
			const errorData = axios.isAxiosError(error) ? error.response?.data : (error as Error).message;
			console.error('🔥 Bucket check error:', errorData);
			throw error;
		}
	}
}

export async function ensureTableAndImport(
	apiUrl: string,
	apiToken: string,
	{ bucketId, tableId, incremental }: KeboolaTableIdentifiers,
	tableName: string,
	fileId: number,
	primaryKeys?: string[],
): Promise<void> {
	const headers = { 'X-StorageApi-Token': apiToken };

	await ensureBucketExists(bucketId, apiUrl, apiToken);

	const tableExists = await checkTableExists(tableId, apiUrl, headers);

	if (!tableExists) {
		await createTable(bucketId, tableName, fileId, apiUrl, headers, primaryKeys, incremental);
	} else {
		await importToExistingTable(tableId, fileId, apiUrl, headers);
	}
}

export async function handleUploadOperation(
	params: UploadParams,
	credentials: KeboolaCredentials,
	inputItems: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (inputItems.length === 0) {
		throw new UnexpectedError('No data items to upload');
	}

	console.log(`Uploading ${inputItems.length} items to Keboola...`);

	const columns = extractColumnsFromItems(inputItems);
	const csv = buildCsvFromItems(inputItems, columns);

	console.log(`CSV Preview (first 300 chars):\n${csv.slice(0, 300)}`);

	const fileId = await uploadCsvToKeboola(
		csv,
		credentials.stack,
		credentials.apiToken,
		params.uploadFilename,
	);

	console.log(`File uploaded successfully with ID: ${fileId}`);

	const tableIdentifiers = createTableIdentifiers(params);

	await ensureTableAndImport(
		credentials.stack,
		credentials.apiToken,
		tableIdentifiers,
		params.tableName,
		fileId,
		params.primaryKeys.length > 0 ? params.primaryKeys : undefined,
	);

	const successMessage = formatUploadSuccessMessage(inputItems.length, tableIdentifiers.tableId);
	console.log(successMessage);

	return [{ json: { message: successMessage } }];
}
