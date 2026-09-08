import { execute as activityCreateExecute } from '../../v2/actions/activity/create.operation';
import { execute as activityUpdateExecute } from '../../v2/actions/activity/update.operation';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../v2/transport';
vi.mock('../../v2/transport', () => ({
    pipedriveApiRequest: { call: vi.fn() },
    pipedriveApiRequestAllItemsCursor: { call: vi.fn() },
    pipedriveApiRequestAllItemsOffset: { call: vi.fn() },
    pipedriveGetCustomProperties: { call: vi.fn() },
}));
const mockApiRequest = pipedriveApiRequest;
const mockGetCustomProperties = pipedriveGetCustomProperties;
function buildContext(params) {
    return {
        getInputData: vi.fn(() => [{ json: {} }]),
        getNodeParameter: vi.fn((name, _i, defaultValue) => {
            if (Object.prototype.hasOwnProperty.call(params, name))
                return params[name];
            return defaultValue;
        }),
        continueOnFail: vi.fn(() => false),
        helpers: {
            returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
            constructExecutionMetaData: vi.fn((items) => items),
        },
        getNode: vi.fn(() => ({})),
    };
}
function getRequestBody() {
    const [, , , body] = mockApiRequest.call.mock.calls[0];
    return body;
}
describe('Pipedrive v2 maps activity person_id to a primary participant on outgoing requests', () => {
    beforeEach(() => {
        mockApiRequest.call.mockReset().mockResolvedValue({ data: {}, additionalData: {} });
        mockGetCustomProperties.call.mockReset().mockResolvedValue({});
    });
    it('activity/create sends person_id as a primary participant', async () => {
        const ctx = buildContext({
            rawCustomFieldKeys: true,
            subject: 'Call client',
            done: false,
            type: 'call',
            additionalFields: { person_id: 42 },
        });
        await activityCreateExecute.call(ctx);
        const [, method, endpoint] = mockApiRequest.call.mock.calls[0];
        const body = getRequestBody();
        expect(method).toBe('POST');
        expect(endpoint).toBe('/activities');
        expect(body.participants).toEqual([{ person_id: 42, primary: true }]);
        expect(body).not.toHaveProperty('person_id');
    });
    it('activity/update sends person_id as a primary participant', async () => {
        const ctx = buildContext({
            rawCustomFieldKeys: true,
            activityId: 10,
            updateFields: { person_id: 42 },
        });
        await activityUpdateExecute.call(ctx);
        const [, method, endpoint] = mockApiRequest.call.mock.calls[0];
        const body = getRequestBody();
        expect(method).toBe('PATCH');
        expect(endpoint).toBe('/activities/10');
        expect(body.participants).toEqual([{ person_id: 42, primary: true }]);
        expect(body).not.toHaveProperty('person_id');
    });
    it('activity/create omits participants and the read-only key when no person_id is set', async () => {
        const ctx = buildContext({
            rawCustomFieldKeys: true,
            subject: 'Call client',
            done: false,
            type: 'call',
            additionalFields: { person_id: 0 },
        });
        await activityCreateExecute.call(ctx);
        const body = getRequestBody();
        expect(body).not.toHaveProperty('participants');
        expect(body).not.toHaveProperty('person_id');
    });
});
//# sourceMappingURL=personIdParticipants.test.js.map