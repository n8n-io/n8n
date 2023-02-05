import type { Task } from './interfaces/task';

export type ITask = Partial<Omit<Task, 'id' | 'user_id'>>;
