import type { ILoadOptionsFunctions } from 'n8n-workflow';
import nock from 'nock';

import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';
import { GSuiteAdmin } from '../GSuiteAdmin.node';

jest.mock('../GenericFunctions', () => ({
	getGoogleAuth: jest.fn().mockImplementation(() => ({
		oauth2Client: {
			setCredentials: jest.fn(),
			getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
		},
	})),
	googleApiRequest: jest.fn(),
	googleApiRequestAllItems: jest.fn(),
}));

const node = new GSuiteAdmin();

const mockLoadOptionsThis = {
	getNode: () => ({
		name: 'Google Workspace Admin',
		parameters: {},
	}),
	helpers: {
		httpRequestWithAuthentication: jest.fn(),
	},
} as unknown as ILoadOptionsFunctions;

describe('GSuiteAdmin Node - loadOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		nock.cleanAll();
		nock.disableNetConnect();
	});

	describe('getDomains', () => {
		it('should return a list of domains', async () => {
			(googleApiRequestAllItems as jest.Mock).mockResolvedValue([
				{ domainName: 'example.com' },
				{ domainName: 'test.com' },
			]);

			const result = await node.methods.loadOptions!.getDomains.call(mockLoadOptionsThis);
			expect(result).toEqual([
				{ name: 'example.com', value: 'example.com' },
				{ name: 'test.com', value: 'test.com' },
			]);
		});
	});

	describe('getSchemas', () => {
		it('should return a list of schemas', async () => {
			(googleApiRequestAllItems as jest.Mock).mockResolvedValue([
				{ displayName: 'Employee Info', schemaName: 'EmployeeSchema' },
				{ displayName: '', schemaName: 'CustomSchema' },
			]);

			const result = await node.methods.loadOptions!.getSchemas.call(mockLoadOptionsThis);
			expect(result).toEqual([
				{ name: 'Employee Info', value: 'EmployeeSchema' },
				{ name: 'CustomSchema', value: 'CustomSchema' },
			]);
		});
	});

	describe('getOrgUnits', () => {
		it('should return a list of organizational units', async () => {
			(googleApiRequest as jest.Mock).mockResolvedValue({
				organizationUnits: [
					{ name: 'Engineering', orgUnitPath: '/engineering' },
					{ name: 'HR', orgUnitPath: '/hr' },
				],
			});

			const result = await node.methods.loadOptions!.getOrgUnits.call(mockLoadOptionsThis);
			expect(result).toEqual([
				{ name: 'Engineering', value: '/engineering' },
				{ name: 'HR', value: '/hr' },
			]);
		});

		it('should throw an error if no organizational units found', async () => {
			(googleApiRequest as jest.Mock).mockResolvedValue({
				organizationUnits: [],
			});

			await expect(node.methods.loadOptions!.getOrgUnits.call(mockLoadOptionsThis)).rejects.toThrow(
				'No organizational units found',
			);
		});

		it('should throw an error if organizationUnits is missing', async () => {
			(googleApiRequest as jest.Mock).mockResolvedValue({});

			await expect(node.methods.loadOptions!.getOrgUnits.call(mockLoadOptionsThis)).rejects.toThrow(
				'Failed to retrieve organizational units',
			);
		});
	});
});
