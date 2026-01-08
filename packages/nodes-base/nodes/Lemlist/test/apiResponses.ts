// Mock API responses for Lemlist node tests

export const getCampaignsResponse = [
	{
		_id: 'cam_abc123def456',
		name: 'Test Campaign 1',
		labels: ['sales', 'outreach'],
		createdAt: '2024-01-15T10:30:00.000Z',
		updatedAt: '2024-01-20T14:45:00.000Z',
	},
	{
		_id: 'cam_xyz789ghi012',
		name: 'Test Campaign 2',
		labels: ['marketing'],
		createdAt: '2024-02-01T08:00:00.000Z',
		updatedAt: '2024-02-05T16:20:00.000Z',
	},
];

export const getCampaignResponse = {
	_id: 'cam_abc123def456',
	name: 'Test Campaign 1',
	labels: ['sales', 'outreach'],
	createdAt: '2024-01-15T10:30:00.000Z',
	updatedAt: '2024-01-20T14:45:00.000Z',
	status: 'running',
	stats: {
		sent: 150,
		opened: 75,
		clicked: 30,
		replied: 10,
	},
};

export const createCampaignResponse = {
	_id: 'cam_new123abc456',
	name: 'New Test Campaign',
	labels: [],
	createdAt: '2024-03-01T12:00:00.000Z',
	updatedAt: '2024-03-01T12:00:00.000Z',
	status: 'draft',
};

export const getCampaignStatsResponse = {
	campaignId: 'cam_abc123def456',
	sent: 150,
	delivered: 145,
	opened: 75,
	clicked: 30,
	replied: 10,
	bounced: 5,
	unsubscribed: 2,
	interested: 8,
	notInterested: 3,
};

export const getLeadResponse = {
	_id: 'lea_abc123def456',
	campaignId: 'cam_abc123def456',
	campaignName: 'Test Campaign 1',
	email: 'john.doe@example.com',
	firstName: 'John',
	lastName: 'Doe',
	companyName: 'Acme Corp',
	linkedinUrl: 'https://linkedin.com/in/johndoe',
	isPaused: false,
	createdAt: '2024-01-16T09:00:00.000Z',
};

export const createLeadResponse = {
	_id: 'lea_new123abc456',
	campaignId: 'cam_abc123def456',
	campaignName: 'Test Campaign 1',
	email: 'jane.smith@example.com',
	firstName: 'Jane',
	lastName: 'Smith',
	isPaused: false,
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getLeadsResponse = [
	{
		_id: 'lea_abc123def456',
		email: 'john.doe@example.com',
		firstName: 'John',
		lastName: 'Doe',
	},
	{
		_id: 'lea_xyz789ghi012',
		email: 'jane.smith@example.com',
		firstName: 'Jane',
		lastName: 'Smith',
	},
];

export const getTeamResponse = {
	_id: 'team_abc123',
	name: 'Test Team',
	plan: 'pro',
	createdAt: '2023-01-01T00:00:00.000Z',
};

export const getTeamCreditsResponse = {
	emailCredits: 1500,
	enrichmentCredits: 500,
	phoneCredits: 200,
};

export const getTeamSendersResponse = [
	{
		_id: 'sender_abc123',
		email: 'sender@example.com',
		name: 'John Sender',
		campaigns: ['cam_abc123def456'],
	},
];

export const getActivitiesResponse = [
	{
		_id: 'act_abc123',
		type: 'emailsSent',
		campaignId: 'cam_abc123def456',
		leadId: 'lea_abc123def456',
		createdAt: '2024-01-17T10:00:00.000Z',
	},
	{
		_id: 'act_xyz789',
		type: 'emailsOpened',
		campaignId: 'cam_abc123def456',
		leadId: 'lea_abc123def456',
		createdAt: '2024-01-17T11:30:00.000Z',
	},
];

export const getUnsubscribesResponse = [
	{
		email: 'unsubscribed@example.com',
		createdAt: '2024-02-01T15:00:00.000Z',
	},
];

export const addUnsubscribeResponse = {
	email: 'newunsub@example.com',
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getEnrichmentResponse = {
	_id: 'enr_abc123',
	status: 'completed',
	email: 'john.doe@example.com',
	firstName: 'John',
	lastName: 'Doe',
	linkedinUrl: 'https://linkedin.com/in/johndoe',
	phone: '+1234567890',
	createdAt: '2024-01-20T10:00:00.000Z',
};

export const enrichPersonResponse = {
	_id: 'enr_new123',
	status: 'pending',
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getInboxResponse = [
	{
		_id: 'inbox_abc123',
		contactId: 'contact_abc123',
		lastMessage: 'Hello, how are you?',
		createdAt: '2024-02-15T09:00:00.000Z',
	},
];

export const sendEmailResponse = {
	_id: 'msg_abc123',
	status: 'sent',
	to: 'recipient@example.com',
	subject: 'Test Email',
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getTasksResponse = [
	{
		_id: 'task_abc123',
		type: 'manual',
		entityId: 'lea_abc123def456',
		title: 'Follow up call',
		status: 'pending',
		dueDate: '2024-03-05T10:00:00.000Z',
	},
];

export const createTaskResponse = {
	_id: 'task_new123',
	type: 'manual',
	entityId: 'lea_abc123def456',
	title: 'New Task',
	status: 'pending',
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getCompaniesResponse = [
	{
		_id: 'comp_abc123',
		name: 'Acme Corp',
		domain: 'acme.com',
		createdAt: '2024-01-10T08:00:00.000Z',
	},
];

export const getContactsResponse = [
	{
		_id: 'contact_abc123',
		email: 'contact@example.com',
		firstName: 'Contact',
		lastName: 'Person',
	},
];

export const getWebhooksResponse = [
	{
		_id: 'hook_abc123',
		targetUrl: 'https://example.com/webhook',
		type: 'emailsSent',
		isFirst: false,
	},
];

export const createWebhookResponse = {
	_id: 'hook_new123',
	targetUrl: 'https://example.com/webhook',
	type: 'emailsOpened',
	createdAt: '2024-03-01T12:00:00.000Z',
};

export const getSchedulesResponse = [
	{
		_id: 'sched_abc123',
		name: 'Business Hours',
		timezone: 'Europe/Paris',
		monday: { start: '09:00', end: '18:00' },
		tuesday: { start: '09:00', end: '18:00' },
		wednesday: { start: '09:00', end: '18:00' },
		thursday: { start: '09:00', end: '18:00' },
		friday: { start: '09:00', end: '17:00' },
	},
];

export const getSequencesResponse = [
	{
		_id: 'seq_abc123',
		campaignId: 'cam_abc123def456',
		steps: [
			{
				_id: 'step_001',
				type: 'email',
				delayDays: 0,
			},
			{
				_id: 'step_002',
				type: 'email',
				delayDays: 3,
			},
		],
	},
];

export const getPeopleSchemaResponse = {
	fields: [
		{ name: 'firstName', type: 'string' },
		{ name: 'lastName', type: 'string' },
		{ name: 'email', type: 'string' },
		{ name: 'company', type: 'string' },
		{ name: 'jobTitle', type: 'string' },
	],
};

export const searchPeopleResponse = {
	results: [
		{
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			company: 'Acme Corp',
		},
	],
	total: 1,
};
