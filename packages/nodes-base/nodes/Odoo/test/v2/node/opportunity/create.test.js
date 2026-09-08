import { mock } from 'vitest-mock-extended';
import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
vi.mock('../../../../v2/transport', () => ({
    odooApiRequest: vi.fn(),
}));
const MOCK_OPP_ID = 99;
describe('OdooV2 — opportunity:create', () => {
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
            resource: 'opportunity',
            operation: 'create',
            authentication: 'odooApiKeyApi',
            'fieldsToSend.mappingMode': 'defineBelow',
            'fieldsToSend.value': { name: 'New Deal' },
            ...overrides,
        };
        exec.getInputData.mockReturnValue([{ json: {} }]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        exec.getNodeParameter.mockImplementation((key) => params[key]);
    };
    it('creates an opportunity using defineBelow mapping and returns its id', async () => {
        setupParams();
        transport.odooApiRequest.mockResolvedValue([MOCK_OPP_ID]);
        const result = await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'create', {
            vals_list: [{ name: 'New Deal' }],
        });
        expect(result[0][0].json).toEqual({ id: MOCK_OPP_ID });
    });
    it('uses item json directly when mappingMode is autoMapInputData', async () => {
        setupParams({ 'fieldsToSend.mappingMode': 'autoMapInputData' });
        exec.getInputData.mockReturnValue([{ json: { name: 'Auto Deal', expected_revenue: 5000 } }]);
        transport.odooApiRequest.mockResolvedValue([MOCK_OPP_ID]);
        await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'create', {
            vals_list: [{ name: 'Auto Deal', expected_revenue: 5000 }],
        });
    });
    it('extracts scalar id when Odoo returns a plain number', async () => {
        setupParams();
        transport.odooApiRequest.mockResolvedValue(MOCK_OPP_ID);
        const result = await node.execute.call(exec);
        expect(result[0][0].json).toEqual({ id: MOCK_OPP_ID });
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