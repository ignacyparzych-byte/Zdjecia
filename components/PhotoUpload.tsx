import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon, CameraIcon } from './Icons';
import { Project } from '../types';

interface PhotoUploadProps {
  onUpload: (files: File[], projectId: string | null, fromCamera: boolean) => void;
  isLoading: boolean;
  projects: Project[];
  activeProjectId: string | null;
}

interface ProjectOptionProps {
    project: Project;
    allProjects: Project[];
    level: number;
}
  
const ProjectOption: React.FC<ProjectOptionProps> = ({ project, allProjects, level }) => {
    const childProjects = useMemo(() => allProjects.filter(p => p.parentId === project.id), [allProjects, project.id]);
    const indent = '\u00A0\u00A0'.repeat(level);
  
    return (
      <>
        <option value={project.id}>{indent}{project.name}</option>
        {childProjects.map(child => (
          <ProjectOption key={child.id} project={child} allProjects={allProjects} level={level + 1} />
        ))}
      </>
    );
};

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUpload, isLoading, projects, activeProjectId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedProjectId(activeProjectId);
  }, [activeProjectId]);

  const topLevelProjects = useMemo(() => projects.filter(p => !p.parentId), [projects]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles, selectedProjectId, false);
    }
  }, [onUpload, selectedProjectId]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp'],
    },
    disabled: isLoading,
    noClick: true,
  });

  const handleTakePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        onUpload(Array.from(event.target.files), selectedProjectId, true)
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div>
            <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-1">Assign to Project (Optional)</label>
            <select
                id="project-select"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-green-500"
            >
                <option value="">Assign later (Unassigned)</option>
                {topLevelProjects.map(p => <ProjectOption key={p.id} project={p} allProjects={projects} level={0} />)}
            </select>
        </div>
        <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${
                isDragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600'
            } ${isLoading ? 'opacity-60' : ''}`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <div className='flex-1 flex flex-col items-center text-gray-400'>
                    <UploadIcon className="w-10 h-10 mb-2" />
                    <p className="font-semibold">Drag &amp; drop photos here</p>
                    <p className="text-sm text-gray-500">or</p>
                    <button
                        type="button"
                        onClick={open}
                        disabled={isLoading}
                        className="mt-2 px-4 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                        Upload from Device
                    </button>
                </div>

                <div className="w-px bg-gray-600 self-stretch hidden md:block"></div>
                
                <div className='flex-1 flex flex-col items-center text-gray-400'>
                     <CameraIcon className="w-10 h-10 mb-2" />
                     <p className="font-semibold">Capture in the moment</p>
                     <p className="text-sm text-gray-500">&nbsp;</p>
                     <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isLoading}
                        className="mt-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                        Take a Photo
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={cameraInputRef}
                        onChange={handleTakePhoto}
                        className="hidden"
                        disabled={isLoading}
                    />
                </div>
            </div>
             {isLoading && (
                <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                        <p className="text-white text-lg font-semibold">Processing images...</p>
                        <p className="text-gray-300 text-sm">Generating descriptions with Gemini.</p>
                    </div>
                </div>
             )}
        </div>
    </div>
  );
};

export default PhotoUpload;