export interface IAttachment {
	fields: {
		item?: object[];
	};
}

/**
 * `action_id` values for the interactive HITL approve/decline buttons. Shared by the
 * button builder and the webhook consumer so a typo can't silently desync (which would
 * fail closed to "declined").
 */
export const HITL_APPROVE_ACTION_ID = 'n8n_hitl_approve';
export const HITL_DECLINE_ACTION_ID = 'n8n_hitl_decline';

// Used for SendAndWaitMessage
export interface TextBlock {
	type: string;
	text: string;
	emoji?: boolean;
}

export interface SectionBlock {
	type: 'section';
	text: TextBlock;
}

export interface DividerBlock {
	type: 'divider';
}

export interface ButtonElement {
	type: 'button';
	style?: 'primary';
	text: TextBlock;
	/** Present for plain link buttons (default HITL behaviour). */
	url?: string;
	/** Present for interactive buttons (capture-responder mode): the decision. */
	action_id?: string;
	/** Present for interactive buttons: which run/node to resume, echoed back by Slack. */
	value?: string;
}

export interface ActionsBlock {
	type: 'actions';
	elements: ButtonElement[];
}

export interface SendAndWaitMessageBody {
	channel: string;
	blocks: Array<DividerBlock | SectionBlock | ActionsBlock>;
}
