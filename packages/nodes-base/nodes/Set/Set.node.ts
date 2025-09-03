import type {
	IDataObject,
	INodeParameters,
	INodeTypeBaseDescription,
	IVersionedNodeType,
} from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SetV1 } from './v1/SetV1.node';
import { SetV2 } from './v2/SetV2.node';
import { randomUUID } from 'crypto';

export class Set extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Set',
			name: 'set',
			icon: 'fa:pen',
			group: ['input'],
			description: 'Add or edit fields on an input item and optionally remove other fields',
			defaultVersion: 3.4,
			migrations: [
				{
					from: 3.2,
					to: 3.3,
					transform: (original) => {
						const values = ((original.fields as IDataObject)?.values ?? []) as IDataObject[];
						return {
							assignments: {
								assignments: values?.map((value) => {
									const valueType = (value.type as string) ?? 'stringValue';
									const type = valueType.replace('Value', '');
									return {
										id: randomUUID(),
										name: value.name,
										type,
										value: value[valueType],
									};
								}),
							},
						} as INodeParameters;
					},
				},
			],
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SetV1(baseDescription),
			2: new SetV1(baseDescription),
			3: new SetV2(baseDescription),
			3.1: new SetV2(baseDescription),
			3.2: new SetV2(baseDescription),
			3.3: new SetV2(baseDescription),
			3.4: new SetV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
