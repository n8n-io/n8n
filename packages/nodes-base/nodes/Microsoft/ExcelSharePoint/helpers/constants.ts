export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

export type ExcelSharePointCredentialType = 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;

export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Consulted on 403s so the error names the missing permission; each action adds its row.
export const REQUIRED_PERMISSIONS: Record<string, { delegated: string; application: string }> = {
	'worksheet:readRows': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
	'worksheet:append': {
		delegated: 'Sites.ReadWrite.All',
		application: 'Sites.ReadWrite.All (or Sites.Selected granted for this site)',
	},
	'worksheet:clear': {
		delegated: 'Sites.ReadWrite.All',
		application: 'Sites.ReadWrite.All (or Sites.Selected granted for this site)',
	},
	'worksheet:deleteWorksheet': {
		delegated: 'Sites.ReadWrite.All',
		application: 'Sites.ReadWrite.All (or Sites.Selected granted for this site)',
	},
	'worksheet:getAll': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
	'table:getAll': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
};

// A 404 can come from any of the location segments, so the message must not
// single one out
export const NOT_FOUND_MESSAGE =
	'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.';

// Graph's real not-found code is 'ItemNotFound' (verified against a live tenant); 'NotFound'
// is kept as a defensive fallback for other Graph surfaces that may use the generic OData code.
// Match on code alone, not the message text, which Microsoft doesn't treat as a stable contract.
export const NOT_FOUND_CODES = ['ItemNotFound', 'NotFound'];
