/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Set node parameters for version 3.4
 */
export interface SetNodeParametersV3_4 {
	/** Mode for setting values */
	mode?: 'manual' | 'raw';
	/** Field assignments when in manual mode */
	assignments?: {
		assignments: Array<{
			/** Unique identifier for the assignment */
			id: string;
			/** Field name to set */
			name: string;
			/** Value to assign */
			value: string | number | boolean;
			/** Type of the value */
			type: 'string' | 'number' | 'boolean' | 'array' | 'object';
		}>;
	};
	/** Whether to include other fields from input */
	includeOtherFields?: boolean;
	/** Additional options */
	options?: Record<string, unknown>;
}

/**
 * Convenience alias for the latest set node parameters
 */
export type SetNodeParameters = SetNodeParametersV3_4;
