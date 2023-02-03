import type { Subscription } from './interfaces/subscription';

export interface ISubscription extends Partial<Omit<Subscription, 'id' | 'webhook_configuration'>> {
	webhook_configuration?: object;
}
