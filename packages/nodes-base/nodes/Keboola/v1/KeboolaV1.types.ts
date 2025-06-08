import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

export type Platform = 'aws' | 'gcp' | 'azure';

export const JobStatusSchema = z.object({
	id: z.union([z.string(), z.number()]).transform((val) => String(val)),
	status: z.enum(['waiting', 'processing', 'success', 'error', 'cancelled', 'terminated']),
	results: z
		.union([
			z.object({
				file: z.object({
					id: z.number(),
				}),
			}),
			z.object({
				warnings: z.array(z.any()).optional(),
				newColumns: z.array(z.string()).optional(),
				transaction: z.any().nullable().optional(),
				totalRowsCount: z.number().optional(),
				importedColumns: z.array(z.string()).optional(),
				totalDataSizeBytes: z.number().optional(),
			}),
			z.null(),
		])
		.optional(),
	error: z
		.object({
			message: z.string(),
			code: z.string().optional(),
		})
		.optional(),
});

export const UploadResponseSchema = z.object({
	id: z.number(),
	name: z.string(),
	url: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export const TableDetailSchema = z.object({
	id: z.string(),
	name: z.string(),
	displayName: z.string().optional(),
	bucket: z.object({
		id: z.string(),
		name: z.string(),
		stage: z.string(),
	}),
	columns: z.array(z.string()),
	columnsMetadata: z
		.record(
			z.object({
				KBC: z
					.object({
						datatype: z
							.object({
								type: z.string(),
								length: z.string().optional(),
								nullable: z.boolean().optional(),
							})
							.optional(),
					})
					.optional(),
			}),
		)
		.optional(),
	primaryKey: z.array(z.string()),
	isAlias: z.boolean(),
	created: z.string(),
	lastChangeDate: z.string(),
	lastImportDate: z.string().optional(),
	rowsCount: z.number(),
	dataSizeBytes: z.number(),
});

export const BucketDetailSchema = z.object({
	id: z.string(),
	name: z.string(),
	stage: z.string(),
	description: z.string().optional(),
	backend: z.string(),
	created: z.string(),
	lastChangeDate: z.string().nullable(),
	isReadOnly: z.boolean(),
});

export const FileMetadataSchema = z.object({
	id: z.number(),
	name: z.string(),
	url: z.string(),
	provider: z.string(),
	region: z.string().optional(),
	gcsCredentials: z
		.object({
			access_token: z.string(),
			expires_in: z.number().optional(),
		})
		.optional(),
	credentials: z
		.object({
			access_token: z.string(),
			expires_in: z.number().optional(),
		})
		.optional(),
	awsCredentials: z
		.object({
			AccessKeyId: z.string(),
			SecretAccessKey: z.string(),
			SessionToken: z.string(),
			Expiration: z.string(),
		})
		.optional(),
	azureCredentials: z
		.object({
			SASConnectionString: z.string(),
		})
		.optional(),
});

export const ManifestEntrySchema = z.object({
	url: z.string(),
	mandatory: z.boolean().optional(),
});

export const ManifestSchema = z.object({
	entries: z.array(ManifestEntrySchema),
});

export const CreateBucketRequestSchema = z.object({
	name: z.string().min(1),
	stage: z.enum(['in', 'out']),
	description: z.string().optional(),
});

export const CreateTableRequestSchema = z.object({
	name: z.string().min(1),
	dataFileId: z.number(),
	delimiter: z.string().default(','),
	enclosure: z.string().default('"'),
	incremental: z.boolean().default(false),
	primaryKey: z.string().optional(),
});

export const ImportTableRequestSchema = z.object({
	dataFileId: z.number(),
	delimiter: z.string().default(','),
	enclosure: z.string().default('"'),
	incremental: z.boolean().default(false),
});

export const ErrorResponseSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	context: z.record(z.any()).optional(),
	exceptionId: z.string().optional(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type TableDetail = z.infer<typeof TableDetailSchema>;
export type BucketDetail = z.infer<typeof BucketDetailSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type CreateBucketRequest = z.infer<typeof CreateBucketRequestSchema>;
export type CreateTableRequest = z.infer<typeof CreateTableRequestSchema>;
export type ImportTableRequest = z.infer<typeof ImportTableRequestSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface KeboolaCredentials {
	apiToken: string;
	stack: string;
}

export interface KeboolaUploadParams {
	bucketStage: string;
	bucketName: string;
	tableName: string;
	primaryKeys: string[];
	importMode: 'full' | 'incremental';
	uploadFilename?: string;
}

export interface KeboolaTableIdentifiers {
	bucketId: string;
	tableId: string;
	incremental: boolean;
}

export interface ExtractParams {
	tableId: string;
}

export interface UploadParams extends KeboolaUploadParams {}

export interface BucketIdentifiers {
	stage: string;
	name: string;
}

export interface DownloadTableResult {
	rows: Array<Record<string, string>>;
}

export function validateJobStatus(data: unknown): JobStatus {
	try {
		return JobStatusSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid job status response: ${error}`);
	}
}

export function validateUploadResponse(data: unknown): UploadResponse {
	try {
		return UploadResponseSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid upload response: ${error}`);
	}
}

export function validateTableDetail(data: unknown): TableDetail {
	try {
		return TableDetailSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid table detail response: ${error}`);
	}
}

export function validateBucketDetail(data: unknown): BucketDetail {
	try {
		return BucketDetailSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid bucket detail response: ${error}`);
	}
}

export function validateFileMetadata(data: unknown): FileMetadata {
	try {
		return FileMetadataSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid file metadata response: ${error}`);
	}
}

export function validateManifest(data: unknown): Manifest {
	try {
		return ManifestSchema.parse(data);
	} catch (error) {
		throw new UnexpectedError(`Invalid manifest response: ${error}`);
	}
}

export function isErrorResponse(data: unknown): data is ErrorResponse {
	return ErrorResponseSchema.safeParse(data).success;
}

export function assertNotErrorResponse(data: unknown): void {
	if (isErrorResponse(data)) {
		throw new UnexpectedError(`API Error: ${data.error} (${data.code || 'unknown'})`);
	}
}

export const ApiResponseSchema = z.union([
	JobStatusSchema,
	UploadResponseSchema,
	TableDetailSchema,
	BucketDetailSchema,
	FileMetadataSchema,
	ManifestSchema,
	ErrorResponseSchema,
]);

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

export const JOB_SUCCESS_STATUS = 'success' as const;
export const JOB_FAILURE_STATUSES = ['error', 'cancelled', 'terminated'] as const;
export const BUCKET_STAGES = ['in', 'out'] as const;
export const SUPPORTED_PLATFORMS: Platform[] = ['gcp', 'aws', 'azure'];

type JobFailureStatus = (typeof JOB_FAILURE_STATUSES)[number];

export function isJobSuccess(status: JobStatus): boolean {
	return status.status === JOB_SUCCESS_STATUS;
}

export function isJobFailure(
	status: JobStatus,
): status is JobStatus & { status: JobFailureStatus } {
	return (JOB_FAILURE_STATUSES as readonly string[]).includes(status.status);
}

export function hasFileResults(
	job: JobStatus,
): job is JobStatus & { results: { file: { id: number } } } {
	return (
		job.results !== null &&
		job.results !== undefined &&
		'file' in job.results &&
		job.results.file?.id !== undefined
	);
}

export function hasGcsCredentials(
	metadata: FileMetadata,
): metadata is FileMetadata & { gcsCredentials: { access_token: string } } {
	return metadata.gcsCredentials?.access_token !== undefined;
}

export function hasAwsCredentials(
	metadata: FileMetadata,
): metadata is FileMetadata & {
	awsCredentials: { AccessKeyId: string; SecretAccessKey: string; SessionToken: string };
} {
	return metadata.awsCredentials?.AccessKeyId !== undefined;
}

export function hasAzureCredentials(
	metadata: FileMetadata,
): metadata is FileMetadata & { azureCredentials: { SASConnectionString: string } } {
	return metadata.azureCredentials?.SASConnectionString !== undefined;
}
