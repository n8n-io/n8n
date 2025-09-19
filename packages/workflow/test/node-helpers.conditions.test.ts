import type { INodeParameters, INodeProperties } from '../src/interfaces';
import { getNodeParameters } from '../src/node-helpers';

describe('NodeHelpers', () => {
	describe('getNodeParameters, displayOptions set using DisplayCondition', () => {
		const tests: Array<{
			description: string;
			input: {
				nodePropertiesArray: INodeProperties[];
				nodeValues: INodeParameters | null;
			};
			output: {
				noneDisplayedFalse: {
					defaultsFalse: INodeParameters;
					defaultsTrue: INodeParameters;
				};
				noneDisplayedTrue: {
					defaultsFalse: INodeParameters;
					defaultsTrue: INodeParameters;
				};
			};
		}> = [
			{
				description: 'simple values with displayOptions "show" number (gt). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'number1',
							displayName: 'number1',
							type: 'number',
							default: 2,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									number1: [{ _cnd: { gt: 1 } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" number (lt). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'number1',
							displayName: 'number1',
							type: 'number',
							default: 2,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									number1: [{ _cnd: { lt: 3 } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" number (between). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'number1',
							displayName: 'number1',
							type: 'number',
							default: 2,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									number1: [{ _cnd: { between: { from: 1, to: 3 } } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" number (lte). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'number1',
							displayName: 'number1',
							type: 'number',
							default: 2,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									number1: [{ _cnd: { lte: 3 } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" number (gte). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'number1',
							displayName: 'number1',
							type: 'number',
							default: 2,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									number1: [{ _cnd: { gte: 1 } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							number1: 2,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" (match) which is boolean. All values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'boolean1',
							displayName: 'boolean1',
							type: 'boolean',
							default: false,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									boolean1: [{ _cnd: { eq: true } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {
						boolean1: true,
						string1: 'own string1',
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							boolean1: true,
							string1: 'own string1',
						},
						defaultsTrue: {
							boolean1: true,
							string1: 'own string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							boolean1: true,
							string1: 'own string1',
						},
						defaultsTrue: {
							boolean1: true,
							string1: 'own string1',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "hide" (match) which is boolean. All values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'boolean1',
							displayName: 'boolean1',
							type: 'boolean',
							default: false,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								hide: {
									boolean1: [{ _cnd: { eq: true } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {
						boolean1: true,
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							boolean1: true,
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							boolean1: true,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" (match) which is boolean. One values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'boolean1',
							displayName: 'boolean1',
							type: 'boolean',
							default: false,
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									boolean1: [{ _cnd: { eq: true } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {
						boolean1: true,
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							boolean1: true,
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							boolean1: true,
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" (match). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									mode: [{ _cnd: { includes: 'mode1' } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" (match) on two which depend on each other of which is boolean. One value should be displayed. One values set (none-default).',
				input: {
					nodePropertiesArray: [
						{
							name: 'string1',
							displayName: 'string1',
							type: 'string',
							default: 'default string1',
						},
						{
							name: 'boolean1',
							displayName: 'boolean1',
							displayOptions: {
								show: {
									string1: [{ _cnd: { eq: 'default string1' } }],
								},
							},
							type: 'boolean',
							default: false,
						},
						{
							name: 'string2',
							displayName: 'string2',
							displayOptions: {
								show: {
									boolean1: [{ _cnd: { not: false } }],
								},
							},
							type: 'string',
							default: 'default string2',
						},
					],
					nodeValues: {
						boolean1: true,
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							string1: 'default string1',
							boolean1: true,
							string2: 'default string2',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							boolean1: true,
						},
						defaultsTrue: {
							string1: 'default string1',
							boolean1: true,
							string2: 'default string2',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" (match) on two which depend on each other of which is boolean. One value should be displayed. One values set. (default)',
				input: {
					nodePropertiesArray: [
						{
							name: 'string1',
							displayName: 'string1',
							type: 'string',
							default: 'default string1',
						},
						{
							name: 'boolean1',
							displayName: 'boolean1',
							displayOptions: {
								show: {
									string1: [{ _cnd: { endsWith: 'string1' } }],
								},
							},
							type: 'boolean',
							default: false,
						},
						{
							name: 'string2',
							displayName: 'string2',
							displayOptions: {
								show: {
									boolean1: [{ _cnd: { eq: true } }],
								},
							},
							type: 'string',
							default: 'default string2',
						},
					],
					nodeValues: {
						boolean1: false,
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							string1: 'default string1',
							boolean1: false,
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							string1: 'default string1',
							boolean1: false,
							string2: 'default string2',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" (match). All values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									mode: [{ _cnd: { startsWith: 'mo' } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {
						mode: 'mode1',
						string1: 'default string1',
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" (no-match). No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									mode: [{ _cnd: { endsWith: '2' } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
				},
			},
			{
				description: 'simple values with displayOptions "show" (no-match). All values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'string1',
							displayName: 'string1',
							displayOptions: {
								show: {
									mode: [{ _cnd: { startsWith: 'foo' } }],
								},
							},
							type: 'string',
							default: 'default string1',
						},
					],
					nodeValues: {
						mode: 'mode1',
						string1: 'default string1',
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							string1: 'default string1',
						},
					},
				},
			},

			{
				description:
					'complex type "fixedCollection" with "multipleValues: false" and with displayOptions "show" (match) on option. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'values',
							displayName: 'Values',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'number',
									displayName: 'Number',
									values: [
										{
											name: 'mode',
											displayName: 'mode',
											type: 'string',
											default: 'mode1',
										},
										{
											name: 'string1',
											displayName: 'string1',
											type: 'string',
											displayOptions: {
												show: {
													mode: [{ _cnd: { endsWith: 'mode1' } }],
												},
											},
											default: 'default string1',
										},
										{
											name: 'number1',
											displayName: 'number1',
											type: 'number',
											default: 0,
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values: {
							number: {
								number1: 1,
							},
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: {
								number: {
									number1: 1,
								},
							},
						},
						defaultsTrue: {
							values: {
								number: {
									mode: 'mode1',
									string1: 'default string1',
									number1: 1,
								},
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								number: {
									number1: 1,
								},
							},
						},
						defaultsTrue: {
							values: {
								number: {
									mode: 'mode1',
									string1: 'default string1',
									number1: 1,
								},
							},
						},
					},
				},
			},
			{
				description:
					'complex type "fixedCollection" with "multipleValues: false" and with displayOptions "show" (match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'number',
									displayName: 'Number',
									values: [
										{
											name: 'string1',
											displayName: 'string1',
											type: 'string',
											displayOptions: {
												show: {
													'/mode': [{ _cnd: { eq: 'mode1' } }],
												},
											},
											default: 'default string1',
										},
										{
											name: 'number1',
											displayName: 'number1',
											type: 'number',
											default: 0,
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values: {
							number: {
								string1: 'own string1',
							},
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: {
								number: {
									string1: 'own string1',
								},
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								number: {
									string1: 'own string1',
									number1: 0,
								},
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								number: {
									string1: 'own string1',
								},
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								number: {
									string1: 'own string1',
									number1: 0,
								},
							},
						},
					},
				},
			},
			{
				description:
					'complex type "fixedCollection" with "multipleValues: false" and with displayOptions "show" (no-match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'number',
									displayName: 'Number',
									values: [
										{
											name: 'string1',
											displayName: 'string1',
											type: 'string',
											displayOptions: {
												show: {
													'/mode': [{ _cnd: { includes: 'de2' } }],
												},
											},
											default: 'default string1',
										},
										{
											name: 'number1',
											displayName: 'number1',
											type: 'number',
											default: 0,
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values: {
							number: {
								string1: 'own string1',
							},
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								number: {
									number1: 0,
								},
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								number: {
									string1: 'own string1',
								},
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								number: {
									string1: 'own string1',
									number1: 0,
								},
							},
						},
					},
				},
			},
			// Remember it is correct that default strings get returned here even when returnDefaults
			// is set to false because if they would not, there would be no way to know which value
			// got added and which one not.
			{
				description:
					'complex type "collection" with "multipleValues: false" and with displayOptions "show" (match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'collection',
							default: {},
							options: [
								{
									name: 'string1',
									displayName: 'string1',
									type: 'string',
									displayOptions: {
										show: {
											'/mode': [{ _cnd: { eq: 'mode1' } }],
										},
									},
									default: 'default string1',
								},
								{
									name: 'number1',
									displayName: 'number1',
									type: 'number',
									default: 0,
								},
							],
						},
					],
					nodeValues: {
						values: {
							string1: 'own string1',
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: {
								string1: 'own string1',
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								string1: 'own string1',
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								string1: 'own string1',
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								string1: 'own string1',
							},
						},
					},
				},
			},
			// Remember it is correct that default strings get returned here even when returnDefaults
			// is set to false because if they would not, there would be no way to know which value
			// got added and which one not.
			{
				description:
					'complex type "collection" with "multipleValues: false" and with displayOptions "show" (no-match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'collection',
							default: {},
							options: [
								{
									name: 'string1',
									displayName: 'string1',
									type: 'string',
									displayOptions: {
										show: {
											'/mode': [{ _cnd: { eq: 'mode2' } }],
										},
									},
									default: 'default string1',
								},
								{
									name: 'number1',
									displayName: 'number1',
									type: 'number',
									default: 0,
								},
							],
						},
					],
					nodeValues: {
						values: {
							string1: 'own string1',
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							// TODO: Write some code which cleans up data like that
							values: {},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								string1: 'own string1',
							},
						},
						defaultsTrue: {
							mode: 'mode1',
							values: {
								string1: 'own string1',
							},
						},
					},
				},
			},
			// Remember it is correct that default strings get returned here even when returnDefaults
			// is set to false because if they would not, there would be no way to know which value
			// got added and which one not.
			{
				description:
					'complex type "collection" with "multipleValues: true" and with displayOptions "show" (match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'collection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'string1',
									displayName: 'string1',
									type: 'string',
									displayOptions: {
										show: {
											'/mode': [{ _cnd: { eq: 'mode1' } }],
										},
									},
									default: 'default string1',
								},
								{
									name: 'number1',
									displayName: 'number1',
									type: 'number',
									default: 0,
								},
							],
						},
					],
					nodeValues: {
						values: [
							{
								string1: 'own string1',
							},
						],
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: [
								{
									string1: 'own string1',
								},
							],
						},
						defaultsTrue: {
							mode: 'mode1',
							values: [
								{
									string1: 'own string1',
								},
							],
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: [
								{
									string1: 'own string1',
								},
							],
						},
						defaultsTrue: {
							mode: 'mode1',
							values: [
								{
									string1: 'own string1',
								},
							],
						},
					},
				},
			},

			// Remember it is correct that default strings get returned here even when returnDefaults
			// is set to false because if they would not, there would be no way to know which value
			// got added and which one not.
			{
				description:
					'complex type "collection" with "multipleValues: true" and with displayOptions "show" (no-match) on option which references root-value. One value set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'mode',
							displayName: 'mode',
							type: 'string',
							default: 'mode1',
						},
						{
							name: 'values',
							displayName: 'Values',
							type: 'collection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'string1',
									displayName: 'string1',
									type: 'string',
									displayOptions: {
										show: {
											'/mode': [{ _cnd: { eq: 'mode2' } }],
										},
									},
									default: 'default string1',
								},
								{
									name: 'number1',
									displayName: 'number1',
									type: 'number',
									default: 0,
								},
							],
						},
					],
					nodeValues: {
						values: [
							{
								string1: 'own string1',
								number1: 0,
							},
						],
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: [
								{
									string1: 'own string1',
									number1: 0,
								},
							],
						},
						defaultsTrue: {
							mode: 'mode1',
							values: [
								{
									string1: 'own string1',
									number1: 0,
								},
							],
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: [
								{
									string1: 'own string1',
									number1: 0,
								},
							],
						},
						defaultsTrue: {
							mode: 'mode1',
							values: [
								{
									string1: 'own string1',
									number1: 0,
								},
							],
						},
					},
				},
			},
			{
				description:
					'complex type "fixedCollection" with "multipleValues: false" and with displayOptions "show" (no-match) on option. One value set also the not displayed one.',
				input: {
					nodePropertiesArray: [
						{
							name: 'values',
							displayName: 'Values',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'number',
									displayName: 'Number',
									values: [
										{
											name: 'mode',
											displayName: 'mode',
											type: 'string',
											default: 'mode1',
										},
										{
											displayName: 'string1',
											name: 'string1',
											type: 'string',
											displayOptions: {
												show: {
													mode: [{ _cnd: { eq: 'mode1' } }],
												},
											},
											default: 'default string1',
										},
										{
											displayName: 'number1',
											name: 'number1',
											type: 'number',
											default: 0,
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values: {
							number: {
								mode: 'mode2',
								string1: 'default string1',
								number1: 1,
							},
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: {
								number: {
									mode: 'mode2',
									number1: 1,
								},
							},
						},
						defaultsTrue: {
							values: {
								number: {
									mode: 'mode2',
									number1: 1,
								},
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								number: {
									mode: 'mode2',
									number1: 1,
								},
							},
						},
						defaultsTrue: {
							values: {
								number: {
									mode: 'mode2',
									string1: 'default string1',
									number1: 1,
								},
							},
						},
					},
				},
			},

			{
				description:
					'two identically named properties of which only one gets displayed with different options. No value set at all.',
				input: {
					nodePropertiesArray: [
						{
							displayName: 'mainOption',
							name: 'mainOption',
							type: 'options',
							options: [
								{
									name: 'option1',
									value: 'option1',
								},
								{
									name: 'option2',
									value: 'option2',
								},
							],
							default: 'option1',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { endsWith: '1' } }],
								},
							},
							options: [
								{
									name: 'option1a',
									value: 'option1a',
								},
								{
									name: 'option1b',
									value: 'option1b',
								},
							],
							default: 'option1a',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { endsWith: '2' } }],
								},
							},
							options: [
								{
									name: 'option2a',
									value: 'option2a',
								},
								{
									name: 'option2b',
									value: 'option2b',
								},
							],
							default: 'option2a',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
						},
					},
				},
			},
			{
				description:
					'One property which is dependency on two identically named properties of which only one gets displayed with different options. No value set at all.',
				input: {
					nodePropertiesArray: [
						{
							displayName: 'mainOption',
							name: 'mainOption',
							type: 'options',
							options: [
								{
									name: 'option1',
									value: 'option1',
								},
								{
									name: 'option2',
									value: 'option2',
								},
							],
							default: 'option1',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
								},
							},
							options: [
								{
									name: 'option1a',
									value: 'option1a',
								},
								{
									name: 'option1b',
									value: 'option1b',
								},
							],
							default: 'option1a',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
								},
							},
							options: [
								{
									name: 'option2a',
									value: 'option2a',
								},
								{
									name: 'option2b',
									value: 'option2b',
								},
							],
							default: 'option2a',
						},
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value1',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
									subOption: [{ _cnd: { includes: '1a' } }],
								},
							},
						},
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value2',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
									subOption: [{ _cnd: { includes: '2a' } }],
								},
							},
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
							dependentParameter: 'value1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
							dependentParameter: 'value1',
						},
					},
				},
			},
			{
				description:
					'One property which is dependency on two identically named properties of which only one gets displayed with different options. No value set at all. Order reversed',
				input: {
					nodePropertiesArray: [
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value2',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
									subOption: [{ _cnd: { includes: '2a' } }],
								},
							},
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
								},
							},
							options: [
								{
									name: 'option2a',
									value: 'option2a',
								},
								{
									name: 'option2b',
									value: 'option2b',
								},
							],
							default: 'option2a',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
								},
							},
							options: [
								{
									name: 'option1a',
									value: 'option1a',
								},
								{
									name: 'option1b',
									value: 'option1b',
								},
							],
							default: 'option1a',
						},
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value1',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
									subOption: [{ _cnd: { eq: 'option1a' } }],
								},
							},
						},
						{
							displayName: 'mainOption',
							name: 'mainOption',
							type: 'options',
							options: [
								{
									name: 'option1',
									value: 'option1',
								},
								{
									name: 'option2',
									value: 'option2',
								},
							],
							default: 'option1',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
							dependentParameter: 'value1',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							mainOption: 'option1',
							subOption: 'option1a',
							dependentParameter: 'value1',
						},
					},
				},
			},
			{
				description:
					'One property which is dependency on two identically named properties of which only one gets displayed with different options. No value set at all.',
				input: {
					nodePropertiesArray: [
						{
							displayName: 'mainOption',
							name: 'mainOption',
							type: 'options',
							options: [
								{
									name: 'option1',
									value: 'option1',
								},
								{
									name: 'option2',
									value: 'option2',
								},
							],
							default: 'option1',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
								},
							},
							options: [
								{
									name: 'option1a',
									value: 'option1a',
								},
								{
									name: 'option1b',
									value: 'option1b',
								},
							],
							default: 'option1a',
						},
						{
							displayName: 'subOption',
							name: 'subOption',
							type: 'options',
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
								},
							},
							options: [
								{
									name: 'option2a',
									value: 'option2a',
								},
								{
									name: 'option2b',
									value: 'option2b',
								},
							],
							default: 'option2a',
						},
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value1',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option1' } }],
									subOption: [{ _cnd: { eq: 'option1a' } }],
								},
							},
						},
						{
							displayName: 'dependentParameter',
							name: 'dependentParameter',
							type: 'string',
							default: 'value2',
							required: true,
							displayOptions: {
								show: {
									mainOption: [{ _cnd: { eq: 'option2' } }],
									subOption: [{ _cnd: { eq: 'option2a' } }],
								},
							},
						},
					],
					nodeValues: {
						mainOption: 'option2',
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							mainOption: 'option2',
						},
						defaultsTrue: {
							mainOption: 'option2',
							subOption: 'option2a',
							dependentParameter: 'value2',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							mainOption: 'option2',
						},
						defaultsTrue: {
							mainOption: 'option2',
							subOption: 'option2a',
							dependentParameter: 'value2',
						},
					},
				},
			},
			{
				description:
					'complex type "fixedCollection" with "multipleValues: true". Which contains parameters which get displayed on a parameter with a default expression with relative parameter references.',
				input: {
					nodePropertiesArray: [
						{
							displayName: 'Values1',
							name: 'values1',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
							},
							description: 'The value to set.',
							default: {},
							options: [
								{
									displayName: 'Options1',
									name: 'options1',
									values: [
										{
											displayName: 'Key',
											name: 'key',
											type: 'string',
											default: '',
										},
										{
											displayName: 'Type',
											name: 'type',
											type: 'hidden',
											default: '={{$parameter["&key"].split("|")[1]}}',
										},
										{
											displayName: 'Title Value',
											name: 'titleValue',
											displayOptions: {
												show: {
													type: [{ _cnd: { eq: 'title' } }],
												},
											},
											type: 'string',
											default: 'defaultTitle',
										},
										{
											displayName: 'Title Number',
											name: 'numberValue',
											displayOptions: {
												show: {
													type: [{ _cnd: { eq: 'number' } }],
												},
											},
											type: 'number',
											default: 1,
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values1: {
							options1: [
								{
									key: 'asdf|title',
									titleValue: 'different',
								},
							],
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values1: {
								options1: [
									{
										key: 'asdf|title',
										titleValue: 'different',
									},
								],
							},
						},
						defaultsTrue: {
							values1: {
								options1: [
									{
										key: 'asdf|title',
										type: '={{$parameter["&key"].split("|")[1]}}',
										// This is not great that it displays this theoretically hidden parameter
										// but because we can not resolve the values for now
										numberValue: 1,
										titleValue: 'different',
									},
								],
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values1: {
								options1: [
									{
										key: 'asdf|title',
										titleValue: 'different',
									},
								],
							},
						},
						defaultsTrue: {
							values1: {
								options1: [
									{
										key: 'asdf|title',
										type: '={{$parameter["&key"].split("|")[1]}}',
										titleValue: 'different',
										numberValue: 1,
									},
								],
							},
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" using exists condition. No values set.',
				input: {
					nodePropertiesArray: [
						{
							name: 'field1',
							displayName: 'Field 1',
							type: 'string',
							default: '',
						},
						{
							name: 'field2',
							displayName: 'Field 2',
							displayOptions: {
								show: {
									field1: [{ _cnd: { exists: true } }],
								},
							},
							type: 'string',
							default: 'default field2',
						},
					],
					nodeValues: {},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {},
						defaultsTrue: {
							field1: '',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {},
						defaultsTrue: {
							field1: '',
							field2: 'default field2',
						},
					},
				},
			},
			{
				description:
					'simple values with displayOptions "show" using exists condition. Field1 has a value.',
				input: {
					nodePropertiesArray: [
						{
							name: 'field1',
							displayName: 'Field 1',
							type: 'string',
							default: '',
						},
						{
							name: 'field2',
							displayName: 'Field 2',
							displayOptions: {
								show: {
									field1: [{ _cnd: { exists: true } }],
								},
							},
							type: 'string',
							default: 'default field2',
						},
					],
					nodeValues: {
						field1: 'some value',
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							field1: 'some value',
						},
						defaultsTrue: {
							field1: 'some value',
							field2: 'default field2',
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							field1: 'some value',
						},
						defaultsTrue: {
							field1: 'some value',
							field2: 'default field2',
						},
					},
				},
			},
			{
				description:
					'complex type "fixedCollection" with "multipleValues: false" and with displayOptions "show" using exists condition.',
				input: {
					nodePropertiesArray: [
						{
							name: 'values',
							displayName: 'Values',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'data',
									displayName: 'Data',
									values: [
										{
											name: 'field1',
											displayName: 'Field 1',
											type: 'string',
											default: '',
										},
										{
											name: 'field2',
											displayName: 'Field 2',
											type: 'string',
											displayOptions: {
												show: {
													field1: [{ _cnd: { exists: true } }],
												},
											},
											default: 'default field2',
										},
									],
								},
							],
						},
					],
					nodeValues: {
						values: {
							data: {
								field1: 'some value',
							},
						},
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: {
								data: {
									field1: 'some value',
								},
							},
						},
						defaultsTrue: {
							values: {
								data: {
									field1: 'some value',
									field2: 'default field2',
								},
							},
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: {
								data: {
									field1: 'some value',
								},
							},
						},
						defaultsTrue: {
							values: {
								data: {
									field1: 'some value',
									field2: 'default field2',
								},
							},
						},
					},
				},
			},
			{
				description:
					'complex type "collection" with "multipleValues: true" and with displayOptions "show" using exists condition.',
				input: {
					nodePropertiesArray: [
						{
							name: 'values',
							displayName: 'Values',
							type: 'collection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'field1',
									displayName: 'Field 1',
									type: 'string',
									default: '',
								},
								{
									name: 'field2',
									displayName: 'Field 2',
									type: 'string',
									displayOptions: {
										show: {
											field1: [{ _cnd: { exists: true } }],
										},
									},
									default: 'default field2',
								},
							],
						},
					],
					nodeValues: {
						values: [
							{
								field1: 'value1',
							},
							{
								field1: '',
							},
							{},
						],
					},
				},
				output: {
					noneDisplayedFalse: {
						defaultsFalse: {
							values: [
								{
									field1: 'value1',
								},
								{
									field1: '',
								},
								{},
							],
						},
						defaultsTrue: {
							values: [
								{
									field1: 'value1',
								},
								{
									field1: '',
								},
								{},
							],
						},
					},
					noneDisplayedTrue: {
						defaultsFalse: {
							values: [
								{
									field1: 'value1',
								},
								{
									field1: '',
								},
								{},
							],
						},
						defaultsTrue: {
							values: [
								{
									field1: 'value1',
								},
								{
									field1: '',
								},
								{},
							],
						},
					},
				},
			},
		];

		for (const testData of tests) {
			test(testData.description, () => {
				// returnDefaults: false | returnNoneDisplayed: false
				let result = getNodeParameters(
					testData.input.nodePropertiesArray,
					testData.input.nodeValues,
					false,
					false,
					null,
					null,
				);
				expect(result).toEqual(testData.output.noneDisplayedFalse.defaultsFalse);

				// returnDefaults: true | returnNoneDisplayed: false
				result = getNodeParameters(
					testData.input.nodePropertiesArray,
					testData.input.nodeValues,
					true,
					false,
					null,
					null,
				);
				expect(result).toEqual(testData.output.noneDisplayedFalse.defaultsTrue);

				// returnDefaults: false | returnNoneDisplayed: true
				result = getNodeParameters(
					testData.input.nodePropertiesArray,
					testData.input.nodeValues,
					false,
					true,
					null,
					null,
				);
				expect(result).toEqual(testData.output.noneDisplayedTrue.defaultsFalse);

				// returnDefaults: true | returnNoneDisplayed: true
				result = getNodeParameters(
					testData.input.nodePropertiesArray,
					testData.input.nodeValues,
					true,
					true,
					null,
					null,
				);
				expect(result).toEqual(testData.output.noneDisplayedTrue.defaultsTrue);
			});
		}
	});
});
