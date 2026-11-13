import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { Mailchimp } from '../Mailchimp.node';
import { MailchimpTrigger } from '../MailchimpTrigger.node';

describe('Mailchimp request URLs', () => {
	const baseUrl = 'https://us19.api.mailchimp.com/3.0';

	const requestedUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		jest
			.mocked(context.helpers.requestWithAuthentication)
			.mock.calls.map(([, options]) => [String(options.method), String(options.url)]);

	describe('MailchimpTrigger webhook methods', () => {
		const trigger = new MailchimpTrigger();

		const createContext = (staticData: IDataObject) => {
			const context = mockDeep<IHookFunctions>();
			context.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'authentication') return 'apiKey';
				if (name === 'list') return 'a1b2c3d4e5';
				return [];
			});
			context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19' });
			context.getWorkflowStaticData.mockReturnValue(staticData);
			context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/abc');
			context.helpers.requestWithAuthentication.mockResolvedValue({ id: 'wh1' });
			return context;
		};

		it('should request the webhook URLs of the list', async () => {
			const context = createContext({ webhookId: 'wh1' });

			await trigger.webhookMethods.default.checkExists.call(context);
			await trigger.webhookMethods.default.create.call(context);
			await trigger.webhookMethods.default.delete.call(context);

			expect(requestedUrls(context)).toEqual([
				['GET', `${baseUrl}/lists/a1b2c3d4e5/webhooks/wh1`],
				['POST', `${baseUrl}/lists/a1b2c3d4e5/webhooks`],
				['DELETE', `${baseUrl}/lists/a1b2c3d4e5/webhooks/wh1`],
			]);
		});
	});

	describe('Mailchimp load options', () => {
		it('should request the merge fields and interest categories of the list', async () => {
			const node = new Mailchimp();
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getNodeParameter.mockReturnValue('apiKey');
			context.getCurrentNodeParameter.mockReturnValue('a1b2c3d4e5');
			context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19' });
			context.helpers.requestWithAuthentication.mockResolvedValue({
				merge_fields: [],
				categories: [],
			});

			await node.methods.loadOptions.getMergeFields.call(context);
			await node.methods.loadOptions.getGroupCategories.call(context);

			expect(requestedUrls(context)).toEqual([
				['GET', `${baseUrl}/lists/a1b2c3d4e5/merge-fields`],
				['GET', `${baseUrl}/lists/a1b2c3d4e5/interest-categories`],
			]);
		});
	});

	describe('Mailchimp member email', () => {
		const getMemberUrl = async (typeVersion: number, email: string) => {
			const context = mockDeep<IExecuteFunctions>();
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue({ typeVersion } as ReturnType<IExecuteFunctions['getNode']>);
			context.getNodeParameter.mockImplementation((name: string) => {
				const values: IDataObject = {
					authentication: 'apiKey',
					resource: 'member',
					operation: 'get',
					list: 'a1b2c3d4e5',
					email,
					options: {},
				};
				return values[name];
			});
			context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19' });
			context.helpers.requestWithAuthentication.mockResolvedValue({});
			context.helpers.returnJsonArray.mockReturnValue([]);
			context.helpers.constructExecutionMetaData.mockReturnValue([]);

			await new Mailchimp().execute.call(context);

			const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
			return String(options.url);
		};

		it('should decode the email once in version 1', async () => {
			expect(await getMemberUrl(1, 'a%2Bb%40example.com')).toBe(
				`${baseUrl}/lists/a1b2c3d4e5/members/a%2Bb@example.com`,
			);
		});

		it('should encode the email as entered in version 1.1', async () => {
			expect(await getMemberUrl(1.1, 'a%2Bb%40example.com')).toBe(
				`${baseUrl}/lists/a1b2c3d4e5/members/a%252Bb%2540example.com`,
			);
		});

		describe('member update', () => {
			const updateMember = async (typeVersion: number, email: string) => {
				const context = mockDeep<IExecuteFunctions>();
				context.getInputData.mockReturnValue([{ json: {} }]);
				context.getNode.mockReturnValue({ typeVersion } as ReturnType<
					IExecuteFunctions['getNode']
				>);
				context.getNodeParameter.mockImplementation((name: string) => {
					const values: IDataObject = {
						authentication: 'apiKey',
						resource: 'member',
						operation: 'update',
						list: 'a1b2c3d4e5',
						email,
						updateFields: {},
						jsonParameters: false,
					};
					return values[name];
				});
				context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19' });
				context.helpers.requestWithAuthentication.mockResolvedValue({});
				context.helpers.returnJsonArray.mockReturnValue([]);
				context.helpers.constructExecutionMetaData.mockReturnValue([]);

				await new Mailchimp().execute.call(context);

				const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
				return options;
			};

			it.each([1, 1.1])('should keep the raw email in the body in version %s', async (version) => {
				const options = await updateMember(version, 'a%40b.com');

				expect(options.body).toMatchObject({ email_address: 'a%40b.com' });
			});

			it('should decode the email in the path in version 1', async () => {
				const options = await updateMember(1, 'a%40b.com');

				expect(String(options.url)).toBe(`${baseUrl}/lists/a1b2c3d4e5/members/a@b.com`);
			});
		});
	});
});
