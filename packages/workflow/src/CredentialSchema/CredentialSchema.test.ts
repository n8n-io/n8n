import { CredentialSchema } from '../CredentialSchema';

describe('CredentialSchema', () => {
	test('should convert Strapi credential to node properties', () => {
		expect(
			CredentialSchema.create({
				notice: CredentialSchema.notice(
					'Make sure you are using a user account not an admin account',
				),
				email: CredentialSchema.email({ placeholder: 'name@email.com' }),
				password: CredentialSchema.password(),
				url: CredentialSchema.url({
					placeholder: 'https://api.example.com',
				}),
				apiVersion: CredentialSchema.options({
					label: 'API Version',
					description: 'The version of api to be used',
					options: [
						{
							label: 'Version 4',
							value: 'v4',
							description: 'API version supported by Strapi 4',
						},
						{
							label: 'Version 3',
							value: 'v3',
							default: true,
							description: 'API version supported by Strapi 3',
						},
					],
				}),
			}).toNodeProperties(),
		).toEqual([
			{
				displayName: 'Make sure you are using a user account not an admin account',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://api.example.com',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				default: 'v3',
				type: 'options',
				description: 'The version of api to be used',
				options: [
					{
						name: 'Version 4',
						value: 'v4',
						description: 'API version supported by Strapi 4',
					},
					{
						name: 'Version 3',
						value: 'v3',
						description: 'API version supported by Strapi 3',
					},
				],
			},
		]);
	});

	test('should validate credentials', () => {
		const schema = CredentialSchema.create({
			notice: CredentialSchema.notice('Notice'),
			email: CredentialSchema.email(),
			password: CredentialSchema.password(),
			url: CredentialSchema.url(),
			apiVersion: CredentialSchema.options({
				label: 'API Version',
				options: [
					{
						label: 'Version 4',
						value: 'v4',
					},
					{
						label: 'Version 3',
						value: 'v3',
						default: true,
					},
				],
			}),
		});

		const validData = {
			email: 'foo@x.com',
			url: 'https://google.com',
			password: 'foo',
			apiVersion: 'v3',
		};
		expect(schema.validate(validData).success).toEqual(true);

		expect(
			schema.validate({
				...validData,
				email: 'hello world',
			}).success,
		).toEqual(false);

		expect(
			schema.validate({
				...validData,
				url: 'hello world',
			}).success,
		).toEqual(false);

		expect(schema.validate({}).success).toEqual(false);
	});
});
