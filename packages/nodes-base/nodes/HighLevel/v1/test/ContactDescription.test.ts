import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { contactFields, contactOperations } from '../description/ContactDescription';

// Reach into the actual routing config so the test breaks if the lookup
// operation stops sending its inputs as discrete query parameters.
const lookupOperation = (contactOperations[0].options as INodePropertyOptions[]).find(
	(option) => option.value === 'lookup',
);

const findLookupField = (name: string): INodeProperties => {
	const field = contactFields.find(
		(candidate) =>
			candidate.name === name &&
			((candidate.displayOptions?.show?.operation as string[] | undefined) ?? []).includes(
				'lookup',
			),
	);

	if (!field) {
		throw new Error(`Expected to find lookup field "${name}"`);
	}

	return field;
};

describe('HighLevel V1 - Contact Lookup query parameters', () => {
	it('builds the request from a static path, not by interpolating user input into the URL', () => {
		expect(lookupOperation?.routing?.request?.url).toBe('/contacts/lookup');
	});

	it('sends email and phone as discrete query parameters', () => {
		expect(findLookupField('email').routing?.send).toEqual({ type: 'query', property: 'email' });
		expect(findLookupField('phone').routing?.send).toEqual({ type: 'query', property: 'phone' });
	});
});
