import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { constructExecutionMetaData } from 'n8n-core';
import { mock } from 'jest-mock-extended';
import { prepareOutput } from '../../../v2/helpers/utils';

describe('Google BigQuery v2 Utils', () => {
	it('should prepareOutput', () => {
		const thisArg = mock<IExecuteFunctions>({
			getNode: () => ({ typeVersion: 2.1 }) as INode,
			helpers: mock({ constructExecutionMetaData }),
		});
		const response: IDataObject = {
			kind: 'bigquery#getQueryResultsResponse',
			etag: 'e_tag',
			schema: {
				fields: [
					{
						name: 'nodes',
						type: 'RECORD',
						mode: 'REPEATED',
						fields: [
							{
								name: 'webhookId',
								type: 'STRING',
								mode: 'NULLABLE',
							},
							{
								name: 'position',
								type: 'INTEGER',
								mode: 'REPEATED',
							},
							{
								name: 'name',
								type: 'STRING',
								mode: 'NULLABLE',
							},
							{
								name: 'typeVersion',
								type: 'INTEGER',
								mode: 'NULLABLE',
							},
							{
								name: 'credentials',
								type: 'RECORD',
								mode: 'NULLABLE',
								fields: [
									{
										name: 'zendeskApi',
										type: 'RECORD',
										mode: 'NULLABLE',
										fields: [
											{
												name: 'name',
												type: 'STRING',
												mode: 'NULLABLE',
											},
											{
												name: 'id',
												type: 'INTEGER',
												mode: 'NULLABLE',
											},
										],
									},
								],
							},
							{
								name: 'type',
								type: 'STRING',
								mode: 'NULLABLE',
							},
							{
								name: 'parameters',
								type: 'RECORD',
								mode: 'NULLABLE',
								fields: [
									{
										name: 'conditions',
										type: 'RECORD',
										mode: 'NULLABLE',
										fields: [
											{
												name: 'all',
												type: 'RECORD',
												mode: 'REPEATED',
												fields: [
													{
														name: 'value',
														type: 'STRING',
														mode: 'NULLABLE',
													},
												],
											},
										],
									},
									{
										name: 'options',
										type: 'RECORD',
										mode: 'NULLABLE',
										fields: [
											{
												name: 'fields',
												type: 'STRING',
												mode: 'REPEATED',
											},
										],
									},
								],
							},
						],
					},
				],
			},
			jobReference: {
				projectId: 'project_id',
				jobId: 'job_ref',
				location: 'US',
			},
			totalRows: '1',
			rows: [
				{
					f: [
						{
							v: [
								{
									v: {
										f: [
											{
												v: 'web_hook_id',
											},
											{
												v: [
													{
														v: '100',
													},
													{
														v: '100',
													},
												],
											},
											{
												v: 'Zendesk Trigger',
											},
											{
												v: '1',
											},
											{
												v: {
													f: [
														{
															v: {
																f: [
																	{
																		v: 'Zendesk account',
																	},
																	{
																		v: '8',
																	},
																],
															},
														},
													],
												},
											},
											{
												v: 'n8n-nodes-base.zendeskTrigger',
											},
											{
												v: {
													f: [
														{
															v: {
																f: [
																	{
																		v: [
																			{
																				v: {
																					f: [
																						{
																							v: 'closed',
																						},
																					],
																				},
																			},
																		],
																	},
																],
															},
														},
														{
															v: {
																f: [
																	{
																		v: [
																			{
																				v: 'ticket.title',
																			},
																			{
																				v: 'ticket.description',
																			},
																		],
																	},
																],
															},
														},
													],
												},
											},
										],
									},
								},
							],
						},
					],
				},
			],
			totalBytesProcessed: '0',
			jobComplete: true,
			cacheHit: true,
		};
		const returnData = prepareOutput.call(thisArg, response, 0, false, false);

		expect(returnData).toBeDefined();
		// expect(returnData).toHaveProperty('nodes');
		expect(returnData).toEqual([
			{
				json: {
					nodes: [
						{
							webhookId: 'web_hook_id',
							position: ['100', '100'],
							name: 'Zendesk Trigger',
							typeVersion: '1',
							credentials: [
								{
									zendeskApi: [
										{
											name: 'Zendesk account',
											id: '8',
										},
									],
								},
							],
							type: 'n8n-nodes-base.zendeskTrigger',
							parameters: [
								{
									conditions: [
										{
											all: [
												{
													value: 'closed',
												},
											],
										},
									],
									options: [
										{
											fields: ['ticket.title', 'ticket.description'],
										},
									],
								},
							],
						},
					],
				},
				pairedItem: {
					item: 0,
				},
			},
		]);
	});
});
