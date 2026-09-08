import { auditOperations } from '../AuditDescription';
describe('n8n Node Structure', () => {
    it('audit operation default should be one of its options', () => {
        const operation = auditOperations[0];
        const values = operation.options.map((o) => o.value);
        expect(values).toContain(operation.default);
    });
});
//# sourceMappingURL=N8n.structure.test.js.map