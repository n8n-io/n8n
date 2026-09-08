import { createKafkaClient } from './client';
export async function createKafkaProducer(credentials, options) {
    const kafka = await createKafkaClient(credentials);
    // acks and timeout are locked in at construction: the library's KafkaJS
    // compatibility layer ignores them when passed to sendBatch.
    return kafka.producer({
        kafkaJS: {
            acks: options.acks,
            timeout: options.timeout,
            allowAutoTopicCreation: true,
            ...(options.compression && { compression: options.compression }),
        },
    });
}
//# sourceMappingURL=producer.js.map