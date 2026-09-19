import type { INodePropertyOptions } from 'n8n-workflow';

import { contactOperations } from '../description/ContactDescription';
import { addCustomFieldsPreSendAction } from '../GenericFunctions';

const findContactOperation = (value: string) =>
	(contactOperations[0].options as INodePropertyOptions[]).find((option) => option.value === value);

describe('HighLevel V2 - Contact custom fields routing', () => {
	it('formats custom fields on Contact Create', () => {
		expect(findContactOperation('create')?.routing?.send?.preSend).toEqual(
			expect.arrayContaining([addCustomFieldsPreSendAction]),
		);
	});

	// n8n-io/n8n#35392: Update previously skipped this helper, so custom fields
	// were sent as `{ fieldId, field_value }` and HighLevel rejected the request.
	it('formats custom fields on Contact Update', () => {
		expect(findContactOperation('update')?.routing?.send?.preSend).toEqual(
			expect.arrayContaining([addCustomFieldsPreSendAction]),
		);
	});
});
