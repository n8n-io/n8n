import { Task } from "./interfaces/task";

export interface ITask extends Partial<Omit<Task, 'id'>> {
	
}
