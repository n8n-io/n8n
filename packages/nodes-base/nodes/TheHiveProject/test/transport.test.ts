import type { IExecuteFunctions } from 'n8n-workflow';

import { theHiveApiQuery } from '../transport/queryHelper';
import * as transport from '../transport/requestApi';

jest.mock('../transport/requestApi', () => {
	const originalModule = jest.requireActual('../transport/requestApi');
	return {
		...originalModule,
		theHiveApiRequest: jest.fn(async function () {
			return {};
		}),
	};
});

const fakeExecuteFunction = {} as unknown as IExecuteFunctions;

describe('Test TheHiveProject, theHiveApiQuery', () => {
	it('should make list query request', async () => {
		const scope = {
			query: 'listOrganisationPage',
		};
		const filtersValues = [
			{
				field: 'title',
				operator: '_like',
				value: 'Test',
			},
		];
		const sortFields = [
			{
				field: 'title',
				direction: 'asc',
			},
		];
		const limit = undefined;
		const returnCount = false;

		await theHiveApiQuery.call(
			fakeExecuteFunction,
			scope,
			filtersValues,
			sortFields,
			limit,
			returnCount,
		);

		expect(transport.theHiveApiRequest).toHaveBeenCalledTimes(1);
		expect(transport.theHiveApiRequest).toHaveBeenCalledWith('POST', '/v1/query', {
			query: [
				{ _name: 'listOrganisationPage' },
				{ _and: [{ _like: { _field: 'title', _value: 'Test' } }], _name: 'filter' },
				{ _fields: [{ title: 'asc' }], _name: 'sort' },
				{ _name: 'page', extraData: undefined, from: 0, to: 500 },
			],
		});
	});

	it('should make get query request', async () => {
		const scope = {
			query: 'getTask',
			id: '~368644136',
			restrictTo: 'logs',
		};
		const filtersValues = [
			{
				field: 'message',
				operator: '_like',
				value: 'Test',
			},
			{
				field: 'date',
				operator: '_gt',
				value: 1687263671915,
			},
		];
		const sortFields = [
			{
				field: 'message',
				direction: 'desc',
			},
		];
		const limit = undefined;
		const returnCount = false;
		const extraData = ['taskId', 'case'];

		await theHiveApiQuery.call(
			fakeExecuteFunction,
			scope,
			filtersValues,
			sortFields,
			limit,
			returnCount,
			extraData,
		);

		expect(transport.theHiveApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.theHiveApiRequest).toHaveBeenCalledWith('POST', '/v1/query', {
			query: [
				{ _name: 'getTask', idOrName: '~368644136' },
				{ _name: 'logs' },
				{
					_and: [
						{ _like: { _field: 'message', _value: 'Test' } },
						{ _gt: { _field: 'date', _value: 1687263671915 } },
					],
					_name: 'filter',
				},
				{ _fields: [{ message: 'desc' }], _name: 'sort' },
				{ _name: 'page', extraData: ['taskId', 'case'], from: 0, to: 500 },
			],
		});
	});

	it('should make return count query request', async () => {
		const scope = {
			query: 'listOrganisationPage',
		};
		const returnCount = true;

		await theHiveApiQuery.call(
			fakeExecuteFunction,
			scope,
			undefined,
			undefined,
			undefined,
			returnCount,
		);

		expect(transport.theHiveApiRequest).toHaveBeenCalledTimes(3);
		expect(transport.theHiveApiRequest).toHaveBeenCalledWith('POST', '/v1/query', {
			query: [{ _name: 'listOrganisationPage' }, { _name: 'count' }],
		});
	});

	it('should set limit to query request', async () => {
		const scope = {
			query: 'listOrganisationPage',
		};

		const limit = 15;

		await theHiveApiQuery.call(fakeExecuteFunction, scope, undefined, undefined, limit);

		expect(transport.theHiveApiRequest).toHaveBeenCalledTimes(4);
		expect(transport.theHiveApiRequest).toHaveBeenCalledWith('POST', '/v1/query', {
			query: [
				{ _name: 'listOrganisationPage' },
				{ _name: 'page', extraData: undefined, from: 0, to: 15 },
			],
		});
	});
});
