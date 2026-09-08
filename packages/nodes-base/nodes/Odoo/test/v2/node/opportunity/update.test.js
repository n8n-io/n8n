import { mock } from 'vitest-mock-extended';
import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
vi.mock('../../../../v2/transport', () => ({
    odooApiRequest: vi.fn(),
}));
const OPP_ID = 99;
describe('OdooV2 — opportunity:update', () => {
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
            operation: 'update',
            authentication: 'odooApiKeyApi',
            opportunityId: OPP_ID,
            'fieldsToSend.mappingMode': 'defineBelow',
            'fieldsToSend.value': {},
            ...overrides,
        };
        exec.getInputData.mockReturnValue([{ json: {} }]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        exec.getNodeParameter.mockImplementation((key) => params[key]);
    };
    it('updates an opportunity using defineBelow mapping and returns id + updated flag', async () => {
        setupParams({ 'fieldsToSend.value': { name: 'Renamed Deal', expected_revenue: 9000 } });
        transport.odooApiRequest.mockResolvedValue(true);
        const result = await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'write', {
            ids: [OPP_ID],
            vals: { name: 'Renamed Deal', expected_revenue: 9000 },
        });
        expect(result[0][0].json).toEqual({ id: OPP_ID, updated: true });
    });
    it('uses item json directly when mappingMode is autoMapInputData', async () => {
        setupParams({ 'fieldsToSend.mappingMode': 'autoMapInputData' });
        exec.getInputData.mockReturnValue([{ json: { name: 'Auto Update' } }]);
        transport.odooApiRequest.mockResolvedValue(true);
        await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'write', {
            ids: [OPP_ID],
            vals: { name: 'Auto Update' },
        });
    });
    it('returns error item and continues when continueOnFail is true', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(true);
        transport.odooApiRequest.mockRejectedValue(new Error('Update failed'));
        const result = await node.execute.call(exec);
        expect(result[0][0].json).toEqual({ error: 'Update failed' });
    });
    it('rethrows the error when continueOnFail is false', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(false);
        transport.odooApiRequest.mockRejectedValue(new Error('Update failed'));
        await expect(node.execute.call(exec)).rejects.toThrow('Update failed');
    });
});
//# sourceMappingURL=update.test.js.map