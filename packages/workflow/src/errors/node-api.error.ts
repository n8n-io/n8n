/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { AxiosError } from 'axios';
import { parseString } from 'xml2js';

import { NodeError } from './abstract/node.error';
import type { ErrorLevel } from '@n8n/errors';
import {
	NO_OP_NODE_TYPE,
	UNKNOWN_ERROR_DESCRIPTION,
	UNKNOWN_ERROR_MESSAGE,
	UNKNOWN_ERROR_MESSAGE_CRED,
} from '../constants';
import type {
	INode,
	JsonObject,
	IDataObject,
	IStatusCodeMessages,
	Functionality,
	RelatedExecution,
} from '../interfaces';
import { removeCircularRefs } from '../utils';

export interface NodeOperationErrorOptions {
	message?: string;
	description?: string;
	runIndex?: number;
	itemIndex?: number;
	level?: ErrorLevel;
	messageMapping?: { [key: string]: string }; // allows to pass custom mapping for error messages scoped to a node
	functionality?: Functionality;
	type?: string;
	metadata?: {
		subExecution?: RelatedExecution;
		parentExecution?: RelatedExecution;
	};
}

interface NodeApiErrorOptions extends NodeOperationErrorOptions {
	message?: string;
	httpCode?: string;
	parseXml?: boolean;
}

/**
 * Top-level properties where an error message can be found in an API response.
 * order is important, precedence is from top to bottom
 */
const POSSIBLE_ERROR_MESSAGE_KEYS = [
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
	'error_info',
	'title',
	'text',
	'field',
	'err',
	'type',
];

/**
 * Properties where a nested object can be found in an API response.
 */
const POSSIBLE_NESTED_ERROR_OBJECT_KEYS = ['Error', 'error', 'err', 'response', 'body', 'data'];

/**
 * Top-level properties where an HTTP error code can be found in an API response.
 */
const POSSIBLE_ERROR_STATUS_KEYS = [
	'statusCode',
	'status',
	'code',
	'status_code',
	'errorCode',
	'error_code',
];

/**
 * Descriptive messages for common HTTP status codes
 * this is used by NodeApiError class
 */
const STATUS_CODE_MESSAGES: IStatusCodeMessages = {
	'4XX': 'Your request is invalid or could not be processed by the service',
	'400': 'Bad request - please check your parameters',
	'401': 'Authorization failed - please check your credentials',
	'402': 'Payment required - perhaps check your payment details?',
	'403': 'Forbidden - perhaps check your credentials?',
	'404': 'The resource you are requesting could not be found',
	'405': 'Method not allowed - please check you are using the right HTTP method',
	'429': 'The service is receiving too many requests from you',

	'5XX': 'The service failed to process your request',
	'500': 'The service was not able to process your request',
	'502': 'Bad gateway - the service failed to handle your request',
	'503':
		'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
	'504': 'Gateway timed out - perhaps try again later?',
};

/**
 * Class for instantiating an error in an API response, e.g. a 404 Not Found response,
 * with an HTTP error code, an error message and a description.
 */
export class NodeApiError extends NodeError {
	httpCode: string | null = null;

	// eslint-disable-next-line complexity
	constructor(
		node: INode,
		errorResponse: JsonObject,
		{
			message,
			description,
			httpCode,
			parseXml,
			runIndex,
			itemIndex,
			level,
			functionality,
			messageMapping,
		}: NodeApiErrorOptions = {},
	) {
		if (errorResponse instanceof NodeApiError) {
			return errorResponse;
		}

		super(node, errorResponse);

		this.addToMessages(errorResponse.message as string);

		if (
			!httpCode &&
			errorResponse instanceof Error &&
			errorResponse.constructor?.name === 'AxiosError'
		) {
			httpCode = (errorResponse as unknown as AxiosError).response?.status?.toString();
		}

		// only for request library error
		if (errorResponse.error) {
			removeCircularRefs(errorResponse.error as JsonObject);
		}

		// if not description provided, try to find it in the error object

		if (
			!description &&
			(errorResponse.description || (errorResponse?.reason as IDataObject)?.description)
		) {
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			this.description = (errorResponse.description ||
				(errorResponse?.reason as IDataObject)?.description) as string;
		}

		// if not message provided, try to find it in the error object or set description as message

		if (
			!message &&
			(errorResponse.message || (errorResponse?.reason as IDataObject)?.message || description)
		) {
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			this.message = (errorResponse.message ||
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				(errorResponse?.reason as IDataObject)?.message ||
				description) as string;
		}

		// if it's an error generated by axios
		// look for descriptions in the response object
		if (errorResponse.reason) {
			const reason: IDataObject = errorResponse.reason as unknown as IDataObject;

			if (reason.isAxiosError && reason.response) {
				errorResponse = reason.response as JsonObject;
			}
		}

		// set http code of this error
		if (httpCode) {
			this.httpCode = httpCode;
		} else if (errorResponse.httpCode) {
			this.httpCode = errorResponse.httpCode as string;
		} else {
			this.httpCode =
				this.findProperty(
					errorResponse,
					POSSIBLE_ERROR_STATUS_KEYS,
					POSSIBLE_NESTED_ERROR_OBJECT_KEYS,
				) ?? null;
		}

		this.level = level ?? 'warning';

		if (
			errorResponse?.response &&
			typeof errorResponse?.response === 'object' &&
			!Array.isArray(errorResponse.response) &&
			errorResponse.response.data &&
			typeof errorResponse.response.data === 'object' &&
			!Array.isArray(errorResponse.response.data)
		) {
			const data = errorResponse.response.data;

			if (data.message) {
				description = data.message as string;
			} else if (data.error && ((data.error as IDataObject) || {}).message) {
				description = (data.error as IDataObject).message as string;
			}

			this.context.data = data;
		}

		// set description of this error
		if (description) {
			this.description = description;
		}

		if (!this.description) {
			if (parseXml) {
				this.setDescriptionFromXml(errorResponse.error as string);
			} else {
				this.description = this.findProperty(
					errorResponse,
					POSSIBLE_ERROR_MESSAGE_KEYS,
					POSSIBLE_NESTED_ERROR_OBJECT_KEYS,
				);
			}
		}

		// set message if provided
		// set default message based on http code
		// or use raw error message
		if (message) {
			this.message = message;
		} else {
			this.setDefaultStatusCodeMessage();
		}

		// if message and description are the same, unset redundant description
		if (this.message === this.description) {
			this.description = undefined;
		}

		// if message contain common error code set descriptive message and update description
		[this.message, this.messages] = this.setDescriptiveErrorMessage(
			this.message,
			this.messages,
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			this.httpCode ||
				(errorResponse?.code as string) ||
				((errorResponse?.reason as JsonObject)?.code as string) ||
				undefined,
			messageMapping,
		);

		if (functionality !== undefined) this.functionality = functionality;
		if (runIndex !== undefined) this.context.runIndex = runIndex;
		if (itemIndex !== undefined) this.context.itemIndex = itemIndex;
	}

	private setDescriptionFromXml(xml: string) {
		parseString(xml, { explicitArray: false }, (_, result) => {
			if (!result) return;

			const topLevelKey = Object.keys(result)[0];
			this.description = this.findProperty(
				result[topLevelKey],
				POSSIBLE_ERROR_MESSAGE_KEYS,
				POSSIBLE_NESTED_ERROR_OBJECT_KEYS,
			);
		});
	}

	/**
	 * Set the error's message based on the HTTP status code.
	 */
	private setDefaultStatusCodeMessage() {
		// Set generic error message for 502 Bad Gateway
		if (!this.httpCode && this.message && this.message.toLowerCase().includes('bad gateway')) {
			this.httpCode = '502';
		}

		if (!this.httpCode) {
			this.httpCode = null;

			if (!this.message) {
				if (this.description) {
					this.message = this.description;
					this.description = undefined;
				} else {
					this.message = UNKNOWN_ERROR_MESSAGE;
					this.description = UNKNOWN_ERROR_DESCRIPTION;
				}
			}
			return;
		}

		if (STATUS_CODE_MESSAGES[this.httpCode]) {
			this.addToMessages(this.message);
			this.message = STATUS_CODE_MESSAGES[this.httpCode];
			return;
		}

		switch (this.httpCode.charAt(0)) {
			case '4':
				this.addToMessages(this.message);
				this.message = STATUS_CODE_MESSAGES['4XX'];
				break;
			case '5':
				this.addToMessages(this.message);
				this.message = STATUS_CODE_MESSAGES['5XX'];
				break;
			default:
				if (!this.message) {
					if (this.description) {
						this.message = this.description;
						this.description = undefined;
					} else {
						this.message = UNKNOWN_ERROR_MESSAGE;
						this.description = UNKNOWN_ERROR_DESCRIPTION;
					}
				}
		}
		if (this.node.type === NO_OP_NODE_TYPE && this.message === UNKNOWN_ERROR_MESSAGE) {
			this.message = `${UNKNOWN_ERROR_MESSAGE_CRED} - ${this.httpCode}`;
		}
	}
}
