import type { IExecuteFunctions, IDataObject, ILoadOptionsFunctions, IHttpRequestMethods } from 'n8n-workflow';
export declare function grafanaApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<any>;
export declare function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string, updateFields: IDataObject): void;
export declare function deriveUid(this: IExecuteFunctions, uidOrUrl: string): string;
//# sourceMappingURL=GenericFunctions.d.ts.map