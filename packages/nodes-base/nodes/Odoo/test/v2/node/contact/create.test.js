import { mock } from 'vitest-mock-extended';
import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
vi.mock('../../../../v2/transport', () => ({
    odooApiRequest: vi.fn(),
}));
const MOCK_CONTACT_ID = 42;
describe('OdooV2 — contact:create', () => {
    let node;
    let exec;
    beforeEach(() => {
        node = new OdooV2(versionDescription);
        exec = mock();
        exec.helpers = {
            constructExecutionMetaData: vi.fn((data) => data),
            returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data]).map((j) => ({ json: j }))),
        };
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    const setupParams = (overrides = {}) => {
        const params = {
            resource: 'contact',
            operation: 'create',
            authentication: 'odooApiKeyApi',
            'fieldsToSend.mappingMode': 'defineBelow',
            'fieldsToSend.value': { name: 'Jane Doe' },
            ...overrides,
        };
        exec.getInputData.mockReturnValue([{ json: {} }]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        exec.getNodeParameter.mockImplementation((key) => params[key]);
    };
    it('creates a contact using defineBelow mapping and returns its id', async () => {
        setupParams();
        transport.odooApiRequest.mockResolvedValue([MOCK_CONTACT_ID]);
        const result = await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'create', {
            vals_list: [{ name: 'Jane Doe' }],
        });
        expect(result[0][0].json).toEqual({ id: MOCK_CONTACT_ID });
    });
    it('uses item json directly when mappingMode is autoMapInputData', async () => {
        setupParams({ 'fieldsToSend.mappingMode': 'autoMapInputData' });
        exec.getInputData.mockReturnValue([{ json: { name: 'Jane Doe', email: 'jane@example.com' } }]);
        transport.odooApiRequest.mockResolvedValue([MOCK_CONTACT_ID]);
        await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'create', {
            vals_list: [{ name: 'Jane Doe', email: 'jane@example.com' }],
        });
    });
    it('extracts scalar id when Odoo returns a plain number', async () => {
        setupParams();
        transport.odooApiRequest.mockResolvedValue(MOCK_CONTACT_ID);
        const result = await node.execute.call(exec);
        expect(result[0][0].json).toEqual({ id: MOCK_CONTACT_ID });
    });
    it('processes multiple input items independently', async () => {
        exec.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
        exec.getNodeParameter.mockImplementation((key, i) => {
            if (key === 'resource')
                return 'contact';
            if (key === 'operation')
                return 'create';
            if (key === 'authentication')
                return 'odooApiKeyApi';
            if (key === 'fieldsToSend.mappingMode')
                return 'defineBelow';
            if (key === 'fieldsToSend.value')
                return i === 0 ? { name: 'Alice' } : { name: 'Bob' };
            return undefined;
        });
        transport.odooApiRequest.mockResolvedValueOnce([1]).mockResolvedValueOnce([2]);
        const result = await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledTimes(2);
        expect(result[0]).toHaveLength(2);
    });
    it('returns error item and continues when continueOnFail is true', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(true);
        transport.odooApiRequest.mockRejectedValue(new Error('Odoo error'));
        const result = await node.execute.call(exec);
        expect(result[0][0].json).toEqual({ error: 'Odoo error' });
    });
    it('rethrows the error when continueOnFail is false', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(false);
        transport.odooApiRequest.mockRejectedValue(new Error('Odoo error'));
        await expect(node.execute.call(exec)).rejects.toThrow('Odoo error');
    });
});
//# sourceMappingURL=create.test.js.map