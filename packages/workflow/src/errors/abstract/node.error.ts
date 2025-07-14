import { ExecutionBaseError } from './execution-base.error';
import type { IDataObject, INode, JsonObject } from '../../interfaces';
import { isTraversableObject, jsonParse } from '../../utils';

/**
 * Descriptive messages for common errors.
 */
const COMMON_ERRORS: IDataObject = {
	// nodeJS errors
	ECONNREFUSED: 'The service refused the connection - perhaps it is offline',
	ECONNRESET:
		'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
	ENOTFOUND:
		'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
	ETIMEDOUT:
		"The connection timed out, consider setting the 'Retry on Fail' option in the node settings",
	ERRADDRINUSE:
		'The port is already occupied by some other application, if possible change the port or kill the application that is using it',
	EADDRNOTAVAIL: 'The address is not available, ensure that you have the right IP address',
	ECONNABORTED: 'The connection was aborted, perhaps the server is offline',
	EHOSTUNREACH: 'The host is unreachable, perhaps the server is offline',
	EAI_AGAIN: 'The DNS server returned an error, perhaps the server is offline',
	ENOENT: 'The file or directory does not exist',
	EISDIR: 'The file path was expected but the given path is a directory',
	ENOTDIR: 'The directory path was expected but the given path is a file',
	EACCES: 'Forbidden by access permissions, make sure you have the right permissions',
	EEXIST: 'The file or directory already exists',
	EPERM: 'Operation not permitted, make sure you have the right permissions',
	// other errors
	GETADDRINFO: 'The server closed the connection unexpectedly',
};

/**
 * Base class for specific NodeError-types, with functionality for finding
 * a value recursively inside an error object.
 */
export abstract class NodeError extends ExecutionBaseError {
	messages: string[] = [];

	constructor(
		readonly node: INode,
		error: Error | JsonObject,
	) {
		const isError = error instanceof Error;
		const message = isError ? error.message : '';
		const options = isError ? { cause: error } : { errorResponse: error };
		super(message, options);

		if (error instanceof NodeError) {
			this.tags.reWrapped = true;
		}
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
		for (const key of potentialKeys) {
			let value = jsonError[key];
			if (value) {
				if (typeof value === 'string') {
					try {
						value = jsonParse(value);
					} catch (error) {
						return value as string;
					}
					if (typeof value === 'string') return value;
				}
				if (typeof value === 'number') return value.toString();
				if (Array.isArray(value)) {
					const resolvedErrors: string[] = value

						.map((jsonError) => {
							if (typeof jsonError === 'string') return jsonError;
							if (typeof jsonError === 'number') return jsonError.toString();
							if (isTraversableObject(jsonError)) {
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
				if (isTraversableObject(value)) {
					const property = this.findProperty(value, potentialKeys);
					if (property) {
						return property;
					}
				}
			}
		}

		for (const key of traversalKeys) {
			const value = jsonError[key];
			if (isTraversableObject(value)) {
				const property = this.findProperty(value, potentialKeys, traversalKeys);
				if (property) {
					return property;
				}
			}
		}

		return null;
	}

	/**
	 * Preserve the original error message before setting the new one
	 */
	protected addToMessages(message: string): void {
		if (message && !this.messages.includes(message)) {
			this.messages.push(message);
		}
	}

	/**
	 * Set descriptive error message if code is provided or if message contains any of the common errors,
	 * update description to include original message plus the description
	 */
	protected setDescriptiveErrorMessage(
		message: string,
		messages: string[],
		code?: string | null,
		messageMapping?: { [key: string]: string },
	): [string, string[]] {
		let newMessage = message;

		if (messageMapping) {
			for (const [mapKey, mapMessage] of Object.entries(messageMapping)) {
				if ((message || '').toUpperCase().includes(mapKey.toUpperCase())) {
					newMessage = mapMessage;
					messages.push(message);
					break;
				}
			}
			if (newMessage !== message) {
				return [newMessage, messages];
			}
		}

		// if code is provided and it is in the list of common errors set the message and return early
		if (code && typeof code === 'string' && COMMON_ERRORS[code.toUpperCase()]) {
			newMessage = COMMON_ERRORS[code] as string;
			messages.push(message);
			return [newMessage, messages];
		}

		// check if message contains any of the common errors and set the message and description
		for (const [errorCode, errorDescriptiveMessage] of Object.entries(COMMON_ERRORS)) {
			if ((message || '').toUpperCase().includes(errorCode.toUpperCase())) {
				newMessage = errorDescriptiveMessage as string;
				messages.push(message);
				break;
			}
		}

		return [newMessage, messages];
	}
}
