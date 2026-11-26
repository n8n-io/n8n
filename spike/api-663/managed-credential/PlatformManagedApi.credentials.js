'use strict';

// Approach A. Example credential type for N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi.
// n8n loads it from the folder in N8N_CUSTOM_EXTENSIONS, like a custom node. It is never
// stored. A node references it in the workflow JSON with the platform's data only:
// `{ "id": null, "name": "Outlook", "ordId": "<ORD ID>" }`. n8n gives that data to
// `authenticate` below as `$credentials`, and applies it to every request of the node.
// The platform can change the name, display name, notice, fields and `authenticate`.
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
			// Filled from the node in the workflow. A node without it stops before it sends anything.
			{ displayName: 'ORD ID', name: 'ordId', type: 'string', default: '', required: true },
		];
		// The editor shows this credential as a fixed, disabled value.
		this.systemManaged = true;
		// Lists the type under HTTP Request > Predefined Credential Type.
		this.httpRequestNode = { name: 'Managed by platform', docsUrl: '', apiBaseUrlPlaceholder: 'https://' };
		// Added to every request of the node. Never put a secret here.
		this.authenticate = { type: 'generic', properties: { headers: { ordID: '={{$credentials.ordId}}' } } };
	}
}

module.exports = { PlatformManagedApi };
