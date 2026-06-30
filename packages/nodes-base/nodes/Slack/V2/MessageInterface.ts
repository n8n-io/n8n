export interface IAttachment {
	fields: {
		item?: object[];
	};
}

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
