import { getAllProperties } from '../V2/GenericFunctions';
import { HubspotV2 } from '../V2/HubspotV2.node';
const baseDescription = {
    displayName: 'HubSpot',
    name: 'hubspot',
    group: ['output'],
    description: 'Consume HubSpot API',
};
/**
 * Build a fake ILoadOptionsFunctions whose HTTP helper serves the given
 * deal properties as one or two pages of the CRM v3 properties response.
 * `pageBreakAfter` splits the list to simulate cursor pagination.
 */
function createContext(properties, pageBreakAfter) {
    // `qs` is mutated in place between requests, so snapshot the cursor per call.
    const cursorsSent = [];
    const urisRequested = [];
    const requestWithAuthentication = vi.fn(async (_credentialType, options) => {
        const after = options.qs?.after;
        cursorsSent.push(after);
        urisRequested.push(options.uri);
        if (pageBreakAfter === undefined) {
            return { results: properties };
        }
        if (!after) {
            return {
                results: properties.slice(0, pageBreakAfter),
                paging: { next: { after: 'cursor-1' } },
            };
        }
        return { results: properties.slice(pageBreakAfter) };
    });
    const context = {
        getNodeParameter: vi.fn((name) => (name === 'authentication' ? 'appToken' : undefined)),
        getNode: vi.fn().mockReturnValue({ type: 'n8n-nodes-base.hubspot' }),
        helpers: { requestWithAuthentication },
    };
    return { context, requestWithAuthentication, cursorsSent, urisRequested };
}
const node = new HubspotV2(baseDescription);
const loadOptions = node.methods.loadOptions;
describe('HubSpot V2 deal property loadOptions', () => {
    afterEach(() => vi.clearAllMocks());
    describe('getAllProperties pagination', () => {
        it('follows the paging cursor to collect properties across pages', async () => {
            const properties = [
                { name: 'amount', label: 'Amount' },
                { name: 'pipeline', label: 'Pipeline' },
                { name: 'hs_priority', label: 'Priority' },
            ];
            const { context, requestWithAuthentication, cursorsSent, urisRequested } = createContext(properties, 2);
            const result = await getAllProperties.call(context, 'deals');
            expect(result).toHaveLength(3);
            expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
            // first page has no cursor, second page passes the cursor from the first page
            expect(cursorsSent).toEqual([undefined, 'cursor-1']);
            expect(urisRequested[1]).toContain('/crm/v3/properties/deals');
        });
    });
    describe('getDealProperties', () => {
        it('returns every property (including ones on later pages) sorted by label', async () => {
            const properties = [
                { name: 'pipeline', label: 'Pipeline' },
                { name: 'amount', label: 'Amount' },
                { name: 'hs_priority', label: 'Priority' },
            ];
            const { context } = createContext(properties, 2);
            const result = await loadOptions.getDealProperties.call(context);
            expect(result).toEqual([
                { name: 'Amount', value: 'amount' },
                { name: 'Pipeline', value: 'pipeline' },
                { name: 'Priority', value: 'hs_priority' },
            ]);
        });
    });
    describe('getDealPropertiesWithType', () => {
        it('encodes the property type into the option value', async () => {
            const properties = [
                { name: 'amount', label: 'Amount', type: 'number' },
                { name: 'closedate', label: 'Close Date', type: 'datetime' },
            ];
            const { context } = createContext(properties);
            const result = await loadOptions.getDealPropertiesWithType.call(context);
            expect(result).toEqual([
                { name: 'Amount', value: 'amount|number' },
                { name: 'Close Date', value: 'closedate|datetime' },
            ]);
        });
    });
});
//# sourceMappingURL=loadOptions.test.js.map