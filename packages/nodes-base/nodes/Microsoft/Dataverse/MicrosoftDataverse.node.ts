// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getColumns, getEntitySets } from './loadOptions';
import {
	OPERATION_ALIASES,
	RECORD_OPERATIONS,
	resolveOperation,
	toDropdownOption,
} from './operations';

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';

export class MicrosoftDataverse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Dataverse',
		name: 'microsoftDataverse',
		icon: { light: 'file:microsoftDataverse.svg', dark: 'file:microsoftDataverse.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the Microsoft Dataverse Web API',
		defaults: { name: 'Microsoft Dataverse' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: CREDENTIAL_TYPE,
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'record',
				options: [
					{
						name: 'Record',
						value: 'record',
						description: 'Read or write rows in a Dataverse table',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'list',
				displayOptions: { show: { resource: ['record'] } },
				// Order mirrors the Power Automate "dv connector" actions and is asserted
				// by test/Dataverse.node.test.ts — do not alphabetize. Generated from the
				// RECORD_OPERATIONS registry so the op list lives in exactly one place.
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
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const liveOps = RECORD_OPERATIONS.map((o) => o.value);
		const aliases = Object.keys(OPERATION_ALIASES);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const op = resolveOperation(operation);
				if (!op) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}". Expected one of: ${[...liveOps, ...aliases].join(', ')}`,
						{ itemIndex: i },
					);
				}
				const result = await op.execute(this, i, CREDENTIAL_TYPE);
				const rows = Array.isArray(result) ? result : [result];
				const wrapped = this.helpers.returnJsonArray(rows as IDataObject[]);
				const meta = this.helpers.constructExecutionMetaData(wrapped, {
					itemData: { item: i },
				});
				out.push(...meta);
			} catch (error) {
				if (this.continueOnFail()) {
					const err = error as Error;
					out.push({
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
