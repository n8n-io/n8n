import type { IDataObject, IExecuteFunctions, IHookFunctions, IHttpRequestMethods, ILoadOptionsFunctions, INode, INodeExecutionData, INodeProperties, IPairedItemData, IPollFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export type SortData = {
    key: string;
    type: string;
    direction: string;
    timestamp: boolean;
};
export declare function notionApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, method: IHttpRequestMethods, resource: string, body?: any, qs?: IDataObject, uri?: string, option?: IDataObject): Promise<any>;
export declare function notionApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, propertyName: string, method: IHttpRequestMethods, endpoint: string, body?: any, query?: IDataObject): Promise<any>;
export declare function notionApiRequestGetBlockChildrens(this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, blocks: IDataObject[], responseData?: IDataObject[], limit?: number): Promise<IDataObject[]>;
export declare function getBlockTypesOptions(): {
    name: string;
    value: string;
}[];
export declare function formatTitle(content: string): {
    title: {
        text: {
            content: string;
        };
    }[];
};
export declare function formatText(content: string): {
    text: {
        text: {
            content: string;
        };
    }[];
};
export declare function formatBlocks(blocks: IDataObject[]): {
    [x: string]: import("n8n-workflow").GenericValue;
    object: string;
    type: IDataObject[] | import("n8n-workflow").GenericValue[] | IDataObject | import("n8n-workflow").GenericValue;
}[];
export declare function mapProperties(this: IExecuteFunctions, properties: IDataObject[], timezone: string, version?: number): IDataObject;
export declare function mapSorting(data: SortData[]): {
    [x: string]: string;
    direction: string;
}[];
export declare function mapFilters(filtersList: IDataObject[], timezone: string): IDataObject;
export declare function simplifyProperties(properties: any): any;
export declare function getPropertyTitle(properties: {
    [key: string]: any;
}): any;
export declare function simplifyObjects(objects: any, download?: boolean, version?: number): IDataObject[];
export declare function getFormattedChildren(children: IDataObject[]): IDataObject[];
export declare function getConditions(): INodeProperties[];
export type FileRecord = {
    properties: {
        [key: string]: any | {
            id: string;
            type: string;
            files: [{
                external: {
                    url: string;
                };
            } | {
                file: {
                    url: string;
                };
            }];
        };
    };
};
export declare function downloadFiles(this: IExecuteFunctions | IPollFunctions, records: FileRecord[], pairedItem?: IPairedItemData[]): Promise<INodeExecutionData[]>;
export declare function extractPageId(page?: string): string;
export declare function getPageId(this: IExecuteFunctions, i: number): string;
export declare function extractResourceId(resource: string): string;
export declare function getSearchFilters(resource: string): ({
    placeholder?: undefined;
    displayName: string;
    name: string;
    type: string;
    options: {
        name: string;
        value: string;
    }[];
    displayOptions: {
        show: {
            resource: string[];
            operation: string[];
            filterType?: undefined;
        };
        hide: {
            '@version': number[];
        };
    };
    default: string;
    typeOptions?: undefined;
} | {
    placeholder?: undefined;
    displayName: string;
    name: string;
    type: string;
    options: {
        name: string;
        value: string;
    }[];
    displayOptions: {
        show: {
            resource: string[];
            operation: string[];
            filterType: string[];
        };
        hide: {
            '@version': number[];
        };
    };
    default: string;
    typeOptions?: undefined;
} | {
    displayName: string;
    name: string;
    type: string;
    typeOptions: {
        multipleValues: boolean;
    };
    displayOptions: {
        show: {
            resource: string[];
            operation: string[];
            filterType: string[];
        };
        hide: {
            '@version': number[];
        };
    };
    default: {};
    placeholder: string;
    options: {
        displayName: string;
        name: string;
        values: any[];
    }[];
} | {
    placeholder?: undefined;
    options?: undefined;
    typeOptions?: undefined;
    displayName: string;
    name: string;
    type: string;
    displayOptions: {
        show: {
            resource: string[];
            operation: string[];
            filterType: string[];
        };
        hide: {
            '@version': number[];
        };
    };
    default: string;
})[];
export declare function validateJSON(json: string | undefined): any;
/**
 * Manually extract a richtext's database mention RLC parameter.
 * @param blockValues the blockUi.blockValues node parameter.
 */
export declare function extractDatabaseMentionRLC(blockValues: IDataObject[]): void;
export declare function simplifyBlocksOutput(blocks: IDataObject[], rootId: string): IDataObject[];
export declare function extractBlockId(this: IExecuteFunctions, nodeVersion: number, itemIndex: number): string;
export declare const prepareNotionError: (node: INode, error: Error, itemIndex: number) => NodeApiError | NodeOperationError;
//# sourceMappingURL=GenericFunctions.d.ts.map