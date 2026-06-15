import { INodeCredentialsDetailsSchema } from '../src/schemas';

describe('INodeCredentialsDetailsSchema', () => {
	it('accepts a real credential with a string id', () => {
		const result = INodeCredentialsDetailsSchema.parse({ id: 'abc123', name: 'My Key' });
		expect(result).toEqual({ id: 'abc123', name: 'My Key' });
	});

	it('accepts id: null (legacy shape)', () => {
		const result = INodeCredentialsDetailsSchema.parse({ id: null, name: '' });
		expect(result).toEqual({ id: null, name: '' });
	});

	it('accepts the n8n Connect credential shape and preserves __aiGatewayManaged', () => {
		const result = INodeCredentialsDetailsSchema.parse({
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});
		expect(result).toEqual({ id: null, name: '', __aiGatewayManaged: true });
	});

	it('preserves __aiGatewayManaged: false when present', () => {
		const result = INodeCredentialsDetailsSchema.parse({
			id: 'x',
			name: 'y',
			__aiGatewayManaged: false,
		});
		expect(result).toEqual({ id: 'x', name: 'y', __aiGatewayManaged: false });
	});

	it('omits __aiGatewayManaged when not provided', () => {
		const result = INodeCredentialsDetailsSchema.parse({ id: 'x', name: 'y' });
		expect(result.__aiGatewayManaged).toBeUndefined();
	});
});
