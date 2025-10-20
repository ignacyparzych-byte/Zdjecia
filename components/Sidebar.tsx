import React, { useState, useMemo, useEffect } from 'react';
import { type Project } from '../types';
import { FolderIcon, PlusIcon, ChevronRightIcon, MapPinIcon, SearchIcon } from './Icons';

interface SidebarProps {
  projects: Project[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  photoCounts: { [key: string]: number };
  onAddSubfolder: (name: string, parentId: string) => void;
  onAddNewProject: (name: string) => void;
  onEditGeofence: (project: Project) => void;
  onDateFilterApply: (start: string | null, end: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const baseClasses = "flex group items-center w-full text-left px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150";
const activeClasses = "bg-green-500/20 text-green-300";
const inactiveClasses = "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200";

const getButtonClass = (isActive: boolean) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

const renderCount = (count: number | undefined) => (
  <span className="ml-auto text-xs font-mono bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
      {count || 0}
  </span>
);

const NewItemInput: React.FC<{ onAdd: (name: string) => void, onCancel: () => void, level?: number }> = ({ onAdd, onCancel, level = 0 }) => {
    const [name, setName] = useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleAdd = () => {
        if (name.trim()) {
            onAdd(name.trim());
        }
    };
    
    return (
        <div style={{ paddingLeft: `${0.5 + level * 1}rem` }} className="py-1">
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={onCancel}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') onCancel();
                }}
                placeholder="New item name..."
                className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm focus:ring-1 focus:ring-green-500"
            />
        </div>
    );
};


interface ProjectItemProps extends Omit<SidebarProps, 'projects' | 'onAddNewProject' | 'onDateFilterApply' | 'isOpen' | 'onClose'> {
  project: Project;
  allProjects: Project[];
  level: number;
  visibleProjectIds: Set<string>;
}

const ProjectItem: React.FC<ProjectItemProps> = ({ project, allProjects, activeFilter, onFilterChange, photoCounts, onAddSubfolder, onEditGeofence, level, visibleProjectIds }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingSubfolder, setIsAddingSubfolder] = useState(false);
    
    const childProjects = useMemo(() => 
        allProjects.filter(p => p.parentId === project.id && visibleProjectIds.has(p.id)), 
        [allProjects, project.id, visibleProjectIds]
    );

    const isActive = activeFilter === project.id;

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAddingSubfolder(true);
        setIsExpanded(true);
    }
    
    const handleGeofenceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditGeofence(project);
    }

    return (
        <div>
            <div className={getButtonClass(isActive)} style={{ paddingLeft: `${0.5 + level * 1}rem` }}>
                <button onClick={() => setIsExpanded(!isExpanded)} className={`mr-1 p-0.5 rounded-sm hover:bg-gray-600 ${childProjects.length === 0 ? 'opacity-0 cursor-default' : ''}`}>
                    <ChevronRightIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                <button className="flex-grow flex items-center text-left truncate" onClick={() => onFilterChange(project.id)}>
                    <FolderIcon className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{project.name}</span>
                </button>
                {renderCount(photoCounts[project.id])}
                <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100">
                    <button onClick={handleGeofenceClick} className="p-1 rounded-md hover:bg-blue-500/30 text-blue-400" title="Edit Geofence">
                        <MapPinIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleAddClick} className="p-1 rounded-md hover:bg-green-500/30 text-green-400" title="Add Subfolder">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-1">
                    {childProjects.map(child => (
                        <ProjectItem
                            key={child.id}
                            project={child}
                            allProjects={allProjects}
                            activeFilter={activeFilter}
                            onFilterChange={onFilterChange}
                            photoCounts={photoCounts}
                            onAddSubfolder={onAddSubfolder}
                            onEditGeofence={onEditGeofence}
                            level={level + 1}
                            visibleProjectIds={visibleProjectIds}
                        />
                    ))}
                    {isAddingSubfolder && (
                        <NewItemInput 
                            level={level + 1}
                            onAdd={(name) => {
                                onAddSubfolder(name, project.id);
                                setIsAddingSubfolder(false);
                            }}
                            onCancel={() => setIsAddingSubfolder(false)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

const DateFilter: React.FC<{ onApply: (start: string | null, end: string | null) => void }> = ({ onApply }) => {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    const handleApply = () => {
        onApply(start || null, end || null);
    };

    const handleClear = () => {
        setStart('');
        setEnd('');
        onApply(null, null);
    };

    return (
        <div className="px-2 py-3 border-t border-b border-gray-700 my-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by Date</h3>
            <div className="space-y-2 text-sm">
                <div>
                    <label htmlFor="start-date" className="text-gray-400">From</label>
                    <input type="date" id="start-date" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm mt-1"/>
                </div>
                <div>
                    <label htmlFor="end-date" className="text-gray-400">To</label>
                    <input type="date" id="end-date" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm mt-1"/>
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={handleApply} className="flex-1 px-2 py-1 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white">Apply</button>
                    <button onClick={handleClear} className="flex-1 px-2 py-1 text-xs rounded-md text-gray-300 hover:bg-gray-600">Clear</button>
                </div>
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { projects, activeFilter, onFilterChange, photoCounts, onAddNewProject, onDateFilterApply, isOpen, onClose } = props;
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const visibleProjectIds = useMemo(() => {
    if (!projectSearchQuery.trim()) {
        return new Set(projects.map(p => p.id));
    }

    const lowercasedQuery = projectSearchQuery.toLowerCase();
    const visibleIds = new Set<string>();

    // First pass: find direct matches
    for (const project of projects) {
        const nameMatch = project.name.toLowerCase().includes(lowercasedQuery);
        const descMatch = project.description && project.description.toLowerCase().includes(lowercasedQuery);
        if (nameMatch || descMatch) {
            visibleIds.add(project.id);
        }
    }

    // Second pass: add all ancestors of visible projects
    const idsToAddAncestorsFor = [...visibleIds];
    for (const id of idsToAddAncestorsFor) {
        let current = projectMap.get(id);
        while (current && current.parentId) {
            visibleIds.add(current.parentId);
            current = projectMap.get(current.parentId);
        }
    }

    return visibleIds;

  }, [projects, projectSearchQuery, projectMap]);
  
  const topLevelProjects = useMemo(() => 
    projects.filter(p => !p.parentId && visibleProjectIds.has(p.id)), 
    [projects, visibleProjectIds]
  );

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside className={`
        w-64 flex-shrink-0 bg-gray-800/80 backdrop-blur-sm p-4 border-r border-gray-700 h-screen overflow-y-auto
        fixed inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        lg:sticky lg:top-0 lg:left-auto lg:z-auto lg:transform-none lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="flex flex-col gap-2">
          <div>
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Library</h3>
            <button onClick={() => onFilterChange('all')} className={getButtonClass(activeFilter === 'all')}>
              All Photos
              {renderCount(photoCounts.all)}
            </button>
            <button onClick={() => onFilterChange('unassigned')} className={getButtonClass(activeFilter === 'unassigned')}>
              Unassigned
              {renderCount(photoCounts.unassigned)}
            </button>
          </div>
          
          <DateFilter onApply={onDateFilterApply} />

          <div>
            <div className="flex justify-between items-center px-2 mt-2 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</h3>
              <button 
                onClick={() => setIsAddingProject(true)} 
                className="p-1 rounded-md text-green-400 hover:bg-green-500/20" 
                title="Add new project"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="relative px-2 mb-2">
              <input 
                  type="text"
                  placeholder="Filter projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md pl-8 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-green-500"
              />
              <SearchIcon className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2"/>
            </div>
            <div className="flex flex-col gap-1">
              {topLevelProjects.map(project => (
                <ProjectItem 
                  key={project.id} 
                  project={project}
                  allProjects={projects}
                  level={0}
                  visibleProjectIds={visibleProjectIds}
                  {...props}
                />
              ))}
              {isAddingProject && (
                  <NewItemInput
                      onAdd={(name) => {
                          onAddNewProject(name);
                          setIsAddingProject(false);
                      }}
                      onCancel={() => setIsAddingProject(false)}
                  />
              )}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;