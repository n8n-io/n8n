import set from 'lodash/set';
import {
	ApplicationError,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { ENABLE_LESS_STRICT_TYPE_VALIDATION } from '../../../utils/constants';
import { looseTypeValidationProperty } from '../../../utils/descriptions';
import { getTypeValidationParameter, getTypeValidationStrictness } from '../../If/V2/utils';

export class FilterV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2, 2.1, 2.2, 2.3],
			defaults: {
				name: 'Filter',
				color: '#229eff',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			outputNames: ['Kept', 'Discarded'],
			parameterPane: 'wide',
			builderHint: {
				searchHint:
					'Filter emits 0 items when nothing matches and the chain stops cleanly — no IF gate needed before downstream loops.',
			},
			properties: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					placeholder: 'Add Condition',
					type: 'filter',
					default: {},
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
							typeValidation: getTypeValidationStrictness(2.1),
							version: '={{ $nodeVersion >= 2.3 ? 3 : $nodeVersion >= 2.2 ? 2 : 1 }}',
						},
					},
					builderHint: {
						propertyHint: `Must always contain these three sibling keys:
- combinator: 'and' or 'or', default to 'and'
- conditions: [ a list of condition objects ]
- options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 }
e.g.: { combinator: 'and', options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr('{{ $json.field }}'), rightValue: 'value', operator: { type: 'string', operation: 'equals' } }] }`,
					},
				},
				{
					...looseTypeValidationProperty,
					default: false,
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 2.1 } }],
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add option',
					default: {},
					options: [
						{
							displayName: 'Ignore Case',
							description: 'Whether to ignore letter case when evaluating conditions',
							name: 'ignoreCase',
							type: 'boolean',
							default: true,
						},
						{
							...looseTypeValidationProperty,
							displayOptions: {
								show: {
									'@version': [{ _cnd: { lt: 2.1 } }],
								},
							},
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const keptItems: INodeExecutionData[] = [];
		const discardedItems: INodeExecutionData[] = [];

		this.getInputData().forEach((item, itemIndex) => {
			try {
				const options = this.getNodeParameter('options', itemIndex) as {
					ignoreCase?: boolean;
					looseTypeValidation?: boolean;
				};
				let pass = false;
				try {
					pass = this.getNodeParameter('conditions', itemIndex, false, {
						extractValue: true,
					}) as boolean;
				} catch (error) {
					if (
						!getTypeValidationParameter(2.1)(this, itemIndex, options.looseTypeValidation) &&
						!error.description
					) {
						set(error, 'description', ENABLE_LESS_STRICT_TYPE_VALIDATION);
					}
					set(error, 'context.itemIndex', itemIndex);
					set(error, 'node', this.getNode());
					throw error;
				}

				if (item.pairedItem === undefined) {
					item.pairedItem = { item: itemIndex };
				}

				if (pass) {
					keptItems.push(item);
				} else {
					discardedItems.push(item);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					discardedItems.push(item);
				} else {
					if (error instanceof NodeOperationError) {
						throw error;
					}

					if (error instanceof ApplicationError) {
						set(error, 'context.itemIndex', itemIndex);
						throw error;
					}

					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		});

		return [keptItems, discardedItems];
	}
}
