import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { NocoDB } from '../../NocoDB.node';

const base = 'p8x2kq9w3m4n5b1';
const table = 'md_m7yq2w4e6r8t0a';

function setup(parameters: Record<string, unknown>) {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
	executeFunctions.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
	executeFunctions.getCredentials.mockResolvedValue({ host: 'https://app.nocodb.com' });
	executeFunctions.helpers.constructExecutionMetaData.mockImplementation((items) => items as never);
	executeFunctions.helpers.returnJsonArray.mockImplementation((data) => [{ json: data as never }]);
	const node = new NocoDB();
	return { executeFunctions, execute: async () => await node.execute.call(executeFunctions) };
}

const getRowParameters = {
	authentication: 'nocoDbApiToken',
	resource: 'row',
	operation: 'get',
	projectId: base,
	table,
	id: '12',
	downloadAttachments: false,
};

describe('NocoDB Node (v1)', () => {
	it('should encode the row ID in the request URL', async () => {
		const { executeFunctions, execute } = setup({
			...getRowParameters,
			version: 3,
			id: '12/13',
		});
		executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({ Id: 12 });

		await execute();

		expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'nocoDbApiToken',
			expect.objectContaining({
				uri: requestUrl`https://app.nocodb.com/api/v2/tables/md_m7yq2w4e6r8t0a/records/12%2F13`,
			}),
		);
	});

	it('should send a table name and row ID entered as encoded values as the same URL as before', async () => {
		const { executeFunctions, execute } = setup({
			...getRowParameters,
			version: 1,
			table: 'My%20Table',
			id: 'a%2Fb',
		});
		executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({ Id: 12 });

		await execute();

		expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'nocoDbApiToken',
			expect.objectContaining({
				uri: requestUrl`https://app.nocodb.com/nc/p8x2kq9w3m4n5b1/api/v1/My%20Table/a%2Fb`,
			}),
		);
	});

	it('should send a numeric row ID in the request URL', async () => {
		const { executeFunctions, execute } = setup({ ...getRowParameters, version: 1, id: 12 });
		executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({ Id: 12 });

		await execute();

		expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'nocoDbApiToken',
			expect.objectContaining({
				uri: requestUrl`https://app.nocodb.com/nc/p8x2kq9w3m4n5b1/api/v1/md_m7yq2w4e6r8t0a/12`,
			}),
		);
	});

	it.each(['projectId', 'table', 'id'])(
		'should reject a dot segment in the %s parameter',
		async (parameter) => {
			const { executeFunctions, execute } = setup({
				...getRowParameters,
				version: 2,
				[parameter]: '..',
			});

			await expect(execute()).rejects.toThrow('Invalid identifier: ".." is not allowed');
			expect(executeFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		},
	);

	it('should send binary data as form data to the upload endpoint', async () => {
		const { executeFunctions, execute } = setup({
			authentication: 'nocoDbApiToken',
			version: 3,
			resource: 'row',
			operation: 'create',
			projectId: base,
			table,
			dataToSend: 'defineBelow',
			'fieldsUi.fieldValues': [{ fieldName: 'Files', binaryData: true, binaryProperty: 'data' }],
		});
		const file = Buffer.from('%PDF-1.');
		executeFunctions.helpers.assertBinaryData.mockReturnValue({
			data: '',
			fileName: 'report.pdf',
			mimeType: 'application/pdf',
		});
		executeFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(file);
		executeFunctions.helpers.requestWithAuthentication
			.mockResolvedValueOnce([{ path: 'download/report.pdf' }])
			.mockResolvedValueOnce([{ Id: 5 }]);

		await execute();

		expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'nocoDbApiToken',
			expect.objectContaining({
				method: 'POST',
				uri: requestUrl`https://app.nocodb.com/api/v2/storage/upload`,
				qs: { base_id: base },
				formData: expect.objectContaining({
					file: {
						value: file,
						options: { filename: 'report.pdf', contentType: 'application/pdf' },
					},
				}),
			}),
		);
	});
});
