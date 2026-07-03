import { INodeCredentialsDetailsSchema } from '../src/schemas';

describe('INodeCredentialsDetailsSchema', () => {
	it('accepts AI Gateway-managed credential entries', () => {
		const result = INodeCredentialsDetailsSchema.parse({
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});

		expect(result).toEqual({ id: null, name: '', __aiGatewayManaged: true });
	});

	it('accepts real credential entries', () => {
		const result = INodeCredentialsDetailsSchema.parse({ id: 'cred-123', name: 'My credential' });

		expect(result).toEqual({ id: 'cred-123', name: 'My credential' });
	});
});
