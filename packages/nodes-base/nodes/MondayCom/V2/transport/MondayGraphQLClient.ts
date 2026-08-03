import { sleep } from '@n8n/utils/sleep';
import {
	jsonParse,
	NodeApiError,
	type IExecuteFunctions,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type IWebhookFunctions,
	type IDataObject,
	type JsonObject,
} from 'n8n-workflow';

/** Any n8n context that can make authenticated HTTP requests. */
type RequestContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

import {
	MONDAY_API_URL,
	MONDAY_API_VERSION,
	MONDAY_FILE_API_URL,
	mondayRequestHeaders,
} from './constants';

/**
 * monday.com error codes that can be extracted from GraphQL responses
 */
export const MondayErrorCode = {
	ComplexityException: 'ComplexityException',
	MutationCallsExceeded: 'MutationCallsExceeded',
	ColumnValueException: 'ColumnValueException',
	InvalidBoardIdException: 'InvalidBoardIdException',
	InvalidItemIdException: 'InvalidItemIdException',
	InvalidGroupIdException: 'InvalidGroupIdException',
	ResourceNotFound: 'ResourceNotFoundException',
	Unauthorized: 'UnauthorizedException',
	// Returned with HTTP 401 for bad/missing tokens (verified live 2026-07)
	NotAuthenticated: 'NOT_AUTHENTICATED',
	RateLimited: 'RateLimitedException',
	NotImplemented: 'NotImplementedException',
	// Item writes rejected by board validation rules / required columns
	// (422; error_data is an ARRAY of per-column failures — verified live 2026-07-17)
	DataValidationsError: 'DATA_VALIDATIONS_ERROR',
	// Permission/plan-gated actions (e.g. validations on non-Pro/Enterprise accounts)
	UserUnauthorized: 'UserUnauthorizedException',
	GenericError: 'GenericError',
} as const;

export type MondayErrorCode = (typeof MondayErrorCode)[keyof typeof MondayErrorCode];

export interface MondayGraphQLError {
	message: string;
	/** On aliased batch mutations: the alias of the field that failed, e.g. ['item3']. */
	path?: Array<string | number>;
	/** Legacy (pre-2025) error format: code at the top level */
	error_code?: MondayErrorCode | string;
	status_code?: number;
	retry_in_seconds?: number;
	/** Current error format: code and details under extensions */
	extensions?: {
		code?: MondayErrorCode | string;
		status_code?: number;
		retry_in_seconds?: number;
		/**
		 * Usually an object, but DATA_VALIDATIONS_ERROR carries an ARRAY of
		 * `{ itemId, columnIds, message }` entries (verified live 2026-07-17).
		 */
		error_data?: IDataObject | IDataObject[];
	};
}

export interface MondayGraphQLResponse<T = IDataObject> {
	data?: T;
	errors?: MondayGraphQLError[];
	extensions?: {
		complexity?: {
			query: number;
			mutations: number;
		};
		retry_in_seconds?: number;
		/** Present on every response (verified live 2026-07); matches the x-request-id header. */
		request_id?: string;
	};
}

/**
 * Metadata about a single request, for the GraphQL operation's
 * "Include Request Info" option.
 */
export interface MondayRequestInfo {
	/** monday's request ID — quote this in support tickets. */
	requestId?: string;
	/** The API version the server actually used (api-version response header). */
	apiVersion?: string;
	statusCode?: number;
	/** Parsed RateLimit header: remaining budget per quota policy. */
	rateLimit?: IDataObject;
	/** Parsed RateLimit-Policy header: the account's quota limits. */
	rateLimitPolicy?: IDataObject;
}

/**
 * Support-ticket trace line appended to every error description, so users
 * can quote the request ID and status code to monday support.
 */
function formatErrorTrace(requestId?: string, statusCode?: number): string {
	const parts: string[] = [];
	if (statusCode !== undefined) parts.push(`HTTP status: ${statusCode}`);
	if (requestId) parts.push(`Request ID: ${requestId}`);
	return parts.join(' · ');
}

/** Maps RFC structured-header param keys to readable names. */
const RATE_LIMIT_PARAM_NAMES: Record<string, string> = {
	r: 'remaining',
	q: 'limit',
	w: 'windowSeconds',
	t: 'resetSeconds',
	qu: 'unit',
};

/**
 * Parses monday's structured rate-limit headers, e.g.
 * `"minuteRate";r=4999, "concurrency";r=249, "complexityMinute";r=4950000;t=45`
 * into `{ minuteRate: { remaining: 4999 }, ..., complexityMinute: { remaining: 4950000, resetSeconds: 45 } }`.
 */
export function parseRateLimitHeader(value?: string): IDataObject | undefined {
	if (!value) return undefined;

	const result: IDataObject = {};
	for (const entry of value.split(',')) {
		const [rawName, ...rawParams] = entry.trim().split(';');
		const name = rawName?.replace(/"/g, '').trim();
		if (!name) continue;

		const params: IDataObject = {};
		for (const rawParam of rawParams) {
			const separatorIndex = rawParam.indexOf('=');
			if (separatorIndex === -1) continue;
			const key = rawParam.slice(0, separatorIndex).trim();
			const rawValue = rawParam
				.slice(separatorIndex + 1)
				.replace(/"/g, '')
				.trim();
			const numeric = Number(rawValue);
			params[RATE_LIMIT_PARAM_NAMES[key] ?? key] =
				rawValue !== '' && !Number.isNaN(numeric) ? numeric : rawValue;
		}
		result[name] = params;
	}
	return result;
}

/**
 * Renders DATA_VALIDATIONS_ERROR's error_data — an array of
 * `{ itemId, columnIds, message }` entries, one per failed column — into a
 * single human-readable line. Exported for tests.
 */
export function formatValidationFailures(
	errorData: IDataObject | IDataObject[] | undefined,
): string {
	if (!Array.isArray(errorData)) return '';
	return errorData
		.map((entry) => {
			const message = typeof entry.message === 'string' ? entry.message : JSON.stringify(entry);
			const columnIds = Array.isArray(entry.columnIds) ? entry.columnIds.join(', ') : '';
			return columnIds ? `${message} (column: ${columnIds})` : message;
		})
		.join('; ');
}

/**
 * Marker fields attached to errors this client produces, so retry decisions
 * are explicit rather than inferred from message text.
 */
interface RetryableErrorMarker {
	mondayRetryable?: boolean;
	mondayRetryInSeconds?: number;
}

/**
 * Shared GraphQL client for all monday.com operations.
 * Handles:
 * - Single POST endpoint
 * - Error mapping to actionable messages
 * - Retry with exponential backoff for rate limits and complexity budget
 * - API version pinning
 */
export class MondayGraphQLClient {
	private context: RequestContext;
	private apiVersion: string;
	private baseRetryDelayMs: number;

	constructor(context: RequestContext, apiVersion = MONDAY_API_VERSION, baseRetryDelayMs = 1000) {
		this.context = context;
		this.apiVersion = apiVersion;
		this.baseRetryDelayMs = baseRetryDelayMs;
	}

	/**
	 * Resolves which credential to authenticate with from the node's
	 * `authentication` selector — the same dual-credential mechanism V1 uses,
	 * so existing mondayComApi (access token) and mondayComOAuth2Api
	 * credentials keep working unchanged in V2.
	 */
	private getCredentialType(): string {
		let authentication = 'accessToken';
		try {
			authentication = this.context.getNodeParameter('authentication', 0) as string;
		} catch {
			// Parameter missing (should not happen at runtime) — default to access token.
		}
		return authentication === 'oAuth2' ? 'mondayComOAuth2Api' : 'mondayComApi';
	}

	/**
	 * Execute a GraphQL query or mutation with automatic retry on rate limits and complexity budget.
	 * @param query - GraphQL query/mutation string
	 * @param itemIndex - Index of the input item (for pairedItem tracking)
	 * @param variables - Optional GraphQL variables
	 * @param retryAttempts - Number of retry attempts (default: 3)
	 * @returns Parsed response data
	 */
	async execute(
		query: string,
		_itemIndex: number,
		variables?: Record<string, unknown>,
		retryAttempts = 3,
	): Promise<IDataObject> {
		const { data } = await this.executeInternal(query, variables, retryAttempts);
		return data;
	}

	/**
	 * Like execute(), but also returns request metadata (request ID, effective
	 * API version, status code, parsed rate-limit headers) and supports a
	 * per-request API version override. Used by the raw GraphQL operation.
	 */
	async executeWithInfo(
		query: string,
		_itemIndex: number,
		variables?: Record<string, unknown>,
		options: { apiVersion?: string; retryAttempts?: number } = {},
	): Promise<{ data: IDataObject; requestInfo: MondayRequestInfo }> {
		const { data, requestInfo } = await this.executeInternal(
			query,
			variables,
			options.retryAttempts ?? 3,
			{ apiVersion: options.apiVersion, captureInfo: true },
		);
		return { data, requestInfo: requestInfo ?? {} };
	}

	/**
	 * Like execute(), but for aliased batch mutations: when the response
	 * carries partial data (some aliases succeeded, some failed), it returns
	 * BOTH the data and the raw per-alias errors instead of throwing, so the
	 * caller can map failures back to individual batch entries via error.path.
	 * A response where every alias failed still throws the mapped error, and
	 * transient errors keep the normal retry behavior.
	 */
	async executeBulk(
		query: string,
		_itemIndex: number,
		variables?: Record<string, unknown>,
		retryAttempts = 3,
	): Promise<{ data: IDataObject; errors: MondayGraphQLError[] }> {
		const { data, errors } = await this.executeInternal(query, variables, retryAttempts, {
			allowPartial: true,
		});
		return { data, errors: errors ?? [] };
	}

	private async executeInternal(
		query: string,
		variables?: Record<string, unknown>,
		retryAttempts = 3,
		options: { apiVersion?: string; captureInfo?: boolean; allowPartial?: boolean } = {},
	): Promise<{
		data: IDataObject;
		requestInfo?: MondayRequestInfo;
		errors?: MondayGraphQLError[];
	}> {
		let lastError: Error | null = null;
		let lastRetryDelay = this.baseRetryDelayMs;

		for (let attempt = 0; attempt <= retryAttempts; attempt++) {
			try {
				const { response, requestInfo } = await this.makeRequest(query, variables, options);

				if (response.errors && response.errors.length > 0) {
					// Aliased batch mutations return partial data alongside errors
					// (verified live: failed aliases are null, others executed).
					// In allowPartial mode hand both back to the caller.
					if (
						options.allowPartial === true &&
						response.data &&
						Object.values(response.data).some((value) => value !== null && value !== undefined)
					) {
						return { data: response.data, requestInfo, errors: response.errors };
					}
					const error = response.errors[0];
					throw this.mapError(error, response);
				}

				if (!response.data) {
					throw new NodeApiError(this.context.getNode(), {
						message: 'Empty response from monday.com API',
					} as unknown as JsonObject);
				}

				if (requestInfo && response.extensions?.request_id) {
					requestInfo.requestId = response.extensions.request_id;
				}

				return { data: response.data, requestInfo };
			} catch (error) {
				lastError = error as Error;

				// Check if error is retryable
				const isRetryable = this.isRetryableError(error);
				if (!isRetryable || attempt === retryAttempts) {
					// Everything thrown above is already a mapped NodeApiError.
					throw error;
				}

				// Honor monday's retry_in_seconds hint when present (capped at 60s),
				// otherwise exponential backoff with jitter.
				const retryAfterSeconds = (error as RetryableErrorMarker).mondayRetryInSeconds;
				let delay: number;
				if (retryAfterSeconds && retryAfterSeconds > 0) {
					delay = Math.min(retryAfterSeconds, 60) * 1000;
				} else {
					const jitter = Math.random() * this.baseRetryDelayMs;
					lastRetryDelay = Math.min(lastRetryDelay * 2, 60000);
					delay = lastRetryDelay + jitter;
				}

				// Wait before retrying
				await sleep(delay);
			}
		}

		throw (
			lastError ||
			new NodeApiError(this.context.getNode(), {
				message: 'Max retries exceeded',
			} as unknown as JsonObject)
		);
	}

	/**
	 * Execute a file-upload mutation against the /v2/file endpoint. The
	 * multipart body is assembled manually (community nodes can't add a
	 * form-data dependency); the file lands in the mutation's $file variable
	 * via the `variables[file]` form field.
	 */
	async uploadFile(
		query: string,
		file: Buffer,
		fileName: string,
		mimeType: string,
	): Promise<IDataObject> {
		const boundary = `----n8n-monday-${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		// The filename travels inside a quoted string; strip quotes/CRLF to keep the part header intact.
		const safeFileName = fileName.replace(/["\r\n]/g, '_');
		const body = Buffer.concat([
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="query"\r\n\r\n${query}\r\n`,
			),
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="variables[file]"; filename="${safeFileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
			),
			file,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);

		const raw = await this.context.helpers.httpRequestWithAuthentication.call(
			this.context,
			this.getCredentialType(),
			{
				method: 'POST',
				url: MONDAY_FILE_API_URL,
				body,
				headers: mondayRequestHeaders({
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'API-Version': this.apiVersion,
				}),
			},
		);

		const response = (typeof raw === 'string' ? jsonParse(raw) : raw) as MondayGraphQLResponse;
		if (response.errors && response.errors.length > 0) {
			throw this.mapError(response.errors[0], response);
		}
		if (!response.data) {
			throw new NodeApiError(this.context.getNode(), {
				message: 'Empty response from monday.com file API',
			} as unknown as JsonObject);
		}
		return response.data;
	}

	/**
	 * Make the raw HTTP request to monday.com GraphQL endpoint.
	 * With captureInfo, requests the full response (headers + status) and
	 * extracts request metadata from it.
	 */
	private async makeRequest(
		query: string,
		variables?: Record<string, unknown>,
		options: { apiVersion?: string; captureInfo?: boolean } = {},
	): Promise<{ response: MondayGraphQLResponse; requestInfo?: MondayRequestInfo }> {
		const body: IDataObject = { query };
		if (variables) {
			body.variables = variables;
		}

		try {
			const raw = await this.context.helpers.httpRequestWithAuthentication.call(
				this.context,
				this.getCredentialType(),
				{
					method: 'POST',
					url: MONDAY_API_URL,
					body,
					json: true,
					returnFullResponse: options.captureInfo === true,
					headers: mondayRequestHeaders({
						'API-Version': options.apiVersion ?? this.apiVersion,
					}),
				},
			);

			if (!options.captureInfo) {
				return { response: raw as MondayGraphQLResponse };
			}

			const full = raw as {
				body: MondayGraphQLResponse;
				statusCode?: number;
				headers?: Record<string, string>;
			};
			const headers = full.headers ?? {};
			const requestInfo: MondayRequestInfo = {
				requestId: headers['x-request-id'],
				apiVersion: headers['api-version'],
				statusCode: full.statusCode,
				rateLimit: parseRateLimitHeader(headers.ratelimit),
				rateLimitPolicy: parseRateLimitHeader(headers['ratelimit-policy']),
			};
			return { response: full.body, requestInfo };
		} catch (error) {
			// HTTP-level errors (4xx, 5xx) and network failures
			if (error instanceof Error) {
				const statusCode = this.extractStatusCode(error);
				// 401 throws at the HTTP layer before we ever see the GraphQL body —
				// surface it as an auth problem, not a generic HTTP failure.
				const isAuthFailure = statusCode === 401 || statusCode === 403;
				let description = isAuthFailure
					? 'Invalid API token or insufficient permissions. Check your monday.com API token.'
					: error.message;
				const trace = formatErrorTrace(this.extractRequestId(error), statusCode);
				if (trace) {
					description = description ? `${description} (${trace})` : trace;
				}
				const nodeApiError = new NodeApiError(
					this.context.getNode(),
					error as unknown as JsonObject,
					{
						message: isAuthFailure ? 'Authentication failed' : 'HTTP request failed',
						description,
					},
				);
				// 429 and 5xx are transient; so are network errors with no status at all.
				(nodeApiError as NodeApiError & RetryableErrorMarker).mondayRetryable =
					statusCode === undefined || statusCode === 429 || statusCode >= 500;
				throw nodeApiError;
			}
			// Non-Error throw (can't happen in practice); keep the raw value.
			throw error;
		}
	}

	/**
	 * Pull monday's x-request-id header out of whatever error shape n8n's
	 * request helper threw, when the response got far enough to have one.
	 */
	private extractRequestId(error: Error): string | undefined {
		const candidate = error as Error & {
			response?: { headers?: Record<string, string> };
			headers?: Record<string, string>;
		};
		return candidate.response?.headers?.['x-request-id'] ?? candidate.headers?.['x-request-id'];
	}

	/**
	 * Pull an HTTP status code out of whatever error shape n8n's request helper threw
	 */
	private extractStatusCode(error: Error): number | undefined {
		const candidate = error as Error & {
			httpCode?: number | string;
			statusCode?: number;
			response?: { status?: number };
		};
		const raw = candidate.httpCode ?? candidate.statusCode ?? candidate.response?.status;
		if (raw === undefined) return undefined;
		const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
		return Number.isNaN(parsed) ? undefined : parsed;
	}

	/**
	 * Check if an error is retryable — only errors this client explicitly
	 * marked as transient (rate limit, complexity budget, 5xx, network).
	 */
	private isRetryableError(error: unknown): boolean {
		return (error as RetryableErrorMarker)?.mondayRetryable === true;
	}

	/**
	 * Map monday.com API errors to actionable n8n NodeApiError messages
	 */
	private mapError(error: MondayGraphQLError, response: MondayGraphQLResponse): NodeApiError {
		const node = this.context.getNode();
		// monday moved error codes from the top level (legacy) to per-error
		// extensions (current format, verified live 2026-07). Support both.
		const errorCode = error.extensions?.code || error.error_code || MondayErrorCode.GenericError;

		let userMessage = error.message;
		let description = '';

		switch (errorCode) {
			case MondayErrorCode.ComplexityException:
				userMessage = 'GraphQL query too complex';
				description =
					'The query exceeded monday.com complexity budget. Reduce the amount of data requested or paginate results. ' +
					'Retry after a delay.';
				if (response.extensions?.retry_in_seconds) {
					description += ` Suggested retry delay: ${response.extensions.retry_in_seconds}s`;
				}
				break;

			case MondayErrorCode.MutationCallsExceeded:
				userMessage = 'Rate limit exceeded';
				description =
					'Too many mutations in a short time. Wait before retrying. The node will auto-retry with backoff.';
				if (response.extensions?.retry_in_seconds) {
					description += ` Suggested retry delay: ${response.extensions.retry_in_seconds}s`;
				}
				break;

			case MondayErrorCode.ColumnValueException:
				userMessage = 'Invalid column value';
				description =
					'The column value format is invalid. Check the column type and ensure the value matches ' +
					'the expected format (status label IDs, dropdown IDs, people IDs, etc.).';
				break;

			case MondayErrorCode.InvalidBoardIdException:
				userMessage = 'Invalid or inaccessible board';
				description = 'The board ID does not exist or you do not have access to it.';
				break;

			case MondayErrorCode.InvalidItemIdException:
				userMessage = 'Invalid or inaccessible item';
				description = 'The item ID does not exist or you do not have access to it.';
				break;

			case MondayErrorCode.InvalidGroupIdException:
				userMessage = 'Invalid or inaccessible group';
				description = 'The group ID does not exist or does not belong to the board.';
				break;

			case MondayErrorCode.ResourceNotFound:
				userMessage = 'Resource not found';
				description = 'The requested resource does not exist.';
				break;

			case MondayErrorCode.Unauthorized:
			case MondayErrorCode.NotAuthenticated:
				userMessage = 'Authentication failed';
				description =
					'Invalid API token or insufficient permissions. Check your monday.com API token.';
				break;

			case MondayErrorCode.RateLimited:
				userMessage = 'Rate limited';
				description = 'Too many requests. The node will auto-retry with backoff.';
				break;

			case MondayErrorCode.NotImplemented:
				userMessage = 'Feature not available';
				description = 'This operation is not available in your monday.com plan or region.';
				break;

			case MondayErrorCode.DataValidationsError: {
				userMessage = 'Board validation rules rejected the values';
				const failures = formatValidationFailures(error.extensions?.error_data);
				description = failures
					? `The board's validation rules or required columns rejected this request: ${failures}. ` +
						'Fix the offending values, or review the board validations (Validation resource).'
					: 'The board has validation rules or required columns that this request violates.';
				break;
			}

			case MondayErrorCode.UserUnauthorized: {
				const failureReason = String(
					(error.extensions?.error_data as IDataObject | undefined)?.failure_reason ?? '',
				);
				// Validations are plan-gated: free/standard accounts get this
				// exact failure_reason pair (verified live 2026-07-17).
				if (
					failureReason.includes('data_validation_rules') ||
					failureReason.includes('required_columns')
				) {
					userMessage = 'Feature requires a Pro or Enterprise plan';
					description =
						'Board validations (validation rules and required columns) are only available on ' +
						'monday.com Pro and Enterprise accounts, and require permission to edit column settings on the board.';
				} else {
					userMessage = 'Not authorized to perform this action';
					description =
						'Your monday.com user or API token lacks the permission this action needs. ' +
						'Check board permissions and your account plan.';
				}
				break;
			}

			default:
				description = `Error details: ${error.message}`;
		}

		// Always include the trace info support will ask for. GraphQL errors
		// ride on HTTP 200; the per-error status_code is more meaningful.
		const trace = formatErrorTrace(
			response.extensions?.request_id,
			error.extensions?.status_code ?? error.status_code,
		);
		if (trace) {
			description = description ? `${description} (${trace})` : trace;
		}

		const nodeApiError = new NodeApiError(node, error as unknown as JsonObject, {
			message: userMessage,
			description,
		});

		// Mark transient errors so the retry loop can identify them without
		// re-parsing message strings.
		const retryableCodes: Array<MondayErrorCode | string> = [
			MondayErrorCode.ComplexityException,
			MondayErrorCode.MutationCallsExceeded,
			MondayErrorCode.RateLimited,
		];
		if (retryableCodes.includes(errorCode)) {
			const marked = nodeApiError as NodeApiError & RetryableErrorMarker;
			marked.mondayRetryable = true;
			marked.mondayRetryInSeconds =
				error.extensions?.retry_in_seconds ??
				error.retry_in_seconds ??
				response.extensions?.retry_in_seconds;
		}

		return nodeApiError;
	}
}
