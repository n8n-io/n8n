import type { IDataObject, IExecuteFunctions, IExecuteSingleFunctions, IHttpRequestMethods, IHttpRequestOptions, ILoadOptionsFunctions, INode, INodeExecutionData, IN8nHttpFullResponse, INodePropertyOptions, INodeListSearchResult } from 'n8n-workflow';
/**
 * Validates a user ID before it is encoded into a Graph URL path. Graph accepts either an object
 * ID or a user principal name, guests included. The value is validated untrimmed, because the URL
 * interpolates it untrimmed. Both accepted alphabets are closed under substring, so no substring
 * of an accepted ID can contain `/ \ ? % #`.
 *
 * Exported for tests. Production callers must go through the `preSend` wrappers below, which also
 * refuse a stored extraction rule.
 */
export declare function validateEntraUserId(id: string, node: INode): void;
/**
 * Graph resolves `/groups/{id}` and `/directoryObjects/{id}` by object ID only. Exported for
 * tests, same caveat as {@link validateEntraUserId}.
 */
export declare function validateEntraGroupId(id: string, node: INode): void;
export declare function validateUserPreSend(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>;
export declare function validateGroupPreSend(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>;
export declare function microsoftApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject, headers?: IDataObject, url?: string): Promise<any>;
export declare function microsoftApiPaginateRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject, headers?: IDataObject, url?: string, itemIndex?: number): Promise<IDataObject[]>;
export declare function handleErrorPostReceive(this: IExecuteSingleFunctions, data: INodeExecutionData[], response: IN8nHttpFullResponse): Promise<INodeExecutionData[]>;
export declare function getGroupProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
export declare function getUserProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
export declare function getGroups(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
export declare function getUsers(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
//# sourceMappingURL=GenericFunctions.d.ts.map