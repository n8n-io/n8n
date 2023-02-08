import type { Project } from './interfaces/project';

export type IProject = Partial<Omit<Project, 'id' | 'user_id' | 'entity_type'>>;
