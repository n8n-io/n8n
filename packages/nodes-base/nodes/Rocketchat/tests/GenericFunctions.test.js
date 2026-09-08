import { rocketchatApiRequest, rocketchatApiRequestAllItems, validateJSON, } from '../GenericFunctions';
describe('RocketChat > GenericFunctions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('validateJSON', () => {
        it('should parse valid JSON object', () => {
            const result = validateJSON('{"a":1}');
            expect(result).toEqual({ a: 1 });
        });
        it('should parse valid JSON array', () => {
            const result = validateJSON('[{"a":1}]');
            expect(result).toEqual([{ a: 1 }]);
        });
        it('should return empty array on invalid JSON', () => {
            const result = validateJSON('{invalid}');
            expect(result).toEqual([]);
        });
        it('should return empty array when undefined', () => {
            const result = validateJSON(undefined);
            expect(result).toEqual([]);
        });
    });
    describe('rocketchatApiRequest', () => {
        function createContext() {
            const requestWithAuthentication = vi.fn();
            const context = {
                getCredentials: vi.fn().mockResolvedValue({
                    domain: 'https://chat.example.com',
                }),
                helpers: {
                    requestWithAuthentication,
                },
            };
            return { context, requestWithAuthentication };
        }
        it('should build correct request and call helper', async () => {
            const { context, requestWithAuthentication } = createContext();
            requestWithAuthentication.mockResolvedValueOnce({ ok: true });
            const result = await rocketchatApiRequest.call(context, '/chat', 'POST', 'postMessage', { text: 'hello' }, { foo: 'bar' }, { header: 'x' });
            expect(result).toEqual({ ok: true });
            expect(requestWithAuthentication).toHaveBeenCalledWith('rocketchatApi', expect.objectContaining({
                method: 'POST',
                uri: 'https://chat.example.com/api/v1/chat.postMessage',
                body: { text: 'hello' },
                qs: { foo: 'bar' },
                headers: { header: 'x' },
                json: true,
            }));
        });
        it('should remove empty body', async () => {
            const { context, requestWithAuthentication } = createContext();
            requestWithAuthentication.mockResolvedValueOnce({ ok: true });
            await rocketchatApiRequest.call(context, '/subscriptions', 'GET', 'get', {});
            const call = requestWithAuthentication.mock.calls[0][1];
            expect(call.body).toBeUndefined();
        });
        it('should propagate API errors', async () => {
            const { context, requestWithAuthentication } = createContext();
            requestWithAuthentication.mockRejectedValueOnce(new Error('API Error'));
            await expect(rocketchatApiRequest.call(context, '/chat', 'POST', 'postMessage', {})).rejects.toThrow('API Error');
        });
    });
    describe('rocketchatApiRequestAllItems', () => {
        function createContext() {
            const requestWithAuthentication = vi.fn();
            const context = {
                getCredentials: vi.fn().mockResolvedValue({
                    domain: 'https://chat.example.com',
                }),
                helpers: {
                    requestWithAuthentication,
                },
            };
            return { context, requestWithAuthentication };
        }
        it('should request all pages using offset and count', async () => {
            const { context, requestWithAuthentication } = createContext();
            requestWithAuthentication
                .mockResolvedValueOnce({
                messages: [{ _id: 'msg1' }, { _id: 'msg2' }],
                total: 3,
            })
                .mockResolvedValueOnce({
                messages: [{ _id: 'msg3' }],
                total: 3,
            });
            const result = await rocketchatApiRequestAllItems.call(context, 'messages', '/dm', 'GET', 'messages', {}, { roomId: 'ROOM1', count: 2 });
            expect(result).toEqual([{ _id: 'msg1' }, { _id: 'msg2' }, { _id: 'msg3' }]);
            expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
            const firstQuery = requestWithAuthentication.mock.calls[0][1].qs;
            const secondQuery = requestWithAuthentication.mock.calls[1][1].qs;
            expect(firstQuery).not.toHaveProperty('limit');
            expect(secondQuery).not.toHaveProperty('limit');
            expect(firstQuery).toEqual({
                roomId: 'ROOM1',
                offset: 0,
                count: 2,
            });
            expect(secondQuery).toEqual({
                roomId: 'ROOM1',
                offset: 2,
                count: 2,
            });
        });
        it('should use default limit when none is provided', async () => {
            const { context, requestWithAuthentication } = createContext();
            requestWithAuthentication.mockResolvedValueOnce({
                messages: [{ _id: 'msg1' }],
                total: 1,
            });
            await rocketchatApiRequestAllItems.call(context, 'messages', '/dm', 'GET', 'messages', {}, { roomId: 'ROOM1' });
            const query = requestWithAuthentication.mock.calls[0][1].qs;
            expect(query).not.toHaveProperty('limit');
            expect(query).toEqual({
                roomId: 'ROOM1',
                offset: 0,
                count: 100,
            });
        });
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map