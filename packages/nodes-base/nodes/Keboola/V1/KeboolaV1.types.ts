import { IExecuteFunctions, UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

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

export const KeboolaCredentialsSchema = z.object({
	apiToken: z.string().min(1),
	stack: z.string().url().or(z.string().min(1)),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type TableDetail = z.infer<typeof TableDetailSchema>;
export type BucketDetail = z.infer<typeof BucketDetailSchema>;
export type CreateBucketRequest = z.infer<typeof CreateBucketRequestSchema>;
export type CreateTableRequest = z.infer<typeof CreateTableRequestSchema>;
export type ImportTableRequest = z.infer<typeof ImportTableRequestSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type KeboolaCredentials = z.infer<typeof KeboolaCredentialsSchema>;

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

export interface UploadParams extends KeboolaUploadParams {}

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

export async function extractCredentials(this: IExecuteFunctions): Promise<KeboolaCredentials> {
	const raw: unknown = await this.getCredentials('keboolaApiToken');

	try {
		return KeboolaCredentialsSchema.parse(raw);
	} catch (error) {
		throw new UnexpectedError('Invalid or missing Keboola credentials');
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
	ErrorResponseSchema,
]);

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

export const JOB_SUCCESS_STATUS = 'success' as const;
export const JOB_FAILURE_STATUSES = ['error', 'cancelled', 'terminated'] as const;

type JobFailureStatus = (typeof JOB_FAILURE_STATUSES)[number];

export function isJobSuccess(status: JobStatus): boolean {
	return status.status === JOB_SUCCESS_STATUS;
}

export function isJobFailure(
	status: JobStatus,
): status is JobStatus & { status: JobFailureStatus } {
	return (JOB_FAILURE_STATUSES as readonly string[]).includes(status.status);
}
