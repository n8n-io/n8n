export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Consulted on 403s so the error names the missing permission; each action adds its row.
export const REQUIRED_PERMISSIONS: Record<string, { delegated: string; application: string }> = {
	'worksheet:readRows': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
};

// A 404 can come from any of the location segments, so the message must not
// single one out
export const NOT_FOUND_MESSAGE =
	'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.';
