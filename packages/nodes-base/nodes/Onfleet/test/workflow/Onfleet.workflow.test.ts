import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const taskId = 'pH0qbEc4fWMEqzNhcTvuxmSL';
const workerId = 'h*wSb*apKlDkUFnuLTtjPke7';
const teamId = 'nz1nHRbdIIUxM7Tmd1mR8Rzq';
const adminId = '8AxaiKwMd~np7I*YP2NfukBE';
const hubId = 'tKxSfU7psqDQEBVn5e2VQ~*O';
const destinationId = 'zrVXZi5aDzOZlAghZaLfGAfA';
const recipientId = 'G7rcM2nqblmh8vj2do1FpaOQ';
const organizationId = 'yAM*fDkztrT3gUcz9mNDgNOL';

const task = { id: taskId, shortId: '8ab7c7f5', state: 0 };
const worker = { id: workerId, name: 'John Doe' };
const team = { id: teamId, name: 'Night shift' };
const admin = { id: adminId, name: 'Jane Doe' };
const hub = { id: hubId, name: 'Downtown' };
const recipient = { id: recipientId, name: 'Jane Doe', phone: '+14155550123' };

describe('Onfleet > Workflows', () => {
	const credentials = {
		onfleetApi: { apiKey: 'fake-api-key', signingSecret: 'fake-signing-secret' },
	};

	beforeAll(() => {
		const api = nock('https://onfleet.com/api/v2');

		api.get('/admins').reply(200, [admin, { id: 'Qn3D1Lm0aY4pWv8x~tR2uZ7k', name: 'Jim Roe' }]);
		api.post('/tasks/batch').reply(200, { tasks: [task, { ...task, id: 'second-task' }] });
		api.post('/tasks').reply(200, task);
		api.get(`/tasks/${taskId}`).reply(200, task);
		api.get('/tasks/shortId/8ab7c7f5').reply(200, task);
		api.post(`/tasks/${taskId}/clone`).reply(200, task);
		api.delete(`/tasks/${taskId}`).reply(200, {});
		api
			.get('/tasks/all')
			.query({ from: '1714521600000', to: '1714608000000' })
			.reply(200, { tasks: [task] });
		api.post(`/tasks/${taskId}/complete`).reply(200, {});
		api.put(`/tasks/${taskId}`).reply(200, task);

		api.post('/destinations').reply(200, { id: destinationId });
		api.get(`/destinations/${destinationId}`).reply(200, { id: destinationId });

		api.get('/organization').reply(200, { id: organizationId, name: 'Acme Corp' });
		api.get(`/organizations/${organizationId}`).reply(200, { id: organizationId });

		api.post('/recipients').reply(200, recipient);
		api.put(`/recipients/${recipientId}`).reply(200, recipient);
		api.get(`/recipients/${recipientId}`).reply(200, recipient);
		api.get('/recipients/phone/%2B14155550123').reply(200, recipient);

		api.post('/admins').reply(200, admin);
		api.put(`/admins/${adminId}`).reply(200, admin);
		api.delete(`/admins/${adminId}`).reply(200, {});

		api.get('/hubs').reply(200, [hub]);
		api.post('/hubs').reply(200, hub);
		api.put(`/hubs/${hubId}`).reply(200, hub);

		api.get('/workers').reply(200, [worker]);
		api
			.get('/workers/location')
			.query({ longitude: '-122.4', latitude: '37.7' })
			.reply(200, { workers: [worker] });
		api.get(`/workers/${workerId}`).reply(200, worker);
		api.post('/workers').reply(200, worker);
		api.put(`/workers/${workerId}`).reply(200, worker);
		api.delete(`/workers/${workerId}`).reply(200, {});
		api.get(`/workers/${workerId}/schedule`).reply(200, { entries: [] });
		api.post(`/workers/${workerId}/schedule`).reply(200, { entries: [] });

		api.get(`/containers/workers/${workerId}`).reply(200, { id: 'container-1', tasks: [taskId] });
		api.put(`/containers/teams/${teamId}`).reply(200, { id: 'container-2', tasks: [taskId] });
		api.put(`/containers/workers/${workerId}`).reply(200, { id: 'container-1', tasks: [taskId] });

		api.get('/teams').reply(200, [team]);
		api.get(`/teams/${teamId}`).reply(200, team);
		api.post('/teams').reply(200, team);
		api.put(`/teams/${teamId}`).reply(200, team);
		api.delete(`/teams/${teamId}`).reply(200, {});
		api
			.get(`/teams/${teamId}/estimate`)
			.query({ dropoffLocation: '-122.4,37.7' })
			.reply(200, { workerId, vehicle: 'CAR' });
		api.post(`/teams/${teamId}/dispatch`).reply(200, { id: 'dispatch-1' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
