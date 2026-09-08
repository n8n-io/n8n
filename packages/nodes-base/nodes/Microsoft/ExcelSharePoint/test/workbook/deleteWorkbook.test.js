import { mock, mockDeep } from 'vitest-mock-extended';
import { MicrosoftExcelSharePoint } from '../../MicrosoftExcelSharePoint.node';
import * as transport from '../../transport';
// Real transport module except the network helper
vi.mock('../../transport', async () => {
    const originalModule = await vi.importActual('../../transport');
    return {
        ...originalModule,
        microsoftApiRequest: vi.fn(),
    };
});
const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const WORKBOOK_ROOT = `/v1.0/sites/${encodeURIComponent(SITE_ID)}/drives/b!drive1/items/ITEM123`;
describe('Microsoft Excel (SharePoint) — Workbook: Delete', () => {
    let node;
    let ctx;
    const apiRequest = transport.microsoftApiRequest;
    const setParams = (params) => {
        ctx.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => (name in params ? params[name] : fallback));
    };
    const byIdParams = {
        resource: 'workbook',
        operation: 'deleteWorkbook',
        workbook: { mode: 'id', value: 'ITEM123' },
        site: { mode: 'id', value: SITE_ID },
        library: { mode: 'id', value: 'b!drive1' },
    };
    beforeEach(() => {
        vi.clearAllMocks();
        node = new MicrosoftExcelSharePoint();
        ctx = mockDeep();
        ctx.getInputData.mockReturnValue([{ json: {} }]);
        ctx.getNode.mockReturnValue(mock({ typeVersion: 1 }));
        ctx.continueOnFail.mockReturnValue(false);
        ctx.helpers.returnJsonArray.mockImplementation((data) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })));
        ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) => inputData.map((data) => ({ ...data, pairedItem: options?.itemData })));
    });
    it('deletes the workbook file directly, without opening a session', async () => {
        setParams(byIdParams);
        apiRequest.mockResolvedValue({});
        const result = await node.execute.call(ctx);
        expect(apiRequest).toHaveBeenCalledTimes(1);
        expect(apiRequest).toHaveBeenCalledWith('DELETE', WORKBOOK_ROOT);
        expect(result[0][0].json).toEqual({ success: true });
    });
    it('rejects an empty Site when the workbook is chosen by ID', async () => {
        setParams({ ...byIdParams, site: { mode: 'id', value: '' } });
        await expect(node.execute.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
        expect(apiRequest).not.toHaveBeenCalled();
    });
    it('keeps later items running when continue-on-fail is on', async () => {
        ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
        ctx.continueOnFail.mockReturnValue(true);
        setParams(byIdParams);
        apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
        const result = await node.execute.call(ctx);
        expect(result[0].map((item) => item.json)).toEqual([{ error: 'boom' }, { success: true }]);
    });
});
//# sourceMappingURL=deleteWorkbook.test.js.map