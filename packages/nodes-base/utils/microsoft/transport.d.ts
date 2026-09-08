import type { IExecuteFunctions, ILoadOptionsFunctions, IDataObject, IHttpRequestMethods, IHookFunctions, INode } from 'n8n-workflow';
/**
 * Credential-name literal of the shared `microsoftEntraServicePrincipalApi`
 * (app-only) credential. Used as both the `authentication` selector value and the
 * credential type, so a rename stays in one place.
 */
export declare const SERVICE_PRINCIPAL_AUTH = "microsoftEntraServicePrincipalApi";
/**
 * Field-level `displayOptions.hide` gate spread onto every operation/event/field
 * that has no usable app-only form. The slash-prefixed `/authentication` key
 * addresses the root selector from a nested field (distinct from the un-prefixed
 * `show.authentication` key used on the credential entries themselves).
 * Frozen so no import can mutate the contract (the inner array keeps the mutable
 * type `IDisplayOptions` expects, so only the key is locked).
 */
export declare const SP_HIDE: Readonly<{
    '/authentication': string[];
}>;
export type MicrosoftGraphCredentialType<TDefault extends string> = TDefault | 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;
/**
 * Validates a user-supplied Graph id (already `extractValue`-resolved) before it is
 * interpolated RAW into a Graph path, and returns the coerced, trimmed and
 * percent-decoded value. Teams URLs expose ids percent-encoded
 * (`19%3A...%40thread.tacv2`) and the RLC hints tell users to paste them, so the id
 * is decoded once and the decoded form is what gets validated and interpolated,
 * matching the raw shape list-sourced ids already travel in.
 * Throws a `NodeOperationError` with a fully static message (never echoing the id)
 * on a bad shape. Reused for both path IDs and `task:create` body IDs.
 */
export declare function validateMicrosoftGraphId(id: string, node: INode): string;
export type MicrosoftGraphPathSegment = string | {
    id: string;
};
/**
 * Single, non-bypassable path builder for every Graph path that interpolates a
 * user-supplied id. `segments` is an ordered mix of literal strings and id parts
 * (`{ id: value }`). Every `{ id }` is validated then interpolated RAW, under
 * both credential types. See `validateMicrosoftGraphId` / `GRAPH_ID_REJECT` for why
 * validation (not encoding) is the guard.
 */
export declare function buildMicrosoftGraphPath(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, segments: MicrosoftGraphPathSegment[]): string;
export declare function rewriteNotFound(this: IExecuteFunctions, error: unknown, message: string, description: string): unknown;
/**
 * Binds the shared Microsoft Graph transport to a node's default credential type;
 * the node facade calls this once at module load and re-exports the returned
 * functions. `defaultCredentialType` is the node's back-compat delegated OAuth2
 * default for legacy nodes with no stored `authentication` value: the node's own
 * credential literal, or the generic `'microsoftOAuth2Api'` where that is the
 * node's default (as in SharePoint v2). Never `SERVICE_PRINCIPAL_AUTH` (enforced
 * below): legacy nodes would silently resolve to the tenant-wide app-only
 * credential.
 *
 * Known SharePoint v2 deltas to fold in via factory config (not per-node forks)
 * when it adopts the kernel: injectable static messages (UserTargetMessages
 * pattern in nodes/Microsoft/GenericFunctions.ts), per-operation 403 permission
 * hints, safe-message allowlist, per-page headers and a negative-limit guard on
 * `microsoftApiRequestAllItems`.
 */
export declare function createMicrosoftGraphTransport<TDefault extends string>(config: {
    defaultCredentialType: TDefault;
}): {
    getCredentialType: (this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions) => MicrosoftGraphCredentialType<TDefault>;
    microsoftApiRequest: (this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, method: IHttpRequestMethods, resource: string, body?: any, qs?: IDataObject, uri?: string, headers?: IDataObject) => Promise<any>;
    microsoftApiRequestAllItems: (this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: IHttpRequestMethods, endpoint: string, body?: any, query?: IDataObject, limit?: number) => Promise<any>;
};
//# sourceMappingURL=transport.d.ts.map