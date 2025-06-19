type Argument = {
	key: string;
	value?: string;
};

type Binding = {
	exchange: string;
	routingKey: string;
};

type Header = {
	key: string;
	value?: string;
};

export type Options = {
	autoDelete: boolean;
	assertExchange: boolean;
	assertQueue: boolean;
	durable: boolean;
	exclusive: boolean;
	arguments: {
		argument: Argument[];
	};
	headers: {
		header: Header[];
	};
};

type ContentOptions =
	| {
			contentIsBinary: true;
	  }
	| {
			contentIsBinary: false;
			jsonParseBody: boolean;
			onlyContent: boolean;
	  };

export type TriggerOptions = Options & {
	acknowledge:
		| 'executionFinishes'
		| 'executionFinishesSuccessfully'
		| 'immediately'
		| 'laterMessageNode';
	parallelMessages: number;
	binding: {
		bindings: Binding[];
	};
} & ContentOptions;

export type RabbitMQCredentials = {
	hostname: string;
	port: number;
	username: string;
	password: string;
	vhost: string;
} & (
	| { ssl: false }
	| ({ ssl: true; ca: string } & (
			| { passwordless: false }
			| {
					passwordless: true;
					cert: string;
					key: string;
					passphrase: string;
			  }
	  ))
);

export type ExchangeType = 'direct' | 'topic' | 'headers' | 'fanout';
