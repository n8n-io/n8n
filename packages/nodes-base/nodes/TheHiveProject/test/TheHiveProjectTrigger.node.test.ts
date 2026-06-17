import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';
import { TheHiveProjectTrigger } from '../TheHiveProjectTrigger.node';

describe('TheHiveProjectTrigger', () => {
	describe('Alert Created Event', () => {
		it('should process alert_create event correctly', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					_id: '~12345',
					_type: 'Alert',
					title: 'Test Alert',
					description: 'Test alert description',
					severity: '2',
					date: 1698753600000,
					tags: ['malware', 'test'],
					tlp: 2,
					pap: 2,
					source: 'n8n-test',
					sourceRef: 'test-ref-001',
					follow: true,
					customFields: {},
				},
				organisationId: '~456',
				organisation: 'TestOrg',
				requestId: 'test-request-123',
			};

			const headerData = {
				'content-type': 'application/json',
				'user-agent': 'TheHive/5.0',
				'x-request-id': 'test-request-123',
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
				headerData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
			expect(responseData?.workflowData![0][0].json).toEqual({
				event: 'alert_create',
				body: bodyData,
				headers: headerData,
				query: {},
			});
		});
	});

	describe('Wildcard Event', () => {
		it('should process any event with * wildcard', async () => {
			const bodyData = {
				action: 'Update',
				objectType: 'Case',
				object: {
					_id: '~67890',
					_type: 'Case',
					title: 'Test Case',
					description: 'Test case description',
					severity: '1',
					status: 'Open',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['*'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('case_update');
		});
	});

	describe('Filtering', () => {
		it('should apply equal filter correctly', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					severity: '2',
					title: 'High Priority Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						filters: {
							values: [
								{
									field: 'object.severity',
									operator: 'equal',
									value: '2',
								},
							],
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
		});

		it('should filter out events that do not match equal filter', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					severity: '1',
					title: 'Low Priority Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						filters: {
							values: [
								{
									field: 'object.severity',
									operator: 'equal',
									value: '2',
								},
							],
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toEqual({});
		});

		it('should apply notEqual filter correctly', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					severity: '1',
					title: 'Low Priority Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						filters: {
							values: [
								{
									field: 'object.severity',
									operator: 'notEqual',
									value: '2',
								},
							],
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
		});

		it('should apply includes filter correctly', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					title: 'Malware Detection Alert',
					tags: ['malware', 'detection'],
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						filters: {
							values: [
								{
									field: 'object.title',
									operator: 'includes',
									value: 'Malware',
								},
							],
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
		});

		it('should filter out events that do not match includes filter', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					title: 'Network Alert',
					tags: ['network', 'monitoring'],
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						filters: {
							values: [
								{
									field: 'object.title',
									operator: 'includes',
									value: 'Malware',
								},
							],
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toEqual({});
		});
	});

	describe('Output Options', () => {
		it('should output only data when outputOnlyData is true', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					_id: '~12345',
					title: 'Test Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						options: {
							outputOnlyData: true,
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
			expect(responseData?.workflowData![0][0].json).toEqual(bodyData);
		});

		it('should output full data structure when outputOnlyData is false', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Alert',
				object: {
					_id: '~12345',
					title: 'Test Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
						options: {
							outputOnlyData: false,
						},
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
			expect(responseData?.workflowData![0][0].json).toHaveProperty('event', 'alert_create');
			expect(responseData?.workflowData![0][0].json).toHaveProperty('body', bodyData);
			expect(responseData?.workflowData![0][0].json).toHaveProperty('headers');
			expect(responseData?.workflowData![0][0].json).toHaveProperty('query');
		});
	});

	describe('Invalid Data Handling', () => {
		it('should return empty response when action is missing', async () => {
			const bodyData = {
				objectType: 'Alert',
				object: {
					_id: '~12345',
					title: 'Test Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toEqual({});
		});

		it('should return empty response when objectType is missing', async () => {
			const bodyData = {
				action: 'Create',
				object: {
					_id: '~12345',
					title: 'Test Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toEqual({});
		});

		it('should return empty response when event is not in configured events list', async () => {
			const bodyData = {
				action: 'Delete',
				objectType: 'Alert',
				object: {
					_id: '~12345',
					title: 'Test Alert',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create', 'alert_update'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toEqual({});
		});
	});

	describe('Multiple Event Types', () => {
		it('should process case_create event', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Case',
				object: {
					_id: '~case123',
					_type: 'Case',
					title: 'Test Case',
					description: 'Test case description',
					severity: '1',
					status: 'Open',
					tags: ['investigation'],
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['case_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('case_create');
		});

		it('should process task_create event', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Task',
				object: {
					_id: '~task456',
					_type: 'Task',
					title: 'Investigate Alert',
					description: 'Investigate the suspicious activity',
					status: 'InProgress',
					assignee: 'analyst@company.com',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['task_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('task_create');
		});

		it('should process observable_create event', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Observable',
				object: {
					_id: '~observable789',
					_type: 'Observable',
					dataType: 'ip',
					data: '192.168.1.100',
					message: 'Suspicious IP address',
					tlp: 2,
					ioc: true,
					tags: ['malicious', 'c2'],
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['observable_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('observable_create');
		});

		it('should process comment_create event', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Comment',
				object: {
					_id: '~comment101',
					_type: 'Comment',
					message: 'This requires immediate attention',
					createdBy: 'analyst@company.com',
					createdAt: 1698753600000,
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['comment_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('comment_create');
		});

		it('should process log_create event', async () => {
			const bodyData = {
				action: 'Create',
				objectType: 'Log',
				object: {
					_id: '~log202',
					_type: 'Log',
					message: 'Investigation completed',
					status: 'Success',
					attachment: {
						name: 'report.pdf',
						id: 'attachment123',
					},
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['log_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('log_create');
		});

		it('should process multiple configured events', async () => {
			const bodyData = {
				action: 'Update',
				objectType: 'Alert',
				object: {
					_id: '~alert303',
					title: 'Updated Alert',
					status: 'Imported',
				},
			};

			const { responseData } = await testWebhookTriggerNode(TheHiveProjectTrigger, {
				node: {
					parameters: {
						events: ['alert_create', 'alert_update', 'case_create'],
					},
				},
				request: { method: 'POST' },
				bodyData,
			});

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData![0][0].json.event).toBe('alert_update');
		});
	});
});
