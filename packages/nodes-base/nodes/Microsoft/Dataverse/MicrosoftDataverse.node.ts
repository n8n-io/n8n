import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getColumns, getEntitySets, searchEntitySets, searchRows } from './loadOptions';
import { RECORD_OPERATIONS, resolveOperation, toDropdownOption } from './operations';

export class MicrosoftDataverse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Dataverse',
		name: 'microsoftDataverse',
		icon: 'file:microsoftDataverse.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Microsoft Dataverse Web API',
		defaults: { name: 'Microsoft Dataverse' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'microsoftDataverseOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'row',
				options: [
					{
						name: 'Row',
						value: 'row',
						description: 'Read or write rows in a Dataverse table',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'getAll',
				displayOptions: { show: { resource: ['row'] } },
				// Generated from the RECORD_OPERATIONS registry so the op list lives in
				// exactly one place; the registry is ordered alphabetically by name.
				options: RECORD_OPERATIONS.map(toDropdownOption),
			},
			...RECORD_OPERATIONS.flatMap((op) => op.properties),
		],
	};

	methods = {
		loadOptions: {
			getEntitySets,
			getColumns,
		},
		listSearch: {
			searchEntitySets,
			searchRows,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let out: INodeExecutionData[] = [];
		const liveOps = RECORD_OPERATIONS.map((o) => o.value);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const op = resolveOperation(operation);
				if (!op) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}". Expected one of: ${liveOps.join(', ')}`,
						{ itemIndex: i },
					);
				}
				const result = await op.execute(this, i, 'microsoftDataverseOAuth2Api');
				const rows = Array.isArray(result) ? result : [result];
				const wrapped = this.helpers.returnJsonArray(rows as IDataObject[]);
				const meta = this.helpers.constructExecutionMetaData(wrapped, {
					itemData: { item: i },
				});
				out = out.concat(meta);
			} catch (error) {
				if (this.continueOnFail()) {
					const err = error as Error;
					out = out.concat({
						json: { error: err.message ?? String(err) },
						pairedItem: { item: i },
					});
					continue;
				}
				// Op modules already wrap raw HTTP failures in NodeApiError /
				// NodeOperationError. Preserve the original type so n8n's UI shows
				// the right context.
				throw error;
			}
		}

		return [out];
	}
}
