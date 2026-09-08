import { mock } from 'vitest-mock-extended';
import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
vi.mock('../../../../v2/transport', () => ({
    odooApiRequest: vi.fn(),
}));
const MOCK_CONTACT = { id: 42, name: 'Jane Doe', email: 'jane@example.com' };
describe('OdooV2 — contact:get', () => {
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
            operation: 'get',
            authentication: 'odooApiKeyApi',
            contactId: 42,
            options: {},
            ...overrides,
        };
        exec.getInputData.mockReturnValue([{ json: {} }]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        exec.getNodeParameter.mockImplementation((key) => params[key]);
    };
    it('fetches a contact by ID with no field filter', async () => {
        setupParams();
        transport.odooApiRequest.mockResolvedValue([MOCK_CONTACT]);
        const result = await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
            ids: [42],
            fields: [],
        });
        expect(result[0][0].json).toEqual(MOCK_CONTACT);
    });
    it('passes selected fields to the API call', async () => {
        setupParams({ options: { fieldsList: ['name', 'email'] } });
        transport.odooApiRequest.mockResolvedValue([MOCK_CONTACT]);
        await node.execute.call(exec);
        expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
            ids: [42],
            fields: ['name', 'email'],
        });
    });
    it('returns error item and continues when continueOnFail is true', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(true);
        transport.odooApiRequest.mockRejectedValue(new Error('Not found'));
        const result = await node.execute.call(exec);
        expect(result[0][0].json).toEqual({ error: 'Not found' });
    });
    it('rethrows the error when continueOnFail is false', async () => {
        setupParams();
        exec.continueOnFail.mockReturnValue(false);
        transport.odooApiRequest.mockRejectedValue(new Error('Not found'));
        await expect(node.execute.call(exec)).rejects.toThrow('Not found');
    });
});
//# sourceMappingURL=get.test.js.map