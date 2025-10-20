import React, { useState, useEffect } from 'react';
import { type Photo } from '../types';
import { CloseIcon, SpinnerIcon, TrashIcon, PencilIcon, MapPinIcon, ClockIcon, SparklesIcon } from './Icons';

interface PhotoModalProps {
  photo: Photo | null;
  onClose: () => void;
  onDelete: (photoId: string) => void;
  onUpdateDescription: (photoId: string, description: string) => void;
  onGenerateDescription: (photoId: string) => void;
  isLoadingDescription: boolean;
}

const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  onClose,
  onDelete,
  onUpdateDescription,
  onGenerateDescription,
  isLoadingDescription,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');

  useEffect(() => {
    if (photo) {
      setEditedDesc(photo.description || '');
      setIsEditing(false);
    }
  }, [photo]);

  if (!photo) return null;

  const handleDelete = () => {
    onDelete(photo.id);
  };

  const handleSaveDescription = () => {
    onUpdateDescription(photo.id, editedDesc);
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex items-center justify-center bg-black p-2 md:p-4">
          <img
            src={photo.url}
            alt={photo.name}
            className="max-h-[50vh] md:max-h-[85vh] w-auto h-auto object-contain"
          />
        </div>

        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white pr-4 break-words">{photo.name}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="text-sm text-gray-400 mb-6 space-y-2 border-b border-gray-700 pb-4">
            <div>Size: {(photo.size / 1024 / 1024).toFixed(2)} MB</div>
            {photo.location && (
                <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                    <span>{photo.location.lat.toFixed(4)}, {photo.location.lng.toFixed(4)}</span>
                </div>
            )}
             <div className="flex items-start gap-2">
                <ClockIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                    <div>Taken: {formatDate(photo.takenAt)}</div>
                    <div>Uploaded: {formatDate(photo.createdAt)}</div>
                </div>
            </div>
          </div>

          <div className="flex-grow space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-200">Description</h4>
                {!isEditing && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onGenerateDescription(photo.id)}
                            disabled={isLoadingDescription}
                            className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate a new description with AI"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            {photo.description ? 'Regenerate' : 'Generate'}
                        </button>
                        <button 
                            onClick={() => setIsEditing(true)} 
                            disabled={isLoadingDescription}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Manually edit description"
                        >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                        </button>
                    </div>
                )}
            </div>
            {isLoadingDescription ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <SpinnerIcon className="w-5 h-5" />
                <span>Generating...</span>
              </div>
            ) : isEditing ? (
              <div>
                <textarea 
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    className="w-full h-36 bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Write a description..."
                />
                <div className="flex gap-2 mt-2 justify-end">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
                    <button onClick={handleSaveDescription} className="px-3 py-1 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed min-h-[4rem]">
                {photo.description || "No description. Generate one with AI or click 'Edit' to add one."}
              </p>
            )}
          </div>

           <div className="mt-6 flex-shrink-0">
             <button
                onClick={handleDelete}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-colors"
              >
               <TrashIcon className="w-5 h-5"/>
                Delete Photo
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;