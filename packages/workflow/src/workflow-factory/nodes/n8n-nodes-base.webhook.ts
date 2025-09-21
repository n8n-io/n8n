/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Webhook node parameters for version 2.1
 */
export interface WebhookNodeParametersV2_1 {
	/** HTTP method for the webhook endpoint */
	httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
	/** Path for the webhook endpoint */
	path?: string;
	/** Additional webhook options */
	options?: {
		/** Whether to return no response body */
		noResponseBody?: boolean;
		/** Whether to ignore bot requests */
		ignoreBots?: boolean;
		/** Whether to handle binary data */
		binaryData?: boolean;
		/** Whether to receive raw body data */
		rawBody?: boolean;
	};
	/** Authentication method */
	authentication?: 'none' | 'basicAuth' | 'headerAuth';
	/** How to handle the response */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
}

/**
 * Convenience alias for the latest webhook node parameters
 */
export type WebhookNodeParameters = WebhookNodeParametersV2_1;
