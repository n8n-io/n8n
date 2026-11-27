'use strict';

// Loaded through N8N_CUSTOM_EXTENSIONS. N8N_MANAGED_CREDENTIAL_TYPE must match `name`.
// No secret fields: the platform's gateway adds the real credentials outside n8n.
class PlatformManagedApi {
	name = 'platformManagedApi';
	displayName = 'Managed by platform';
	icon = 'fa:building';
	properties = [
		{
			displayName:
				'The platform adds the real credentials when the request leaves n8n. Nothing to configure here.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
	httpRequestNode = { name: 'Managed by platform', docsUrl: '', apiBaseUrlPlaceholder: 'https://' };
}

module.exports = { PlatformManagedApi };
