import type { IExecuteFunctions, IDataObject, ILoadOptionsFunctions, IHttpRequestMethods } from 'n8n-workflow';
import type { Zammad } from './types';
export declare function zammadApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<any>;
export declare function zammadApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject, limit?: number): Promise<IDataObject[]>;
export declare function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string): void;
export declare const prettifyDisplayName: (fieldName: string) => string;
export declare const fieldToLoadOption: (i: Zammad.Field) => {
    name: string;
    value: string;
};
export declare const isCustomer: (user: Zammad.User) => boolean;
export declare function getAllFields(this: ILoadOptionsFunctions): Promise<Zammad.Field[]>;
export declare const getGroupFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getOrganizationFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getUserFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getTicketFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getGroupCustomFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getOrganizationCustomFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getUserCustomFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const getTicketCustomFields: (arr: Zammad.Field[]) => Zammad.Field[];
export declare const isNotZammadFoundation: (i: Zammad.Organization) => boolean;
export declare const doesNotBelongToZammad: (i: Zammad.User) => boolean;
//# sourceMappingURL=GenericFunctions.d.ts.map