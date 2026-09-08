import type { ICredentialDataDecryptedObject, ICredentialTestFunctions, IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeProperties, IPairedItemData, IHttpRequestMethods } from 'n8n-workflow';
export declare function getSchemaHeader(context: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, contextType: 'execute' | 'loadOptions'): IDataObject;
export declare function supabaseApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, resource: string, body?: IDataObject | IDataObject[], qs?: IDataObject, uri?: string, headers?: IDataObject): Promise<any>;
type SupabaseApiDefinition = {
    paths?: IDataObject;
    definitions?: {
        [table: string]: {
            properties?: {
                [column: string]: {
                    type: string;
                };
            };
        } | undefined;
    };
};
/**
 * Reads the PostgREST root document, which lists every table and column and so can run to
 * several megabytes. The editor opens one column dropdown per field and they all ask at
 * once, so overlapping callers share one request instead of a parsed copy each.
 */
export declare function getApiDefinition(this: ILoadOptionsFunctions): Promise<SupabaseApiDefinition>;
export declare function getFilters(resources: string[], operations: string[], { includeNoneOption, filterTypeDisplayName, filterFixedCollectionDisplayName, mustMatchOptions, }: {
    filterFixedCollectionDisplayName?: string | undefined;
    filterTypeDisplayName?: string | undefined;
    includeNoneOption?: boolean | undefined;
    mustMatchOptions?: {
        name: string;
        value: string;
    }[] | undefined;
}): INodeProperties[];
export declare const buildQuery: (query: Map<string, string>, value: IDataObject) => Map<string, string>;
export declare const buildOrQuery: (value: IDataObject) => string;
export declare const buildGetQuery: (query: Map<string, string>, value: IDataObject) => Map<string, string>;
export declare function validateCredentials(this: ICredentialTestFunctions, decryptedCredentials: ICredentialDataDecryptedObject): Promise<any>;
export declare function mapPairedItemsFrom<T>(iterable: Iterable<T> | ArrayLike<T>): IPairedItemData[];
export {};
//# sourceMappingURL=GenericFunctions.d.ts.map