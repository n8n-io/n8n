import { ICredentialTestFunction, IDataObject, IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, ILocalLoadOptionsFunctions, INodeExecutionData, INodeListSearchResult, INodePropertyOptions, INodeType, INodeTypeDescription, IPollFunctions, ISupplyDataFunctions, ITriggerFunctions, ITriggerResponse, IWebhookFunctions, IWebhookResponseData, NodeConnectionTypes, NodeExecutionWithMetadata, NodeParameterValueType, ResourceMapperFields, SupplyData } from "n8n-workflow";

export class VirtualAgent implements INodeType {
    description: INodeTypeDescription = {
        version: 1,
        defaults: {
					name: 'Virtual Agent'
				},
        inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.AiTool],
        outputs: [NodeConnectionTypes.Main],
        properties: [],
        displayName: "Virtual Agent",
        name: 'virtualAgent',
        group: ['output'],
        description: "Virtual Agent to execute tools in partial executions"

    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
		const resultData : INodeExecutionData[] = []

			const response = await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
			resultData.push({ json: response as any});

			return [resultData];
    }

}
