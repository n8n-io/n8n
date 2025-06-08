import axios, { type AxiosError } from 'axios';
import FormData from 'form-data';
import type { INodeExecutionData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type {
	Platform,
	JobStatus,
	FileMetadata,
	CreateBucketRequest,
	CreateTableRequest,
	ImportTableRequest,
	KeboolaTableIdentifiers,
	DownloadTableResult,
	KeboolaCredentials,
	ExtractParams,
	UploadParams,
} from './KeboolaV1.types';
import {
	validateJobStatus,
	validateUploadResponse,
	validateTableDetail,
	validateBucketDetail,
	validateFileMetadata,
	validateManifest,
	assertNotErrorResponse,
	isJobSuccess,
	isJobFailure,
	hasFileResults,
	hasGcsCredentials,
} from './KeboolaV1.types';
import {
	detectCloudProvider,
	parseCsv,
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

function getAccessToken(metadata: FileMetadata): string {
	if (hasGcsCredentials(metadata)) {
		return metadata.gcsCredentials.access_token;
	}

	if (metadata.credentials?.access_token) {
		return metadata.credentials.access_token;
	}

	throw new UnexpectedError('No access token found in file metadata');
}

async function downloadGcsSlice(gsUrl: string, accessToken: string): Promise<string> {
	const match = gsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
	if (!match) {
		throw new UnexpectedError(`Invalid GCS URL format: ${gsUrl}`);
	}

	const [, bucket, path] = match;
	const quotedPath = encodeURIComponent(path);
	const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${quotedPath}?alt=media`;

	const response = await axios.get(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
		responseType: 'text',
	});

	return response.data;
}

async function downloadKeboolaSlices(
	entries: Array<{ url: string; mandatory?: boolean }>,
	provider: Platform,
	token: string,
): Promise<string[]> {
	switch (provider) {
		case 'gcp':
			return await Promise.all(entries.map((entry) => downloadGcsSlice(entry.url, token)));
		case 'aws':
			throw new UnexpectedError('AWS slice download not yet implemented');
		case 'azure':
			throw new UnexpectedError('Azure slice download not yet implemented');
		default:
			throw new UnexpectedError(`Unsupported cloud provider: ${provider}`);
	}
}

async function downloadAllSlices(metadata: FileMetadata): Promise<string[]> {
	const manifestUrl = metadata.url;
	const accessToken = getAccessToken(metadata);

	const manifestResponse = await axios.get(manifestUrl);
	const manifest = validateManifest(manifestResponse.data);

	const provider = detectCloudProvider(manifestUrl);
	return await downloadKeboolaSlices(manifest.entries, provider, accessToken);
}

async function startTableExport(
	tableId: string,
	apiUrl: string,
	headers: Record<string, string>,
): Promise<JobStatus> {
	const exportUrl = `${apiUrl}/v2/storage/tables/${tableId}/export-async`;
	const response = await axios.post(exportUrl, { format: 'rfc' }, { headers });

	assertNotErrorResponse(response.data);
	return validateJobStatus(response.data);
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

async function waitForExportAndGetMetadata(
	jobId: string,
	apiUrl: string,
	headers: Record<string, string>,
): Promise<FileMetadata> {
	const jobUrl = `${apiUrl}/v2/storage/jobs/${jobId}`;

	for (let attempt = 1; attempt <= MAX_JOB_ATTEMPTS; attempt++) {
		try {
			const { data } = await axios.get(jobUrl, { headers });
			assertNotErrorResponse(data);
			const jobStatus = validateJobStatus(data);

			if (isJobSuccess(jobStatus)) {
				if (!hasFileResults(jobStatus)) {
					throw new UnexpectedError('Job completed successfully but no file results found');
				}

				const fileId = jobStatus.results.file.id;
				const metaUrl = `${apiUrl}/v2/storage/files/${fileId}?federationToken=1`;
				const metaResponse = await axios.get(metaUrl, { headers });

				assertNotErrorResponse(metaResponse.data);
				return validateFileMetadata(metaResponse.data);
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

			if (attempt === MAX_JOB_ATTEMPTS) {
				throw error;
			}
			await delay(POLLING_INTERVAL_MS);
		}
	}

	throw new KeboolaJobTimeoutError('Export job did not complete in time');
}

async function createBucket(
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

async function checkTableExists(
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

async function createTable(
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

async function importToExistingTable(
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

export async function fetchTableColumns(
	tableId: string,
	apiUrl: string,
	apiToken: string,
): Promise<string[]> {
	const headers = { 'X-StorageApi-Token': apiToken };
	const response = await axios.get(`${apiUrl}/v2/storage/tables/${tableId}`, { headers });

	assertNotErrorResponse(response.data);
	const tableDetail = validateTableDetail(response.data);

	return tableDetail.columns;
}

export async function downloadKeboolaTable(
	tableId: string,
	apiUrl: string,
	apiToken: string,
): Promise<DownloadTableResult> {
	const headers = { 'X-StorageApi-Token': apiToken };
	const kbcApiUrl = apiUrl.replace(/\/$/, '');

	const columns = await fetchTableColumns(tableId, kbcApiUrl, apiToken);
	const exportJobData = await startTableExport(tableId, kbcApiUrl, headers);

	const fileMetadata = await waitForExportAndGetMetadata(exportJobData.id, kbcApiUrl, headers);

	const csvSlices = await downloadAllSlices(fileMetadata);
	const rows = csvSlices.flatMap((csv) => parseCsv(csv, columns));

	console.log(`Downloaded ${rows.length} rows from table ${tableId}`);
	return { rows };
}

export async function handleExtractOperation(
	params: ExtractParams,
	credentials: KeboolaCredentials,
): Promise<INodeExecutionData[]> {
	console.log(`🔍 Extracting data from table: ${params.tableId}`);

	const { rows } = await downloadKeboolaTable(
		params.tableId,
		credentials.stack,
		credentials.apiToken,
	);

	console.log(`Successfully extracted ${rows.length} rows`);

	return rows.map((row) => ({ json: row }));
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
