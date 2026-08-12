import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as alert from '../../../v2/actions/alert';
import * as transport from '../../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: vi.fn(),
}));

describe('Splunk, alert resource', () => {
	const response = [{ id: '123' }, { id: '345' }];

	beforeEach(() => {
		vi.clearAllMocks();
	});
	test('getMetrics operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		(transport.splunkApiJsonRequest as Mock).mockReturnValue(response);
		const responseData = await alert.getMetrics.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/alerts/metric_alerts',
		);
		expect(responseData).toEqual(response);
	});

	test('getReport operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		(transport.splunkApiJsonRequest as Mock).mockReturnValue(response);
		const responseData = await alert.getReport.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/alerts/fired_alerts',
		);
		expect(responseData).toEqual(response);
	});
});
