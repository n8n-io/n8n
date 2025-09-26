/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Respond to Webhook node parameters for version 1.5
 */
export interface RespondToWebhookNodeParametersV1_5 {
	/** What to respond with */
	respondWith?:
		| 'allIncomingItems'
		| 'firstIncomingItem'
		| 'noData'
		| 'json'
		| 'text'
		| 'redirect'
		| 'binary';
	/** Response body content */
	responseBody?: string;
	options?: {
		/** HTTP response status code */
		responseCode?: number;
		/** Custom response headers */
		responseHeaders?: {
			entries?: {
				name?: string;
				value?: string;
			}[];
		};
	};
}

/**
 * Convenience alias for the latest respond to webhook node parameters
 */
export type RespondToWebhookNodeParameters = RespondToWebhookNodeParametersV1_5;
