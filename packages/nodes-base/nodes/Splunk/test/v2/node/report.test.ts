import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { SPLUNK } from '../../../v1/types';
import * as report from '../../../v2/actions/report';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: jest.fn(),
	splunkApiRequest: jest.fn(),
}));

describe('Splunk, report resource', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	test('create operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('name', 0).mockReturnValue('someName');
		executeFunctions.getNodeParameter.calledWith('searchJobId', 0).mockReturnValue('12345');

		(transport.splunkApiJsonRequest as jest.Mock).mockReturnValue([
			{
				id: '12345',
				cronSchedule: '*/5 * * * *',
				earliestTime: '2020-01-01T00:00:00.000Z',
				latestTime: '2020-01-01T00:05:00.000Z',
				isScheduled: true,
				search: 'search index=_internal | stats count by source',
				name: 'someName',
			},
		]);

		const response = {
			feed: {
				entry: [
					{
						id: '1',
						content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'key1' }, _: 'value1' }] } },
					},
				],
			},
		};
		(transport.splunkApiRequest as jest.Mock).mockReturnValue(Promise.resolve(response));

		const responseData = await report.create.execute.call(executeFunctions, 0);

		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs/12345',
		);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith('POST', '/services/saved/searches', {
			alert_type: 'always',
			cron_schedule: '*/5 * * * *',
			'dispatch.earliest_time': '2020-01-01T00:00:00.000Z',
			'dispatch.latest_time': '2020-01-01T00:05:00.000Z',
			is_scheduled: true,
			name: 'someName',
			search: 'search index=_internal | stats count by source',
		});
		expect(responseData).toEqual([{ entryUrl: '1', id: '1', key1: 'value1' }]);
	});

	test('deleteReport operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.mockReturnValue('12345');
		(transport.splunkApiRequest as jest.Mock).mockReturnValue({});
		const responseData = await report.deleteReport.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/services/saved/searches/12345',
		);
		expect(responseData).toEqual({ success: true });
	});

	test('get operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('reportId', 0).mockReturnValue('12345');

		(transport.splunkApiJsonRequest as jest.Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await report.get.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/saved/searches/12345',
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('getAll operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(true);

		(transport.splunkApiJsonRequest as jest.Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await report.getAll.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/saved/searches',
			{},
			{ count: 0 },
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});
});
