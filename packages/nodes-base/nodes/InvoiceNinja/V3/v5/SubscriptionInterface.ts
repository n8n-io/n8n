import type { Subscription } from './interfaces/subscription';

export interface ISubscription
	extends Partial<
		Omit<
			Subscription,
			| 'id'
			| 'webhook_configuration'
			| 'user_id'
			| 'company_id'
			| 'purchase_page'
			| 'promo_price'
			| 'plan_map'
			| 'entity_type'
		>
	> {
	webhook_configuration?: object;
}
