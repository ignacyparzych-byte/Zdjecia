import React from 'react';
import { SearchIcon } from './Icons';

interface PhotoSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const PhotoSearchBar: React.FC<PhotoSearchBarProps> = ({ query, onQueryChange }) => {
  return (
    <div className="relative mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Filter photos by name or description..."
        className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-4 py-2 text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};

export default PhotoSearchBar;