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
import { SparklesIcon, PencilIcon, SpinnerIcon } from './components/Icons';
import PhotoSearchBar from './components/PhotoSearchBar';
import * as dbService from './services/dbService';
import * as firebaseService from './services/firebaseService';

// Helper to fetch a placeholder image and convert it to a File object
const createSampleFile = async (url: string, name: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type });
};

// Function to seed the database with initial sample data
const seedInitialData = async () => {
    console.log("Seeding initial data...");
    // Projects
    const p1: Project = { id: uuidv4(), name: "Projekt Mostu 'Tęcza'", description: "Budowa nowoczesnego mostu drogowego nad rzeką Bystrzycą.", parentId: null };
    const p1_1: Project = { id: uuidv4(), name: "Faza 1: Wykopy i fundamenty", description: "Prace ziemne i przygotowanie podłoża.", parentId: p1.id };
    const p1_2: Project = { id: uuidv4(), name: "Faza 2: Konstrukcja nośna", description: "Montaż stalowej konstrukcji i pylonów.", parentId: p1.id };
    const p2: Project = { id: uuidv4(), name: "Rewitalizacja Parku Centralnego", description: "Odnawianie alejek, nasadzenia zieleni i budowa placu zabaw.", parentId: null };
    const p3: Project = { id: uuidv4(), name: "Budowa Osiedla 'Zielone Wzgórza'", description: "Kompleksowa budowa osiedla mieszkaniowego.", parentId: null };

    const sampleProjects = [p1, p1_1, p1_2, p2, p3];
    await Promise.all(sampleProjects.map(p => dbService.addProject(p)));

    // Photos
    const photoInfos = [
        { url: 'https://picsum.photos/seed/p1_1_a/800/600', name: 'wykop-pod-filar.jpg', projectId: p1_1.id, desc: "Szeroki wykop pod główny filar wschodni." },
        { url: 'https://picsum.photos/seed/p1_1_b/800/600', name: 'zbrojenie-fundamentu.jpg', projectId: p1_1.id, desc: "Prace zbrojeniowe przed wylaniem betonu." },
        { url: 'https://picsum.photos/seed/p1_2_a/800/600', name: 'montaz-przesla.jpg', projectId: p1_2.id, desc: "Dźwig podnoszący pierwszy element przęsła." },
        { url: 'https://picsum.photos/seed/p1_2_b/800/600', name: 'konstrukcja-stalowa.jpg', projectId: p1_2.id, desc: "Widok na zmontowaną część konstrukcji stalowej." },
        { url: 'https://picsum.photos/seed/p2_a/800/600', name: 'nowe-alejki.jpg', projectId: p2.id, desc: "Nowo ułożona kostka brukowa na głównej alei parkowej." },
        { url: 'https://picsum.photos/seed/p2_b/800/600', name: 'plac-zabaw.jpg', projectId: p2.id, desc: "Montaż huśtawek na nowym placu zabaw." },
        { url: 'https://picsum.photos/seed/p2_c/800/600', name: 'sadzenie-drzew.jpg', projectId: p2.id, desc: "Ekipa ogrodników sadząca młode dęby." },
        { url: 'https://picsum.photos/seed/p3_a/800/600', name: 'stan-surowy-blok-a.jpg', projectId: p3.id, desc: "Budynek A w stanie surowym otwartym." },
        { url: 'https://picsum.photos/seed/un_a/800/600', name: 'pomiar-geodezyjny.jpg', projectId: null, desc: "Geodeta wykonujący pomiary kontrolne terenu." },
        { url: 'https://picsum.photos/seed/un_b/800/600', name: 'dostawa-materialow.jpg', projectId: null, desc: "Ciężarówka z dostawą materiałów budowlanych na plac." },
    ];

    const samplePhotosPromises = photoInfos.map(async (info) => {
        const file = await createSampleFile(info.url, info.name);
        const photo: Photo = {
            id: uuidv4(),
            url: URL.createObjectURL(file),
            file: file,
            name: file.name,
            size: file.size,
            description: info.desc,
            projectId: info.projectId,
            createdAt: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 3).toISOString(), // random upload date in last 3 days
            takenAt: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 30).toISOString(), // random taken date in last 30 days
        };
        return photo;
    });

    const samplePhotos = await Promise.all(samplePhotosPromises);
    await Promise.all(samplePhotos.map(p => dbService.addPhoto(p)));
    
    console.log("Seeding complete.");
    return { sampleProjects, samplePhotos };
};


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

const pluralizePolish = (count: number, single: string, few: string, many: string): string => {
    if (count === 1) return single;
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
        return few;
    }
    return many;
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
  const [isDBLoading, setIsDBLoading] = useState(true);

  useEffect(() => {
    const loadDataFromDB = async () => {
        try {
            await dbService.initDB();
            let [dbProjects, dbPhotos] = await Promise.all([
                dbService.getProjects(),
                dbService.getPhotos(),
            ]);

            // Check if DB is empty and seed if necessary
            if (dbProjects.length === 0 && dbPhotos.length === 0) {
                const { sampleProjects, samplePhotos } = await seedInitialData();
                setProjects(sampleProjects);
                setPhotos(samplePhotos);
            } else {
                setProjects(dbProjects);
                setPhotos(dbPhotos);
            }
        } catch (error) {
            console.error("Failed to load data from IndexedDB", error);
            alert("Nie udało się załadować danych z lokalnej bazy danych. Proszę spróbować odświeżyć stronę.");
        } finally {
            setIsDBLoading(false);
        }
    };
    loadDataFromDB();
  }, []);

  useEffect(() => {
    const photoUrls = photos.map(p => p.url);
    // This effect's cleanup function will run for the *previous* `photos` array
    // before the effect runs for the *new* `photos` array. This is perfect
    // for revoking URLs of photos that were just removed from the state.
    // The final unmount will clean up the last set of URLs.
    return () => {
        photoUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photos]);


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
    
    // Add to state and DB immediately for UI responsiveness
    newPhotos.forEach(p => dbService.addPhoto(p));
    setPhotos(p => [...newPhotos, ...p]);
    setIsLoading(false);

    // Now, start uploading to Firebase in the background
    for (const newPhoto of newPhotos) {
        try {
            const { storagePath, downloadURL } = await firebaseService.uploadPhoto(newPhoto.file);
            // Upload successful, create the updated photo object
            const updatedPhoto = { ...newPhoto, storagePath, url: downloadURL };
            
            // Update in DB
            await dbService.updatePhoto(updatedPhoto);
            
            // Update in state, replacing the temporary local version
            setPhotos(currentPhotos => 
                currentPhotos.map(p => p.id === newPhoto.id ? updatedPhoto : p)
            );
        } catch (error) {
            console.error(`Failed to upload ${newPhoto.name} to Firebase:`, error);
            // Optionally, we could add an upload-failed status to the photo object
        }
    }
  }, [projects]);

  const handleDeletePhoto = async (photoId: string) => {
    const photoToDelete = photos.find(p => p.id === photoId);
    if (!photoToDelete) return;

    if (photoToDelete.storagePath) {
        try {
            await firebaseService.deletePhotoFromStorage(photoToDelete.storagePath);
        } catch (error) {
            console.error("Could not delete photo from Firebase, proceeding with local deletion.", error);
            alert("Nie udało się usunąć zdjęcia z chmury. Zostanie ono usunięte tylko lokalnie.");
        }
    }
    
    dbService.deletePhoto(photoId);
    setPhotos(photos.filter(p => p.id !== photoId));
    setSelectedPhotoIds(ids => ids.filter(id => id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const handleBulkDelete = () => {
    const count = selectedPhotoIds.length;
    const photoWord = pluralizePolish(count, 'zdjęcie', 'zdjęcia', 'zdjęć');
    if (window.confirm(`Czy na pewno chcesz usunąć ${count} ${photoWord}? Spowoduje to również usunięcie ich z chmury.`)) {
      const photosToDelete = photos.filter(p => selectedPhotoIds.includes(p.id));
      
      // Asynchronously delete from Firebase
      photosToDelete.forEach(async (photo) => {
        if (photo.storagePath) {
          try {
            await firebaseService.deletePhotoFromStorage(photo.storagePath);
          } catch (error) {
            console.error(`Failed to delete ${photo.name} from Firebase.`, error);
          }
        }
      });

      // Then delete locally
      selectedPhotoIds.forEach(id => dbService.deletePhoto(id));
      setPhotos(photos.filter(p => !selectedPhotoIds.includes(p.id)));
      setSelectedPhotoIds([]);
    }
  };

  const handleUpdatePhotoDescription = (photoId: string, description: string) => {
    const updatedPhotos = photos.map(p => p.id === photoId ? { ...p, description } : p)
    const updatedPhoto = updatedPhotos.find(p => p.id === photoId);
    if(updatedPhoto) {
        dbService.updatePhoto(updatedPhoto);
    }
    setPhotos(updatedPhotos);
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
        handleUpdatePhotoDescription(photoId, "Błąd: Nie udało się wygenerować opisu.");
    } finally {
        setIsLoadingDescription(false);
    }
  };

  const handleUpdateProjectDescription = (projectId: string, description: string) => {
    const updatedProjects = projects.map(p => p.id === projectId ? { ...p, description } : p);
    const updatedProject = updatedProjects.find(p => p.id === projectId);
    if (updatedProject) {
        dbService.updateProject(updatedProject);
    }
    setProjects(updatedProjects);
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
    dbService.addProject(newProject);
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
    const updatedPhotos = photos.map(p => selectedPhotoIds.includes(p.id) ? { ...p, projectId } : p);
    const photosToUpdate = updatedPhotos.filter(p => selectedPhotoIds.includes(p.id));
    photosToUpdate.forEach(p => dbService.updatePhoto(p));
    setPhotos(updatedPhotos);
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
    
    dbService.addProject(newProject);
    setProjects(prevProjects => [...prevProjects, newProject]);
    
    const updatedPhotos = photos.map(p =>
        selectedPhotoIds.includes(p.id) ? { ...p, projectId: newProject.id } : p
    );
    const photosToUpdate = updatedPhotos.filter(p => selectedPhotoIds.includes(p.id));
    photosToUpdate.forEach(p => dbService.updatePhoto(p));
    setPhotos(updatedPhotos);

    setSelectedPhotoIds([]);
    setIsProjectSelectorOpen(false);
  };

  const handleGenerateProjectDescription = async () => {
    if (activeFilter === 'all' || activeFilter === 'unassigned') return;
    const project = projects.find(p => p.id === activeFilter);
    if (!project) return;

    const projectPhotos = photos.filter(p => p.projectId === activeFilter);
    if (projectPhotos.length === 0) {
      alert("Ten projekt nie zawiera zdjęć, z których można wygenerować opis.");
      return;
    }

    setIsGeneratingProjectDesc(true);
    const files = projectPhotos.map(p => p.file);
    const description = await generateProjectDescription(files);
    const updatedProjects = projects.map(p => p.id === activeFilter ? { ...p, description } : p);
    const updatedProject = updatedProjects.find(p => p.id === activeFilter);
    if(updatedProject) {
        dbService.updateProject(updatedProject);
    }
    setProjects(updatedProjects);
    setIsGeneratingProjectDesc(false);
  };

  const handleUpdateProjectGeofence = (projectId: string, geofence: Geofence | null) => {
    const updatedProjects = projects.map(p => p.id === projectId ? { ...p, geofence: geofence || undefined } : p);
    const updatedProject = updatedProjects.find(p => p.id === projectId);
    if(updatedProject) {
        dbService.updateProject(updatedProject);
    }
    setProjects(updatedProjects);
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

  if (isDBLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <SpinnerIcon className="w-12 h-12 mb-4" />
            <span className="text-xl font-semibold">Wczytywanie danych...</span>
            <span className="text-gray-400 mt-1">Proszę czekać, inicjalizujemy Twoją lokalną bazę zdjęć.</span>
        </div>
    );
  }

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
                          {activeFilter === 'all' && 'Wszystkie zdjęcia'}
                          {activeFilter === 'unassigned' && 'Nieprzypisane zdjęcia'}
                          {activeProject && `${activeProject.name}`}
                        </h2>
                        
                        {isEditingProjectDesc && activeProject ? (
                            <div className="mt-2 w-full max-w-lg">
                                <textarea
                                    value={editedProjectDesc}
                                    onChange={(e) => setEditedProjectDesc(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-2 focus:ring-green-500"
                                    rows={3}
                                    placeholder="Napisz opis dla tego projektu..."
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={() => setIsEditingProjectDesc(false)} className="px-3 py-1 text-xs rounded-md text-gray-300 hover:bg-gray-700">Anuluj</button>
                                    <button onClick={() => handleUpdateProjectDescription(activeProject.id, editedProjectDesc)} className="px-3 py-1 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white">Zapisz opis</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-gray-400">
                                    {activeProject?.description || (filteredPhotos.length > 0 ? `${filteredPhotos.length} ${pluralizePolish(filteredPhotos.length, 'zdjęcie', 'zdjęcia', 'zdjęć')} w tym widoku` : 'Brak zdjęć w tym widoku.')}
                                </p>
                                {activeProject && (
                                    <button 
                                        onClick={() => {
                                            setEditedProjectDesc(activeProject.description || '');
                                            setIsEditingProjectDesc(true);
                                        }} 
                                        className="text-gray-500 hover:text-green-400 p-1 rounded-full hover:bg-gray-700 transition-colors"
                                        title="Edytuj opis projektu"
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
                          {isGeneratingProjectDesc ? 'Generowanie...' : 'Wygeneruj opis projektu'}
                      </button>
                    )}
                </div>
                
                <PhotoSearchBar query={photoSearchQuery} onQueryChange={setPhotoSearchQuery} />


                {selectedPhotoIds.length > 0 && (
                  <div className="bg-gray-800/80 rounded-lg p-3 my-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 backdrop-blur-sm sticky top-24 z-10 border border-gray-700">
                    <p className="text-sm font-medium">{selectedPhotoIds.length} ${pluralizePolish(selectedPhotoIds.length, 'zdjęcie', 'zdjęcia', 'zdjęć')} zaznaczone</p>
                    <div className="flex items-center gap-2 flex-wrap justify-end self-end sm:self-center">
                      <button onClick={clearSelection} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-md hover:bg-gray-700/50">Wyczyść</button>
                      <button onClick={() => setIsProjectSelectorOpen(true)} className="px-3 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white">Przypisz do projektu</button>
                      <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white">Usuń</button>
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