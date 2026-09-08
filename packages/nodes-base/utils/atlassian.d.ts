import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, INodeListSearchResult, INodeParameterResourceLocator, IPollFunctions, IWebhookFunctions } from 'n8n-workflow';
type AtlassianContext = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions | IWebhookFunctions;
export type AtlassianProduct = 'jira' | 'confluence';
export interface AccessibleResource {
    id: string;
    url: string;
    name?: string;
}
export declare function clearAtlassianAccessibleResourcesCache(): void;
/**
 * Extracts the hostname from a site URL pasted in any reasonable form: with or
 * without a scheme, with a trailing slash, with a path like /wiki, any casing.
 * Throws on input that doesn't contain a parseable hostname.
 */
export declare function extractAtlassianSiteHostname(siteUrl: string): string;
export declare function getAtlassianApiBaseUrl(product: AtlassianProduct, cloudId: string): string;
/**
 * Fetches the sites this OAuth2 connection can access, cached per credential
 * per process. `bypassCache` forces a refresh (used by site dropdowns so a
 * site granted after a reconnect shows up without a restart).
 */
export declare function fetchAtlassianAccessibleResources(this: AtlassianContext, credentialType: string, { bypassCache }?: {
    bypassCache?: boolean;
}): Promise<AccessibleResource[]>;
export declare function searchAtlassianSites(this: ILoadOptionsFunctions, credentialType: string, filter?: string): Promise<INodeListSearchResult>;
export declare function getAtlassianSiteParameter(ctx: AtlassianContext): INodeParameterResourceLocator | undefined;
/**
 * Resolves a site URL to its cloudId by matching its hostname (case-insensitively)
 * against the sites the OAuth2 connection can access.
 */
export declare function getAtlassianCloudId(this: AtlassianContext, credentialType: string, siteUrl: string, product: AtlassianProduct): Promise<string>;
/**
 * Resolves a node's top-level Site parameter to a cloudId. From List stores the
 * cloudId directly (accessible-resources returns it); By URL is hostname-matched
 * against the connection's sites; an empty value auto-resolves when the
 * connection reaches exactly one site and errors listing the candidates otherwise.
 */
export declare function resolveAtlassianCloudId(this: AtlassianContext, credentialType: string, site: INodeParameterResourceLocator | undefined, product: AtlassianProduct): Promise<string>;
export {};
//# sourceMappingURL=atlassian.d.ts.map