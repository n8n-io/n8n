import type { ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription, IPollFunctions } from 'n8n-workflow';
export declare const MAX_PENDING_FETCH_ATTEMPTS = 10;
export declare class GmailTrigger implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
}
//# sourceMappingURL=GmailTrigger.node.d.ts.map