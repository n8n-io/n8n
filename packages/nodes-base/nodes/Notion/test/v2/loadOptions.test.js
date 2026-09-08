import { getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';
function createLoadOptionsContext(parameters) {
    return {
        getCurrentNodeParameter: vi.fn((name) => parameters[name]),
    };
}
describe('Notion V2 load options', () => {
    it('returns no options when database options are requested without a page', async () => {
        const context = createLoadOptionsContext({ pageId: null });
        const result = await getDatabaseOptionsFromPage.call(context);
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=loadOptions.test.js.map