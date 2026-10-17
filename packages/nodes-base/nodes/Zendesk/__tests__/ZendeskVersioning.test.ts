import type { INodeProperties } from 'n8n-workflow';

import { Zendesk } from '../Zendesk.node';
import { ZendeskTrigger } from '../ZendeskTrigger.node';

function authFieldFor(properties: INodeProperties[], version: number) {
	return properties.find(
		(property) =>
			property.name === 'authentication' &&
			property.displayOptions?.show?.['@version']?.includes(version),
	);
}

describe.each([
	['Zendesk', new Zendesk().description],
	['Zendesk Trigger', new ZendeskTrigger().description],
])('%s authentication default', (_name, description) => {
	// No `defaultVersion`: every consumer falls back to the last/highest entry
	// in the array, and setting it would suppress the Custom API Call option.
	it('offers versions 1 and 1.1 so new nodes get 1.1', () => {
		expect(description.version).toEqual([1, 1.1]);
		expect(description.defaultVersion).toBeUndefined();
	});

	it('keeps API Token for v1 and uses OAuth2 for v1.1', () => {
		expect(authFieldFor(description.properties, 1)?.default).toBe('apiToken');
		expect(authFieldFor(description.properties, 1.1)?.default).toBe('oAuth2');
	});
});
