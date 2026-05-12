import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type TagEntry = { name?: string; value?: unknown };

export class SetTelemetryTags implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Set Telemetry Tags',
		name: 'setTelemetryTags',
		icon: 'fa:tags',
		iconColor: 'black',
		group: ['organization'],
		version: 1,
		description: 'Attach custom tags to this execution’s telemetry spans',
		defaults: {
			name: 'Set Telemetry Tags',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Tags',
				name: 'tags',
				placeholder: 'Add Tag',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'tag',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the telemetry tag',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the telemetry tag. Supports expressions.',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		try {
			const tagsParam = this.getNodeParameter('tags', 0, {}) as { tag?: TagEntry[] };
			const entries = tagsParam.tag ?? [];

			const tracing: Record<string, string> = {};
			for (const entry of entries) {
				const key = entry.name?.trim();
				if (!key) continue;
				if (entry.value === undefined || entry.value === null) continue;
				tracing[key] = String(entry.value);
			}

			if (Object.keys(tracing).length > 0) {
				this.setMetadata({ tracing });
			}

			return [items];
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: error.message } }]];
			}
			throw error;
		}
	}
}
