'use strict';

// Approach B. Example credential type for N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi.
// n8n loads it from the folder in N8N_CUSTOM_EXTENSIONS, like a custom node. It is never
// stored: n8n builds it at run time with no secret, and the external gateway adds the real one.
// The n8n code is the same as in approach A. This file has no fields and adds nothing to
// requests. The platform can change the name, display name and notice.
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
	// The editor shows this credential as a fixed, disabled value.
	systemManaged = true;
	// Lists the type under HTTP Request > Predefined Credential Type.
	httpRequestNode = { name: 'Managed by platform', docsUrl: '', apiBaseUrlPlaceholder: 'https://' };
	// Adds nothing to the request. HTTP Request lists only types that define `authenticate`.
	authenticate = { type: 'generic', properties: {} };
}

module.exports = { PlatformManagedApi };
