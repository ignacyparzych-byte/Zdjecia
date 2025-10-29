import React from 'react';
import { type Photo } from '../types';
import { TrashIcon } from './Icons';

interface PhotoGridProps {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  onDelete: (photoId: string) => void;
  selectedPhotoIds: string[];
  onToggleSelection: (photoId: string) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onSelect, onDelete, selectedPhotoIds, onToggleSelection }) => {
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-gray-400">Twoja galeria jest pusta.</h2>
        <p className="mt-1 text-gray-500">Prześlij kilka zdjęć, aby rozpocząć!</p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation(); // Prevent modal from opening when deleting
    onDelete(photoId);
  };

  const handleToggle = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    onToggleSelection(photoId);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {photos.map((photo) => {
          const isSelected = selectedPhotoIds.includes(photo.id);
          return (
            <div
              key={photo.id}
              onClick={() => onSelect(photo)}
              className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer shadow-lg transform hover:scale-105 transition-all duration-300 ${isSelected ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-gray-900' : ''}`}
            >
              <img
                src={photo.url}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
              
              <button
                onClick={(e) => handleToggle(e, photo.id)}
                className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 z-10 ${isSelected ? 'bg-green-500 border-green-400' : 'bg-black/30 border-white/50 group-hover:border-white'}`}
                aria-label="Wybierz zdjęcie"
              >
                {isSelected && (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={(e) => handleDelete(e, photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-600/70 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-300 transform scale-75 group-hover:scale-100 z-10"
                aria-label="Usuń zdjęcie"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhotoGrid;