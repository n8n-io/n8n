import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { leadCustomFieldsOnly } from '../../helpers';
import type { ICustomProperties } from '../../transport';
import { pipedriveGetCustomProperties } from '../../transport';

export interface LeadCustomProperties {
	/** Custom field metadata, or undefined when it is not needed */
	customProperties?: ICustomProperties;
	/** Set when loading failed and the node continues on fail; each item reports it */
	error?: Error;
	/** Whether output custom field keys are resolved to names (version 2.1 and later) */
	resolveOutput: boolean;
}

/**
 * Loads the lead custom field metadata once for all items.
 *
 * Version 2 lead operations did not read the lead fields. They still do not, unless an
 * item sets a custom field. Resolving output keys to names starts with version 2.1, so
 * leads created on version 2 keep the raw Pipedrive keys they returned before.
 */
export async function loadLeadCustomProperties(
	this: IExecuteFunctions,
	fieldsParameter: 'additionalFields' | 'updateFields',
): Promise<LeadCustomProperties> {
	const resolveOutput = this.getNode().typeVersion >= 2.1;
	const rawKeys = this.getNodeParameter('rawCustomFieldKeys', 0, false) as boolean;
	const usesCustomFields = this.getInputData().some(
		(_, i) =>
			(this.getNodeParameter(fieldsParameter, i, {}) as IDataObject).customFields !== undefined,
	);

	if (rawKeys || !(resolveOutput || usesCustomFields)) {
		return { resolveOutput };
	}

	try {
		const customProperties = await pipedriveGetCustomProperties.call(this, 'lead');
		return { customProperties: leadCustomFieldsOnly(customProperties), resolveOutput };
	} catch (error) {
		if (!this.continueOnFail()) throw error;
		return { error: error as Error, resolveOutput };
	}
}
