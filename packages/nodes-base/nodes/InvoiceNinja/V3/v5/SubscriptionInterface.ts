import type { Subscription } from './interfaces/subscription';

export interface ISubscription extends Partial<Omit<Subscription, 'id' | 'webhook_configuration' | 'user_id' | 'entity_type'>> {
	webhook_configuration?: object;
}
