import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as search from '../../../v2/actions/search';
import * as transport from '../../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: vi.fn(),
	splunkApiRequest: vi.fn(),
}));
describe('Splunk, search resource', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('create operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter
			.calledWith('search', 0)
			.mockReturnValue('search index=_internal | stats count by source');
		executeFunctions.getNodeParameter.calledWith('additionalFields', 0).mockReturnValue({
			earliest_time: '2020-01-01T00:00:00.000Z',
			latest_time: '2020-01-01T00:05:00.000Z',
			index_earliest: '2020-01-01T00:00:00.000Z',
			index_latest: '2020-01-01T00:05:00.000Z',
		});
		(transport.splunkApiRequest as Mock).mockReturnValue({ response: { sid: '12345' } });
		(transport.splunkApiJsonRequest as Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await search.create.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith('POST', '/services/search/jobs', {
			earliest_time: 1577836800,
			index_earliest: 1577836800,
			index_latest: 1577837100,
			latest_time: 1577837100,
			search: 'search index=_internal | stats count by source',
		});
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs/12345',
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('create operation with exec_mode oneshot returns the search output', async () => {
		// `oneshot` answers with the search output instead of creating a job, so
		// there is no sid. Reading it unconditionally threw
		// `Cannot read properties of undefined (reading 'sid')` (#38527).
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter
			.calledWith('search', 0)
			.mockReturnValue('search index=_internal | head 3');
		executeFunctions.getNodeParameter
			.calledWith('additionalFields', 0)
			.mockReturnValue({ exec_mode: 'oneshot' });
		const oneshotResponse = { results: [{ _raw: 'first' }, { _raw: 'second' }] };
		(transport.splunkApiRequest as Mock).mockReturnValue(oneshotResponse);

		const responseData = await search.create.execute.call(executeFunctions, 0);

		expect(transport.splunkApiRequest).toHaveBeenCalledWith('POST', '/services/search/jobs', {
			exec_mode: 'oneshot',
			search: 'search index=_internal | head 3',
		});
		// No job was created, so no job lookup is made…
		expect(transport.splunkApiJsonRequest).not.toHaveBeenCalled();
		// …and the search output reaches the caller instead of an exception.
		expect(responseData).toEqual(oneshotResponse);
	});

	test('create operation still follows the sid when the API returns a job', async () => {
		// The control for the guard above: a response that DOES carry a sid must
		// still be looked up, or the guard would swallow every normal search.
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter
			.calledWith('search', 0)
			.mockReturnValue('search index=_internal');
		executeFunctions.getNodeParameter.calledWith('additionalFields', 0).mockReturnValue({});
		(transport.splunkApiRequest as Mock).mockReturnValue({ response: { sid: '67890' } });
		(transport.splunkApiJsonRequest as Mock).mockReturnValue([{ dispatchState: 'DONE' }]);

		const responseData = await search.create.execute.call(executeFunctions, 0);

		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs/67890',
		);
		expect(responseData).toEqual([{ dispatchState: 'DONE' }]);
	});

	test('deleteJob operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.mockReturnValue('12345');
		(transport.splunkApiRequest as Mock).mockReturnValue({});
		const responseData = await search.deleteJob.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/services/search/jobs/12345',
		);
		expect(responseData).toEqual({ success: true });
	});

	test('get operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('searchJobId', 0).mockReturnValue('12345');

		(transport.splunkApiJsonRequest as Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await search.get.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs/12345',
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('getAll operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('sort.values', 0).mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(true);

		(transport.splunkApiJsonRequest as Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await search.getAll.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs',
			{},
			{ count: 0 },
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('getResult operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('searchJobId', 0).mockReturnValue('12345');
		executeFunctions.getNodeParameter.calledWith('filters', 0).mockReturnValue({
			keyValueMatch: { keyValuePair: { key: 'key1', value: 'test1' } },
		});
		executeFunctions.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(false);
		executeFunctions.getNodeParameter.calledWith('limit', 0).mockReturnValue(10);
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});

		(transport.splunkApiJsonRequest as Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await search.getResult.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/search/jobs/12345/results',
			{},
			{ count: 10, search: 'search key1=test1' },
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});
});
