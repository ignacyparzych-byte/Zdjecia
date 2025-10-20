import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import PhotoUpload from './components/PhotoUpload';
import PhotoGrid from './components/PhotoGrid';
import PhotoModal from './components/PhotoModal';
import Sidebar from './components/Sidebar';
import ProjectSelector from './components/ProjectSelector';
import GeofenceEditorModal from './components/GeofenceEditorModal';
import { Photo, Project, Geofence } from './types';
import { generatePhotoDescription, generateProjectDescription } from './services/geminiService';
import { getCurrentPosition } from './services/geolocationService';
import { SparklesIcon, PencilIcon } from './components/Icons';
import PhotoSearchBar from './components/PhotoSearchBar';

// Check if a point is within a geofence (circle or polygon)
const isLocationInGeofence = (
    photoLocation: { lat: number, lng: number },
    geofence: Geofence
): boolean => {
    if (geofence.type === 'circle') {
        // Haversine distance formula for circles
        const R = 6371e3; // metres
        const φ1 = photoLocation.lat * Math.PI / 180;
        const φ2 = geofence.center.lat * Math.PI / 180;
        const Δφ = (geofence.center.lat - photoLocation.lat) * Math.PI / 180;
        const Δλ = (geofence.center.lng - photoLocation.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c;
        return distance <= geofence.radius;
    }

    if (geofence.type === 'polygon') {
        // Ray casting algorithm for polygons
        const { points } = geofence;
        const x = photoLocation.lng;
        const y = photoLocation.lat;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].lng;
            const yi = points[i].lat;
            const xj = points[j].lng;
            const yj = points[j].lat;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    return false;
}


const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unassigned', or project ID
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isGeneratingProjectDesc, setIsGeneratingProjectDesc] = useState(false);
  const [editingGeofenceForProject, setEditingGeofenceForProject] = useState<Project | null>(null);
  const [dateFilter, setDateFilter] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [isEditingProjectDesc, setIsEditingProjectDesc] = useState(false);
  const [editedProjectDesc, setEditedProjectDesc] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsEditingProjectDesc(false);
  }, [activeFilter]);


  const handleFilesAdded = useCallback(async (files: File[], projectId: string | null, fromCamera: boolean) => {
    setIsLoading(true);

    let location: { lat: number, lng: number } | undefined = undefined;
    if (fromCamera) {
        try {
            const position = await getCurrentPosition();
            location = { lat: position.coords.latitude, lng: position.coords.longitude };
        } catch (error) {
            console.warn("Could not get user location:", error);
        }
    }

    const newPhotos: Photo[] = files.map(file => {
      let assignedProjectId = projectId;

      // Auto-assignment logic
      if (location && assignedProjectId === null) {
          for (const project of projects) {
              if (project.geofence && isLocationInGeofence(location, project.geofence)) {
                  assignedProjectId = project.id;
                  break; // Assign to the first matching geofence
              }
          }
      }

      return {
        id: uuidv4(),
        url: URL.createObjectURL(file),
        file: file,
        name: file.name,
        size: file.size,
        description: null,
        projectId: assignedProjectId,
        location: location,
        createdAt: new Date().toISOString(),
        takenAt: new Date(file.lastModified).toISOString(),
      }
    });

    setPhotos(p => [...newPhotos, ...p]);
    setIsLoading(false);
  }, [projects]);

  const handleDeletePhoto = (photoId: string) => {
    const photoToDelete = photos.find(p => p.id === photoId);
    if (photoToDelete) {
      URL.revokeObjectURL(photoToDelete.url);
    }

    setPhotos(photos.filter(p => p.id !== photoId));
    setSelectedPhotoIds(ids => ids.filter(id => id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedPhotoIds.length} photos?`)) {
      photos.forEach(p => {
        if (selectedPhotoIds.includes(p.id)) {
          URL.revokeObjectURL(p.url);
        }
      });
      setPhotos(photos.filter(p => !selectedPhotoIds.includes(p.id)));
      setSelectedPhotoIds([]);
    }
  };

  const handleUpdatePhotoDescription = (photoId: string, description: string) => {
    setPhotos(photos.map(p => p.id === photoId ? { ...p, description } : p));
    setSelectedPhoto(p => p && p.id === photoId ? { ...p, description } : p);
  };

  const handleGenerateSinglePhotoDescription = async (photoId: string) => {
    const photoToDescribe = photos.find(p => p.id === photoId);
    if (!photoToDescribe) return;

    setIsLoadingDescription(true);
    try {
        const description = await generatePhotoDescription(photoToDescribe.file);
        handleUpdatePhotoDescription(photoId, description);
    } catch (error) {
        console.error("Failed to generate description:", error);
        handleUpdatePhotoDescription(photoId, "Error: Could not generate description.");
    } finally {
        setIsLoadingDescription(false);
    }
  };

  const handleUpdateProjectDescription = (projectId: string, description: string) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, description } : p));
    setIsEditingProjectDesc(false);
  };

  const handleSelectPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setSelectedPhotoIds([]); // Clear selection on filter change
  };

  const handleToggleSelection = (photoId: string) => {
    setSelectedPhotoIds(ids =>
      ids.includes(photoId) ? ids.filter(id => id !== photoId) : [...ids, photoId]
    );
  };

  const handleAddProject = (name: string, parentId: string | null = null) => {
    if (name.trim() === '') return;
    const newProject: Project = { id: uuidv4(), name: name.trim(), description: null, parentId };
    setProjects(p => [...p, newProject]);
  };

  const handleAddNewTopLevelProject = (name: string) => {
    if (name) {
      handleAddProject(name, null);
    }
  };

  const handleAddSubfolder = (name: string, parentId: string) => {
    if (name) {
      handleAddProject(name, parentId);
    }
  };

  const handleAssignToProject = (projectId: string) => {
    setPhotos(photos.map(p => selectedPhotoIds.includes(p.id) ? { ...p, projectId } : p));
    setSelectedPhotoIds([]);
    setIsProjectSelectorOpen(false);
  };

  const handleCreateAndAssignProject = (name: string, parentId: string | null) => {
    if (name.trim() === '') {
      setIsProjectSelectorOpen(false);
      return;
    }

    const newProject: Project = {
      id: uuidv4(),
      name: name.trim(),
      description: null,
      parentId
    };

    setProjects(prevProjects => [...prevProjects, newProject]);
    setPhotos(prevPhotos =>
      prevPhotos.map(p =>
        selectedPhotoIds.includes(p.id) ? { ...p, projectId: newProject.id } : p
      )
    );

    setSelectedPhotoIds([]);
    setIsProjectSelectorOpen(false);
  };

  const handleGenerateProjectDescription = async () => {
    if (activeFilter === 'all' || activeFilter === 'unassigned') return;
    const project = projects.find(p => p.id === activeFilter);
    if (!project) return;

    const projectPhotos = photos.filter(p => p.projectId === activeFilter);
    if (projectPhotos.length === 0) {
      alert("This project has no photos to generate a description from.");
      return;
    }

    setIsGeneratingProjectDesc(true);
    const files = projectPhotos.map(p => p.file);
    const description = await generateProjectDescription(files);
    setProjects(projects.map(p => p.id === activeFilter ? { ...p, description } : p));
    setIsGeneratingProjectDesc(false);
  };

  const handleUpdateProjectGeofence = (projectId: string, geofence: Geofence | null) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, geofence: geofence || undefined } : p));
    setEditingGeofenceForProject(null);
  };

  const handleDateFilterApply = (start: string | null, end: string | null) => {
    setDateFilter({ start, end });
  };

  const filteredPhotos = useMemo(() => {
    let projectFiltered = photos;

    if (activeFilter === 'all') {
        projectFiltered = photos;
    } else if (activeFilter === 'unassigned') {
        projectFiltered = photos.filter(p => p.projectId === null);
    } else {
        const getChildProjectIds = (projectId: string): string[] => {
            let children = projects.filter(p => p.parentId === projectId);
            let childIds = children.map(c => c.id);
            children.forEach(c => {
                childIds = [...childIds, ...getChildProjectIds(c.id)];
            });
            return childIds;
        };

        const projectIdsToFilter = [activeFilter, ...getChildProjectIds(activeFilter)];
        projectFiltered = photos.filter(p => p.projectId && projectIdsToFilter.includes(p.projectId));
    }

    let dateFiltered = projectFiltered;
    if (dateFilter.start || dateFilter.end) {
        dateFiltered = projectFiltered.filter(photo => {
            const takenDate = new Date(photo.takenAt);
            if (isNaN(takenDate.getTime())) return false; // Invalid date

            let startMatch = true;
            if (dateFilter.start) {
                const startDate = new Date(dateFilter.start);
                startDate.setHours(0, 0, 0, 0); // Start of the day
                startMatch = takenDate >= startDate;
            }

            let endMatch = true;
            if (dateFilter.end) {
                const endDate = new Date(dateFilter.end);
                endDate.setHours(23, 59, 59, 999); // End of the day
                endMatch = takenDate <= endDate;
            }

            return startMatch && endMatch;
        });
    }
    
    if (photoSearchQuery.trim() === '') {
        return dateFiltered;
    }

    const lowercasedQuery = photoSearchQuery.toLowerCase();
    return dateFiltered.filter(photo =>
        (photo.name.toLowerCase().includes(lowercasedQuery)) ||
        (photo.description && photo.description.toLowerCase().includes(lowercasedQuery))
    );

  }, [photos, projects, activeFilter, dateFilter, photoSearchQuery]);

  const photoCounts = useMemo(() => {
    const counts: { [key: string]: number } = {
      all: photos.length,
      unassigned: photos.filter(p => p.projectId === null).length,
    };

    projects.forEach(project => {
      counts[project.id] = photos.filter(p => p.projectId === project.id).length;
    });

    return counts;
  }, [photos, projects]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeFilter), [projects, activeFilter]);

  const clearSelection = () => setSelectedPhotoIds([]);

  const activeProjectIdForUpload = useMemo(() => {
    return (activeFilter !== 'all' && activeFilter !== 'unassigned') ? activeFilter : null;
  }, [activeFilter]);

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex">
        <Sidebar
            projects={projects}
            activeFilter={activeFilter}
            onFilterChange={(filter) => {
                handleFilterChange(filter);
                setIsSidebarOpen(false); // Close sidebar on mobile after selection
            }}
            photoCounts={photoCounts}
            onAddSubfolder={handleAddSubfolder}
            onAddNewProject={handleAddNewTopLevelProject}
            onEditGeofence={(project) => setEditingGeofenceForProject(project)}
            onDateFilterApply={handleDateFilterApply}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <PhotoUpload
                      onUpload={handleFilesAdded}
                      isLoading={isLoading}
                      projects={projects}
                      activeProjectId={activeProjectIdForUpload}
                    />
                </div>

                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-white">
                          {activeFilter === 'all' && 'All Photos'}
                          {activeFilter === 'unassigned' && 'Unassigned Photos'}
                          {activeProject && `${activeProject.name}`}
                        </h2>
                        
                        {isEditingProjectDesc && activeProject ? (
                            <div className="mt-2 w-full max-w-lg">
                                <textarea
                                    value={editedProjectDesc}
                                    onChange={(e) => setEditedProjectDesc(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-2 focus:ring-green-500"
                                    rows={3}
                                    placeholder="Write a description for this project..."
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={() => setIsEditingProjectDesc(false)} className="px-3 py-1 text-xs rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
                                    <button onClick={() => handleUpdateProjectDescription(activeProject.id, editedProjectDesc)} className="px-3 py-1 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white">Save Description</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-gray-400">
                                    {activeProject?.description || (filteredPhotos.length > 0 ? `${filteredPhotos.length} photos in this view` : 'No photos in this view.')}
                                </p>
                                {activeProject && (
                                    <button 
                                        onClick={() => {
                                            setEditedProjectDesc(activeProject.description || '');
                                            setIsEditingProjectDesc(true);
                                        }} 
                                        className="text-gray-500 hover:text-green-400 p-1 rounded-full hover:bg-gray-700 transition-colors"
                                        title="Edit project description"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {activeProject && (
                      <button
                        onClick={handleGenerateProjectDescription}
                        disabled={isGeneratingProjectDesc || filteredPhotos.length === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                          <SparklesIcon className={`w-5 h-5 ${isGeneratingProjectDesc ? 'animate-spin' : ''}`} />
                          {isGeneratingProjectDesc ? 'Generating...' : 'Generate Project Description'}
                      </button>
                    )}
                </div>
                
                <PhotoSearchBar query={photoSearchQuery} onQueryChange={setPhotoSearchQuery} />


                {selectedPhotoIds.length > 0 && (
                  <div className="bg-gray-800/80 rounded-lg p-3 my-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 backdrop-blur-sm sticky top-24 z-10 border border-gray-700">
                    <p className="text-sm font-medium">{selectedPhotoIds.length} photos selected</p>
                    <div className="flex items-center gap-2 flex-wrap justify-end self-end sm:self-center">
                      <button onClick={clearSelection} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-md hover:bg-gray-700/50">Clear</button>
                      <button onClick={() => setIsProjectSelectorOpen(true)} className="px-3 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white">Assign to Project</button>
                      <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white">Delete</button>
                    </div>
                  </div>
                )}

                <PhotoGrid
                  photos={filteredPhotos}
                  onSelect={handleSelectPhoto}
                  onDelete={handleDeletePhoto}
                  selectedPhotoIds={selectedPhotoIds}
                  onToggleSelection={handleToggleSelection}
                />
            </div>
        </main>
      </div>
      <PhotoModal
        photo={selectedPhoto}
        onClose={handleCloseModal}
        onDelete={handleDeletePhoto}
        onUpdateDescription={handleUpdatePhotoDescription}
        onGenerateDescription={handleGenerateSinglePhotoDescription}
        isLoadingDescription={isLoadingDescription}
      />
      <ProjectSelector
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        projects={projects}
        onAssign={handleAssignToProject}
        onCreateAndAssign={handleCreateAndAssignProject}
      />
      {editingGeofenceForProject && (
        <GeofenceEditorModal
          project={editingGeofenceForProject}
          onClose={() => setEditingGeofenceForProject(null)}
          onSave={handleUpdateProjectGeofence}
        />
      )}
    </div>
  );
};

export default App;