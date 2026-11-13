import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { GoogleContacts } from '../GoogleContacts.node';

describe('Google Contacts - request URL encoding', () => {
	it('should encode a contact ID with a slash as one path segment', async () => {
		const params: IDataObject = {
			resource: 'contact',
			operation: 'delete',
			contactId: 'c123456789/c987654321',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await new GoogleContacts().execute.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleContactsOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://people.googleapis.com/v1/people/c123456789%2Fc987654321:deleteContact`,
			}),
		);
	});

	it('should reject a contact ID with a dot segment', async () => {
		const params: IDataObject = {
			resource: 'contact',
			operation: 'delete',
			contactId: 'c123456789/../c987654321',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await expect(new GoogleContacts().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestOAuth2).not.toHaveBeenCalled();
	});
});
