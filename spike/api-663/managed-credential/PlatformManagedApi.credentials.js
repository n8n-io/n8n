'use strict';

// Approach A. Example credential type for N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi.
// n8n loads it from the folder in N8N_CUSTOM_EXTENSIONS, like a custom node. It is never
// stored. A node references it in the workflow JSON with only an ORD ID:
// `{ "id": null, "name": "Outlook", "ordId": "<ORD ID>" }`. n8n sends that ORD ID with every
// request of the node, with no secret, and the external gateway adds the real one.
// The platform can change the name, display name and notice.
class PlatformManagedApi {
	constructor() {
		this.name = 'platformManagedApi';
		this.displayName = 'Managed by platform';
		this.icon = 'fa:building';
		this.properties = [
			{
				displayName:
					'The platform adds the real credentials when the request leaves n8n. Nothing to configure here.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		];
		// The editor shows this credential as a fixed, disabled value.
		this.systemManaged = true;
		// Lists the type under HTTP Request > Predefined Credential Type.
		this.httpRequestNode = { name: 'Managed by platform', docsUrl: '', apiBaseUrlPlaceholder: 'https://' };
		// Adds nothing to the request. HTTP Request lists only types that define `authenticate`.
		this.authenticate = { type: 'generic', properties: {} };
	}
}

module.exports = { PlatformManagedApi };
