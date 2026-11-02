import * as sharedErrors from '@n8n/errors';

import * as workflowErrors from '../../src/errors';

describe('errors re-exported from @n8n/errors', () => {
	it.each([
		'ApplicationError',
		'BaseError',
		'OperationalError',
		'UnexpectedError',
		'UserError',
	] as const)('should re-export the shared %s class', (name) => {
		expect(workflowErrors[name]).toBe(sharedErrors[name]);
	});
});
