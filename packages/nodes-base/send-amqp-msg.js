const rhea = require('rhea');

// Define connection options
const connectionOptions = {
	host: 'localhost', // Azure Service Bus emulator runs on localhost
	hostname: 'localhost',
	port: 5672, // Default AMQP port for the emulator
};

const container = rhea.create_container();

// Establish the connection
const connection = rhea.connect(connectionOptions);

// Handle connection events
connection.on('connection_open', () => {
	console.log('Connected to Azure Service Bus emulator!');
	// connection.close();

	// // Create a receiver
	// const receiver = connection.open_receiver('queue.1'); // Replace with your queue name

	// receiver.on('message', (message) => {
	// 	console.log('Received message:', message);
	// });

	// Create a sender
	const sender = connection.open_sender('queue.1'); // Replace with your queue name

	sender.on('sendable', () => {
		const body = JSON.parse(
			'{"EventSource":null,"EventVersion":1,"EventName":"UserUpdated","Reason":"User has updated their profile","Actor":"94631ef9-e425-4741-9974-c5d5d2053780","EventTime":"2024-11-29T02:50:57.8474675Z","CorrelationId":"3f2670d5-ed4a-4e59-ab54-48ba455df464","OperationId":null,"ParentId":null,"SessionId":null,"Payload":{"Version":1,"Data":{"User":{"UserId":"d428d00a-2abd-48c1-988e-5155d8955a03","Email":"testtmnzcustomer@gmail.com","FirstName":"testTMNZ","LastName":"Customer","DateOfBirth":"2001-01-01T00:00:00Z","SubscribedToMarketingInfo":true,"IsActive":false,"UserTypeId":3}},"AdditionalInfo":{}},"Metadata":{},"Application":"TaxManager Customer App","Domain":"Identity","Environment":"Azure Dev Environment"}',
		);
		const messageBuffer = Buffer.from(JSON.stringify(body), 'utf-8');

		// Send a message
		sender.send({
			body: {
				content: messageBuffer,
			},
		});
		console.log('Message sent!');
		connection.close();
	});
});

connection.on('connection_error', (err) => {
	console.error('Connection error:', err);
});

connection.on('connection_close', () => {
	console.log('Connection closed.');
});
