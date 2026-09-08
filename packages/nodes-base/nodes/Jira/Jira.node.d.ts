import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeListSearchResult, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class Jira implements INodeType {
    description: INodeTypeDescription;
    methods: {
        listSearch: {
            getSites(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
            getProjects(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
            getIssueTypes(this: ILoadOptionsFunctions): Promise<INodeListSearchResult>;
            getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
            getPriorities(this: ILoadOptionsFunctions): Promise<INodeListSearchResult>;
            getTransitions(this: ILoadOptionsFunctions): Promise<INodeListSearchResult>;
            getCustomFields(this: ILoadOptionsFunctions): Promise<INodeListSearchResult>;
        };
        loadOptions: {
            getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getProjectComponents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=Jira.node.d.ts.map