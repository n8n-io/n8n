import { Project } from "./interfaces/project";

export interface IProject extends Partial<Omit<Project, 'id'>> {
    
}
