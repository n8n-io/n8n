import { Container } from '@n8n/di';
import { InstanceSettings, parseHitlCallbackReference } from 'n8n-core';
import { mock } from 'vitest-mock-extended';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import * as genericFunctions from '../../GenericFunctions';
import { Telegram } from '../../Telegram.node';
const TEST_HMAC_SECRET = 'test-hmac-secret';
Container.set(InstanceSettings, { hmacSignatureSecret: TEST_HMAC_SECRET });
vi.mock('../../GenericFunctions', async () => {
    const originalModule = await vi.importActual('../../GenericFunctions');
    return {
        ...originalModule,
        apiRequest: vi.fn(),
    };
});
describe('Test Telegram, message => sendAndWait', () => {
    let telegram;
    let mockExecuteFunctions;
    beforeEach(() => {
        telegram = new Telegram();
        mockExecuteFunctions = mock();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it('should send message and put execution to wait', async () => {
        const items = [{ json: { data: 'test' } }];
        //node
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
        mockExecuteFunctions.getNode.mockReturnValue(mock());
        mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
        //createSendAndWaitMessageBody
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
        //getSendAndWaitConfig
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
        mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/waiting-webhook/nodeID?approved=true&signature=abc');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
        // configureWaitTillDate
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options.limitWaitTime.values
        const result = await telegram.execute.call(mockExecuteFunctions);
        expect(result).toEqual([items]);
        expect(genericFunctions.apiRequest).toHaveBeenCalledTimes(1);
        expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);
        expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'sendMessage', {
            chat_id: 'chatID',
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Approve',
                            url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
                        },
                    ],
                ],
            },
            text: 'my message\n\n_This message was sent automatically with _[n8n](https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_instanceId)',
        });
    });
    it('should route API errors to error output when continueOnFail is true', async () => {
        const items = [{ json: { data: 'test' } }];
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
        mockExecuteFunctions.getNode.mockReturnValue(mock());
        mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
        mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/waiting-webhook/nodeID?approved=true&signature=abc');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
        mockExecuteFunctions.continueOnFail.mockReturnValue(true);
        genericFunctions.apiRequest.mockRejectedValueOnce(new Error('chat_not_found'));
        const result = await telegram.execute.call(mockExecuteFunctions);
        expect(result).toEqual([[{ json: { error: 'chat_not_found' } }]]);
        expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
    });
    it('should rethrow API errors when continueOnFail is false', async () => {
        const items = [{ json: { data: 'test' } }];
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
        mockExecuteFunctions.getNode.mockReturnValue(mock());
        mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
        mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/waiting-webhook/nodeID?approved=true&signature=abc');
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
        mockExecuteFunctions.continueOnFail.mockReturnValue(false);
        genericFunctions.apiRequest.mockRejectedValueOnce(new Error('chat_not_found'));
        await expect(telegram.execute.call(mockExecuteFunctions)).rejects.toThrow('chat_not_found');
        expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
    });
});
describe('createSendAndWaitMessageBody - chat approval callback references', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });
    it('mints an approve callback with decision "a" and a decline callback with decision "d"', () => {
        const context = mock();
        context.getExecutionId.mockReturnValue('exec-42');
        context.getInstanceId.mockReturnValue('instanceId');
        context.getSignedResumeUrl.mockImplementation((params) => `http://localhost/waiting-webhook/nodeID?approved=${params?.approved}&signature=abc`);
        context.getNodeParameter.mockImplementation((name) => {
            switch (name) {
                case 'chatId':
                    return 'chatID';
                case 'message':
                    return 'my message';
                case 'subject':
                    return 'my subject';
                case 'approvalOptions.values':
                    return {
                        approvalType: 'double',
                        approveLabel: 'Approve',
                        disapproveLabel: 'Decline',
                    };
                case 'responseType':
                    return 'approval';
                default:
                    return {};
            }
        });
        const body = genericFunctions.createSendAndWaitMessageBody(context, true);
        const buttons = body.reply_markup.inline_keyboard[0];
        const decisionForLabel = (label) => {
            const button = buttons.find((b) => b.text === label);
            return button && parseHitlCallbackReference(button.callback_data)?.decision;
        };
        expect(decisionForLabel('Approve')).toBe('a');
        expect(decisionForLabel('Decline')).toBe('d');
    });
});
//# sourceMappingURL=sendAndWait.operation.test.js.map