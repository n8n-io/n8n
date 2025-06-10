import aws4, { sign } from 'aws4';
import axios, { type AxiosError } from 'axios';
import FormData from 'form-data';
import type { INodeExecutionData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type {
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

export async function downloadSignedSlice(signedUrl: string): Promise<string> {
	const response = await axios.get(signedUrl, {
		responseType: 'text',
	});

	return response.data;
}

export function getAccessToken(metadata: FileMetadata): string | undefined {
	if (hasGcsCredentials(metadata)) {
		return metadata.gcsCredentials.access_token;
	}
	if (metadata.credentials?.access_token) {
		return metadata.credentials.access_token;
	}
	return undefined;
}

export async function downloadAwsSlice(s3Url: string, metadata: FileMetadata): Promise<string> {
	if (!s3Url.startsWith('s3://')) {
		throw new UnexpectedError(`Invalid S3 URL format: ${s3Url}`);
	}

	try {
		const manifestUrl = metadata.url;
		const manifestUrlObj = new URL(manifestUrl);

		const [bucket, ...keyParts] = s3Url.slice(5).split('/');
		const key = keyParts.join('/');
		const region = metadata.region || 'eu-central-1';
		const host = `${bucket}.s3.${region}.amazonaws.com`;
		const signedQuery = manifestUrlObj.search;

		// Build the slice URL using the same signed query
		const sliceUrl = `https://${host}/${key}${signedQuery}`;
		console.log('[AWS] Accessing slice using presigned URL:', sliceUrl);

		const response = await axios.get(sliceUrl, { responseType: 'text' });

		console.log('[AWS] Slice downloaded successfully');
		return response.data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const body = error.response?.data || error.message;
			throw new UnexpectedError(`Failed to download AWS slice (${status}): ${body}`);
		}
		throw new UnexpectedError(`Failed to download AWS slice: ${(error as Error).message}`);
	}
}

// Google Cloud Storage slice download - updated to match new schema
export async function downloadGcsSlice(gsUrl: string, metadata: FileMetadata): Promise<string> {
	// Check URL format
	if (!gsUrl.startsWith('gs://')) {
		throw new UnexpectedError(`Invalid GCS URL format: ${gsUrl}`);
	}

	// Get GCS credentials from metadata
	const credentials = metadata.gcsCredentials;
	if (!credentials) {
		throw new UnexpectedError('No GCS credentials found in metadata');
	}

	try {
		// Parse the GCS URL
		const match = gsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
		if (!match) {
			throw new UnexpectedError(`Failed to parse GCS URL: ${gsUrl}`);
		}

		const [, bucket, path] = match;
		const quotedPath = encodeURIComponent(path);
		const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${quotedPath}?alt=media`;

		// Add authorization header with access token
		const headers = {
			Authorization: `Bearer ${credentials.access_token}`,
		};

		console.debug(`[GCS] Downloading object: ${url}`);

		const response = await axios.get(url, {
			headers,
			responseType: 'text',
		});

		return response.data;
	} catch (error) {
		console.error('[GCS] Download error:', error);
		throw new UnexpectedError(`Failed to download GCS slice: ${error.message}`);
	}
}

// Universal function to download slices based on storage provider
export async function downloadKeboolaSlices(
	entries: Array<{ url: string; mandatory?: boolean }>,
	metadata: FileMetadata,
): Promise<string[]> {
	// Determine cloud provider from metadata
	const provider = metadata.provider.toLowerCase();

	console.debug(`[Slices] Using cloud provider: ${provider}`);

	// Download all slices in parallel
	const slicePromises = entries.map(async (entry) => {
		try {
			const url = entry.url;
			console.debug(`[Slice] Downloading: ${url}`);

			if (provider === 'gcp') {
				return await downloadGcsSlice(url, metadata);
			} else if (provider === 'aws') {
				return await downloadAwsSlice(url, metadata);
			} else if (provider === 'azure') {
				return await downloadAzureSlice(url, metadata);
			} else {
				throw new UnexpectedError(`Unsupported cloud provider: ${provider}`);
			}
		} catch (error) {
			console.error(`[Slice] Download failed: ${entry.url}`, error);

			// If the slice is marked as mandatory (or not explicitly optional), rethrow the error
			if (entry.mandatory !== false) {
				throw error;
			}

			// Return empty string for optional slices that failed to download
			return '';
		}
	});

	return await Promise.all(slicePromises);
}

export async function downloadAllSlices(metadata: FileMetadata): Promise<string[]> {
	// Get the manifest URL from metadata
	const manifestUrl = metadata.url;

	// Download the manifest
	console.debug(`[Manifest] Downloading: ${manifestUrl}`);
	const manifestResponse = await axios.get(manifestUrl);
	const manifest = validateManifest(manifestResponse.data);

	// Download all slices
	return await downloadKeboolaSlices(manifest.entries, metadata);
}

export async function startTableExport(
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

export async function waitForExportAndGetMetadata(
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

			console.debug(`[Job ${jobId}] Attempt ${attempt} - status: ${jobStatus.status}`);
			if (isJobSuccess(jobStatus)) {
				console.debug(`[Job ${jobId}] Job succeeded. Checking file results...`);

				if (!hasFileResults(jobStatus)) {
					throw new UnexpectedError('Job completed successfully but no file results found');
				}

				const fileId = jobStatus.results.file.id;
				console.debug(`[Job ${jobId}] File ID found: ${fileId}`);

				const metaUrl = `${apiUrl}/v2/storage/files/${fileId}?federationToken=1`;
				const metaResponse = await axios.get(metaUrl, { headers });

				assertNotErrorResponse(metaResponse.data);
				return validateFileMetadata(metaResponse.data);
			}

			if (isJobFailure(jobStatus)) {
				console.error(`[Job ${jobId}] FAILED:`, jobStatus.error);
				throw new KeboolaJobFailedError(jobStatus);
			}

			await delay(POLLING_INTERVAL_MS);
		} catch (error) {
			console.error(`[Job ${jobId}] Error:`, error);
			if (error instanceof KeboolaJobFailedError || error instanceof KeboolaValidationError) {
				throw error;
			}

			if (attempt === MAX_JOB_ATTEMPTS) throw error;
			await delay(POLLING_INTERVAL_MS);
		}
	}

	throw new KeboolaJobTimeoutError('Export job did not complete in time');
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
