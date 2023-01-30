/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line max-classes-per-file
import { parseString } from 'xml2js';
import type { IDataObject, INode, IStatusCodeMessages, JsonObject } from './Interfaces';

/**
 * Top-level properties where an error message can be found in an API response.
 */
const ERROR_MESSAGE_PROPERTIES = [
	'cause',
	'error',
	'message',
	'Message',
	'msg',
	'messages',
	'description',
	'reason',
	'detail',
	'details',
	'errors',
	'errorMessage',
	'errorMessages',
	'ErrorMessage',
	'error_message',
	'_error_message',
	'errorDescription',
	'error_description',
	'error_summary',
	'title',
	'text',
	'field',
	'err',
	'type',
];

/**
 * Top-level properties where an HTTP error code can be found in an API response.
 */
const ERROR_STATUS_PROPERTIES = [
	'statusCode',
	'status',
	'code',
	'status_code',
	'errorCode',
	'error_code',
];

/**
 * Properties where a nested object can be found in an API response.
 */
const ERROR_NESTING_PROPERTIES = ['error', 'err', 'response', 'body', 'data'];

interface ExecutionBaseErrorOptions {
	cause?: Error | JsonObject;
}

export abstract class ExecutionBaseError extends Error {
	description: string | null | undefined;

	cause: Error | JsonObject | undefined;

	timestamp: number;

	context: IDataObject = {};

	lineNumber: number | undefined;

	constructor(message: string, { cause }: ExecutionBaseErrorOptions) {
		const options = cause instanceof Error ? { cause } : {};
		super(message, options);

		this.name = this.constructor.name;
		this.timestamp = Date.now();

		if (cause instanceof ExecutionBaseError) {
			this.context = cause.context;
		} else if (cause && !(cause instanceof Error)) {
			this.cause = cause;
		}
	}
}

/**
 * Base class for specific NodeError-types, with functionality for finding
 * a value recursively inside an error object.
 */
abstract class NodeError extends ExecutionBaseError {
	node: INode;

	constructor(node: INode, error: Error | JsonObject) {
		const message = error instanceof Error ? error.message : '';
		super(message, { cause: error });
		this.node = node;
	}

	/**
	 * Finds property through exploration based on potential keys and traversal keys.
	 * Depth-first approach.
	 *
	 * This method iterates over `potentialKeys` and, if the value at the key is a
	 * truthy value, the type of the value is checked:
	 * (1) if a string or number, the value is returned as a string; or
	 * (2) if an array,
	 * 		its string or number elements are collected as a long string,
	 * 		its object elements are traversed recursively (restart this function
	 *    with each object as a starting point), or
	 * (3) if it is an object, it traverses the object and nested ones recursively
	 * 		based on the `potentialKeys` and returns a string if found.
	 *
	 * If nothing found via `potentialKeys` this method iterates over `traversalKeys` and
	 * if the value at the key is a traversable object, it restarts with the object as the
	 * new starting point (recursion).
	 * If nothing found for any of the `traversalKeys`, exploration continues with remaining
	 * `traversalKeys`.
	 *
	 * Otherwise, if all the paths have been exhausted and no value is eligible, `null` is
	 * returned.
	 *
	 */
	protected findProperty(
		jsonError: JsonObject,
		potentialKeys: string[],
		traversalKeys: string[] = [],
	): string | null {
		// eslint-disable-next-line no-restricted-syntax
		for (const key of potentialKeys) {
			const value = jsonError[key];
			if (value) {
				if (typeof value === 'string') return value;
				if (typeof value === 'number') return value.toString();
				if (Array.isArray(value)) {
					const resolvedErrors: string[] = value
						.map((jsonError) => {
							if (typeof jsonError === 'string') return jsonError;
							if (typeof jsonError === 'number') return jsonError.toString();
							if (this.isTraversableObject(jsonError)) {
								return this.findProperty(jsonError, potentialKeys);
							}
							return null;
						})
						.filter((errorValue): errorValue is string => errorValue !== null);

					if (resolvedErrors.length === 0) {
						return null;
					}
					return resolvedErrors.join(' | ');
				}
				if (this.isTraversableObject(value)) {
					const property = this.findProperty(value, potentialKeys);
					if (property) {
						return property;
					}
				}
			}
		}

		// eslint-disable-next-line no-restricted-syntax
		for (const key of traversalKeys) {
			const value = jsonError[key];
			if (this.isTraversableObject(value)) {
				const property = this.findProperty(value, potentialKeys, traversalKeys);
				if (property) {
					return property;
				}
			}
		}

		return null;
	}

	/**
	 * Check if a value is an object with at least one key, i.e. it can be traversed.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected isTraversableObject(value: any): value is JsonObject {
		return (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			!!Object.keys(value).length
		);
	}

	/**
	 * Remove circular references from objects.
	 */
	protected removeCircularRefs(obj: JsonObject, seen = new Set()) {
		seen.add(obj);
		Object.entries(obj).forEach(([key, value]) => {
			if (this.isTraversableObject(value)) {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				seen.has(value)
					? (obj[key] = { circularReference: true })
					: this.removeCircularRefs(value, seen);
				return;
			}
			if (Array.isArray(value)) {
				value.forEach((val, index) => {
					if (seen.has(val)) {
						value[index] = { circularReference: true };
						return;
					}
					if (this.isTraversableObject(val)) {
						this.removeCircularRefs(val, seen);
					}
				});
			}
		});
	}
}

interface NodeOperationErrorOptions {
	message?: string;
	description?: string;
	runIndex?: number;
	itemIndex?: number;
}

/**
 * Class for instantiating an operational error, e.g. an invalid credentials error.
 */
export class NodeOperationError extends NodeError {
	lineNumber: number | undefined;

	constructor(node: INode, error: Error | string, options: NodeOperationErrorOptions = {}) {
		if (typeof error === 'string') {
			error = new Error(error);
		}
		super(node, error);

		if (options.message) {
			this.message = options.message;
		}
		this.description = options.description;
		this.context.runIndex = options.runIndex;
		this.context.itemIndex = options.itemIndex;
	}
}

const STATUS_CODE_MESSAGES: IStatusCodeMessages = {
	'4XX': 'Your request is invalid or could not be processed by the service',
	'400': 'Bad request - please check your parameters',
	'401': 'Authorization failed - please check your credentials',
	'402': 'Payment required - perhaps check your payment details?',
	'403': 'Forbidden - perhaps check your credentials?',
	'404': 'The resource you are requesting could not be found',
	'405': 'Method not allowed - please check you are using the right HTTP method',
	'429': 'The service is receiving too many requests from you! Perhaps take a break?',

	'5XX': 'The service failed to process your request',
	'500': 'The service was not able to process your request',
	'502': 'Bad gateway - the service failed to handle your request',
	'503': 'Service unavailable - perhaps try again later?',
	'504': 'Gateway timed out - perhaps try again later?',

	ECONNREFUSED: 'The service refused the connection - perhaps it is offline',
};

const UNKNOWN_ERROR_MESSAGE = 'UNKNOWN ERROR - check the detailed error for more information';
const UNKNOWN_ERROR_MESSAGE_CRED = 'UNKNOWN ERROR';

interface NodeApiErrorOptions extends NodeOperationErrorOptions {
	message?: string;
	httpCode?: string;
	parseXml?: boolean;
}

/**
 * Class for instantiating an error in an API response, e.g. a 404 Not Found response,
 * with an HTTP error code, an error message and a description.
 */
export class NodeApiError extends NodeError {
	httpCode: string | null;

	constructor(
		node: INode,
		error: JsonObject,
		{ message, description, httpCode, parseXml, runIndex, itemIndex }: NodeApiErrorOptions = {},
	) {
		super(node, error);
		if (error.error) {
			// only for request library error
			this.removeCircularRefs(error.error as JsonObject);
		}

		// if it's an error generated by axios
		// look for descriptions in the response object
		if (error.reason) {
			const reason: IDataObject = error.reason as unknown as IDataObject;
			if (reason.isAxiosError && reason.response) {
				error = reason.response as JsonObject;
			}
		}

		if (message) {
			this.message = message;
			this.description = description;
			this.httpCode = httpCode ?? null;
			return;
		}

		this.httpCode = this.findProperty(error, ERROR_STATUS_PROPERTIES, ERROR_NESTING_PROPERTIES);
		this.setMessage();

		if (parseXml) {
			this.setDescriptionFromXml(error.error as string);
			return;
		}

		this.description = this.findProperty(error, ERROR_MESSAGE_PROPERTIES, ERROR_NESTING_PROPERTIES);

		if (runIndex !== undefined) this.context.runIndex = runIndex;
		if (itemIndex !== undefined) this.context.itemIndex = itemIndex;
	}

	private setDescriptionFromXml(xml: string) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		parseString(xml, { explicitArray: false }, (_, result) => {
			if (!result) return;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			const topLevelKey = Object.keys(result)[0];
			this.description = this.findProperty(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				result[topLevelKey],
				ERROR_MESSAGE_PROPERTIES,
				['Error'].concat(ERROR_NESTING_PROPERTIES),
			);
		});
	}

	/**
	 * Set the error's message based on the HTTP status code.
	 *
	 */
	private setMessage() {
		if (!this.httpCode) {
			this.httpCode = null;
			this.message = UNKNOWN_ERROR_MESSAGE;
			return;
		}

		if (STATUS_CODE_MESSAGES[this.httpCode]) {
			this.message = STATUS_CODE_MESSAGES[this.httpCode];
			return;
		}

		switch (this.httpCode.charAt(0)) {
			case '4':
				this.message = STATUS_CODE_MESSAGES['4XX'];
				break;
			case '5':
				this.message = STATUS_CODE_MESSAGES['5XX'];
				break;
			default:
				this.message = UNKNOWN_ERROR_MESSAGE;
		}
		if (this.node.type === 'n8n-nodes-base.noOp' && this.message === UNKNOWN_ERROR_MESSAGE) {
			this.message = `${UNKNOWN_ERROR_MESSAGE_CRED} - ${this.httpCode}`;
		}
	}
}
