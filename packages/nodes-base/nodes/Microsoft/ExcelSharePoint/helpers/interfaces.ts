import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Used as `this` by every helper in this node (credential resolution, error
// mapping, the request itself), so it earns a shared home unlike the other
// types here, which each live next to their one real consumer.
export type AuthContext = IExecuteFunctions | ILoadOptionsFunctions;
