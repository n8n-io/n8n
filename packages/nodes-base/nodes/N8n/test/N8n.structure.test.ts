import { auditOperations } from '../AuditDescription';

describe('n8n Node Structure', () => {
	it('audit operation default should be one of its options', () => {
		const operation = auditOperations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});
});
