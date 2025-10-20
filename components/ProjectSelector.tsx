import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { CloseIcon, PlusIcon, FolderIcon } from './Icons';

interface ProjectSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onAssign: (projectId: string) => void;
  onCreateAndAssign: (name: string, parentId: string | null) => void;
}

interface ProjectOptionProps {
  project: Project;
  level: number;
  onSelect: (id: string) => void;
  allProjects: Project[];
  onInitiateAddSubfolder: (parentId: string) => void;
}

const ProjectOption: React.FC<ProjectOptionProps> = ({ project, level, onSelect, allProjects, onInitiateAddSubfolder }) => {
  const childProjects = useMemo(() => allProjects.filter(p => p.parentId === project.id), [allProjects, project.id]);
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInitiateAddSubfolder(project.id);
  };

  return (
    <>
      <div
        onClick={() => onSelect(project.id)}
        className="flex group items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer"
        style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}
      >
        <FolderIcon className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
        <span className="flex-grow truncate">{project.name}</span>
        <button 
            onClick={handleAddClick} 
            className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-green-500/30 text-green-400"
            title={`Add subfolder to ${project.name}`}
        >
            <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      {childProjects.map(child => (
        <ProjectOption 
          key={child.id} 
          project={child} 
          level={level + 1} 
          onSelect={onSelect} 
          allProjects={allProjects} 
          onInitiateAddSubfolder={onInitiateAddSubfolder} 
        />
      ))}
    </>
  );
};


const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  isOpen,
  onClose,
  projects,
  onAssign,
  onCreateAndAssign,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [parentForNewProject, setParentForNewProject] = useState<string | null>(null);

  if (!isOpen) return null;
    
  const topLevelProjects = useMemo(() => projects.filter(p => !p.parentId), [projects]);
  const parentProject = useMemo(() => projects.find(p => p.id === parentForNewProject), [projects, parentForNewProject]);

  const handleAddNewProject = () => {
    if (newProjectName.trim()) {
      onCreateAndAssign(newProjectName.trim(), parentForNewProject);
    }
    // Reset state regardless
    setNewProjectName('');
    setIsAddingProject(false);
    setParentForNewProject(null);
  };

  const handleSelect = (projectId: string) => {
    onAssign(projectId);
  }

  const handleInitiateAddSubfolder = (parentId: string | null) => {
    setIsAddingProject(true);
    setParentForNewProject(parentId);
  };

  const handleCancelAdd = () => {
    setIsAddingProject(false);
    setNewProjectName('');
    setParentForNewProject(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Assign to Project</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {topLevelProjects.map(project => (
            <ProjectOption 
              key={project.id} 
              project={project} 
              level={0} 
              onSelect={handleSelect} 
              allProjects={projects} 
              onInitiateAddSubfolder={handleInitiateAddSubfolder}
            />
          ))}
          {projects.length === 0 && !isAddingProject && <p className="text-gray-400 text-center py-4">No projects yet. Create one below.</p>}
        </div>

        <div className="p-4 border-t border-gray-700 mt-auto">
          {isAddingProject ? (
             <div>
                {parentProject && (
                    <p className="text-sm text-gray-400 mb-2">
                        Adding subfolder to: <span className="font-semibold text-gray-200">{parentProject.name}</span>
                    </p>
                )}
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={parentForNewProject ? "New subfolder name" : "New project name"}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-green-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewProject()}
                />
                <div className="flex gap-2 mt-2 justify-end">
                    <button onClick={handleCancelAdd} className="px-3 py-1 text-sm rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
                    <button onClick={handleAddNewProject} className="px-3 py-1 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white">Create &amp; Assign</button>
                </div>
            </div>
          ) : (
            <button
              onClick={() => handleInitiateAddSubfolder(null)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-green-300 hover:bg-green-500/20 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;