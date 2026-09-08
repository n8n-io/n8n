import { formatPemBlock } from '@n8n/utils/format-pem-block';
import * as amqplib from 'amqplib';
import { jsonParse } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
const credentialKeys = ['hostname', 'port', 'username', 'password', 'vhost'];
export async function rabbitmqConnect(credentials) {
    const credentialData = credentialKeys.reduce((acc, key) => {
        acc[key] = credentials[key] === '' ? undefined : credentials[key];
        return acc;
    }, {});
    const optsData = {};
    if (credentials.ssl) {
        credentialData.protocol = 'amqps';
        optsData.ca = credentials.ca === '' ? undefined : [Buffer.from(formatPemBlock(credentials.ca))];
        if (credentials.passwordless) {
            optsData.cert =
                credentials.cert === '' ? undefined : Buffer.from(formatPemBlock(credentials.cert));
            optsData.key =
                credentials.key === '' ? undefined : Buffer.from(formatPemBlock(credentials.key));
            optsData.passphrase = credentials.passphrase === '' ? undefined : credentials.passphrase;
            optsData.credentials = amqplib.credentials.external();
        }
    }
    return await amqplib.connect(credentialData, optsData);
}
export async function rabbitmqCreateChannel() {
    const credentials = await this.getCredentials('rabbitmq');
    return await new Promise(async (resolve, reject) => {
        try {
            const connection = await rabbitmqConnect(credentials);
            // TODO: why is this error handler being added here?
            connection.on('error', reject);
            const channel = await connection.createChannel();
            resolve(channel);
        }
        catch (error) {
            reject(error);
        }
    });
}
export async function rabbitmqConnectQueue(queue, options) {
    const channel = await rabbitmqCreateChannel.call(this);
    return await new Promise(async (resolve, reject) => {
        try {
            if (options.assertQueue) {
                await channel.assertQueue(queue, options);
            }
            else {
                await channel.checkQueue(queue);
            }
            if ('binding' in options && options.binding?.bindings.length) {
                options.binding.bindings.forEach(async (binding) => {
                    await channel.bindQueue(queue, binding.exchange, binding.routingKey);
                });
            }
            resolve(channel);
        }
        catch (error) {
            reject(error);
        }
    });
}
export async function rabbitmqConnectExchange(exchange, options) {
    const exchangeType = this.getNodeParameter('exchangeType', 0);
    const channel = await rabbitmqCreateChannel.call(this);
    return await new Promise(async (resolve, reject) => {
        try {
            if (options.assertExchange) {
                await channel.assertExchange(exchange, exchangeType, options);
            }
            else {
                await channel.checkExchange(exchange);
            }
            resolve(channel);
        }
        catch (error) {
            reject(error);
        }
    });
}
export class MessageTracker {
    messages = [];
    isClosing = false;
    received(message) {
        this.messages.push(message.fields.deliveryTag);
    }
    answered(message) {
        if (this.messages.length === 0) {
            return;
        }
        const index = this.messages.findIndex((value) => value !== message.fields.deliveryTag);
        this.messages.splice(index);
    }
    unansweredMessages() {
        return this.messages.length;
    }
    async closeChannel(channel, consumerTag) {
        if (this.isClosing) {
            return;
        }
        this.isClosing = true;
        // Do not accept any new messages
        if (consumerTag) {
            await channel.cancel(consumerTag);
        }
        let count = 0;
        let unansweredMessages = this.unansweredMessages();
        // Give currently executing messages max. 5 minutes to finish before
        // the channel gets closed. If we would not do that, it would not be possible
        // to acknowledge messages anymore for which the executions were already running
        // when for example a new version of the workflow got saved. That would lead to
        // them getting delivered and processed again.
        while (unansweredMessages !== 0 && count++ <= 300) {
            await sleep(1000);
            unansweredMessages = this.unansweredMessages();
        }
        await channel.close();
        await channel.connection.close();
    }
}
export const parsePublishArguments = (options) => {
    const additionalArguments = {};
    if (options.arguments?.argument.length) {
        options.arguments.argument.forEach((argument) => {
            additionalArguments[argument.key] = argument.value;
        });
    }
    return additionalArguments;
};
export const parseMessage = async (message, options, helpers) => {
    if (options.contentIsBinary) {
        const { content } = message;
        message.content = undefined;
        return {
            binary: {
                data: await helpers.prepareBinaryData(content),
            },
            json: message,
        };
    }
    else {
        let content = message.content.toString();
        if ('jsonParseBody' in options && options.jsonParseBody) {
            content = jsonParse(content);
        }
        if ('onlyContent' in options && options.onlyContent) {
            return { json: content };
        }
        else {
            message.content = content;
            return { json: message };
        }
    }
};
export async function handleMessage(message, channel, messageTracker, acknowledgeMode, options) {
    try {
        if (acknowledgeMode !== 'immediately') {
            messageTracker.received(message);
        }
        const item = await parseMessage(message, options, this.helpers);
        let responsePromise = undefined;
        let responsePromiseHook = undefined;
        if (acknowledgeMode === 'laterMessageNode') {
            responsePromiseHook = this.helpers.createDeferredPromise();
            // Also await execution end so we can nack when the run errors
            // before the Delete-from-Queue node fires sendResponse. The engine
            // unconditionally resolves the hook at teardown via
            // resolveExecutionResponsePromise with an empty {} — the payload
            // shape is what tells a real sendResponse apart from that cleanup.
            responsePromise = this.helpers.createDeferredPromise();
        }
        else if (acknowledgeMode !== 'immediately') {
            responsePromise = this.helpers.createDeferredPromise();
        }
        this.emit([[item]], responsePromiseHook, responsePromise);
        if (acknowledgeMode === 'laterMessageNode' && responsePromise && responsePromiseHook) {
            const hookRace = responsePromiseHook.promise.then((data) => ({
                kind: 'hook',
                isRealSendResponse: data !== null &&
                    data !== undefined &&
                    typeof data === 'object' &&
                    Object.keys(data).length > 0,
            }));
            const runRace = responsePromise.promise.then((data) => ({
                kind: 'run',
                data,
            }));
            const first = await Promise.race([hookRace, runRace]);
            if (first.kind === 'hook' && first.isRealSendResponse) {
                channel.ack(message);
            }
            else {
                const runData = first.kind === 'run' ? first.data : await responsePromise.promise;
                if (runData?.data?.resultData?.error) {
                    channel.nack(message);
                }
                else {
                    channel.ack(message);
                }
            }
            messageTracker.answered(message);
        }
        else if (responsePromise && acknowledgeMode !== 'laterMessageNode') {
            // Acknowledge message after the execution finished
            await responsePromise.promise.then(async (data) => {
                if (data.data.resultData.error) {
                    // The execution did fail
                    if (acknowledgeMode === 'executionFinishesSuccessfully') {
                        channel.nack(message);
                        messageTracker.answered(message);
                        return;
                    }
                }
                channel.ack(message);
                messageTracker.answered(message);
            });
        }
        else {
            // Acknowledge message directly
            channel.ack(message);
        }
    }
    catch (error) {
        const workflow = this.getWorkflow();
        const node = this.getNode();
        if (acknowledgeMode !== 'immediately') {
            messageTracker.answered(message);
        }
        this.logger.error(`There was a problem with the RabbitMQ Trigger node "${node.name}" in workflow "${workflow.id}": "${error.message}"`, {
            node: node.name,
            workflowId: workflow.id,
        });
    }
}
//# sourceMappingURL=GenericFunctions.js.map