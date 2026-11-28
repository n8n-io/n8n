'use strict';

// Loaded through N8N_CUSTOM_EXTENSIONS. Set N8N_MANAGED_CREDENTIAL_TYPE to `name` so that every
// node uses this credential. Without it, each node accepts only its own credential types.
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
	// Adds nothing to requests. HTTP Request lists only credential types that have it.
	authenticate = { type: 'generic', properties: {} };
}

module.exports = { PlatformManagedApi };
