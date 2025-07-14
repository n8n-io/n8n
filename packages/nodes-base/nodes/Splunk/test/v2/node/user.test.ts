import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { SPLUNK } from '../../../v1/types';
import * as user from '../../../v2/actions/user';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: jest.fn(),
	splunkApiRequest: jest.fn(),
}));
describe('Splunk, user resource', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('create operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('roles', 0).mockReturnValue(['role1', 'role2']);
		executeFunctions.getNodeParameter.calledWith('name', 0).mockReturnValue('John Doe');
		executeFunctions.getNodeParameter.calledWith('password', 0).mockReturnValue('password');
		executeFunctions.getNodeParameter.calledWith('additionalFields', 0).mockReturnValue({});

		(transport.splunkApiRequest as jest.Mock).mockReturnValue({
			feed: {
				entry: [
					{
						id: '1',
						content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'test' }, _: 'test1' }] } },
					},
				],
			},
		});

		const responseData = await user.create.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith(
			'POST',
			'/services/authentication/users',
			{ name: 'John Doe', password: 'password', roles: ['role1', 'role2'] },
		);

		expect(responseData).toEqual([
			{
				id: '1',
				test: 'test1',
				entryUrl: '1',
			},
		]);
	});

	test('deleteUser operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.mockReturnValue('12345');
		(transport.splunkApiRequest as jest.Mock).mockReturnValue({});
		const responseData = await user.deleteUser.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/services/authentication/users/12345',
		);
		expect(responseData).toEqual({ success: true });
	});

	test('get operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('userId', 0).mockReturnValue('12345');

		(transport.splunkApiJsonRequest as jest.Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await user.get.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/authentication/users/12345',
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('getAll operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(true);

		(transport.splunkApiJsonRequest as jest.Mock).mockReturnValue([{ test: 'test' }]);
		const responseData = await user.getAll.execute.call(executeFunctions, 0);
		expect(transport.splunkApiJsonRequest).toHaveBeenCalledWith(
			'GET',
			'/services/authentication/users',
			{},
			{ count: 0 },
		);
		expect(responseData).toEqual([{ test: 'test' }]);
	});

	test('update operation', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getNodeParameter
			.calledWith('updateFields', 0)
			.mockReturnValue({ roles: ['role1', 'role2'], email: 'testW@example.com' });
		executeFunctions.getNodeParameter.calledWith('userId', 0).mockReturnValue('12345');

		(transport.splunkApiRequest as jest.Mock).mockReturnValue(
			Promise.resolve({
				feed: {
					entry: [
						{
							id: '1',
							content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'test' }, _: 'test1' }] } },
						},
					],
				},
			}),
		);

		const responseData = await user.update.execute.call(executeFunctions, 0);
		expect(transport.splunkApiRequest).toHaveBeenCalledWith(
			'POST',
			'/services/authentication/users/12345',
			{ email: 'testW@example.com', roles: ['role1', 'role2'] },
		);

		expect(responseData).toEqual([
			{
				id: '1',
				test: 'test1',
				entryUrl: '1',
			},
		]);
	});
});
