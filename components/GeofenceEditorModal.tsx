import React, { useEffect, useRef, useState } from 'react';
import { Project, Geofence } from '../types';
import { CloseIcon } from './Icons';

// Assert that L is available on the window object
declare const L: any;

interface GeofenceEditorModalProps {
  project: Project;
  onClose: () => void;
  onSave: (projectId: string, geofence: Geofence | null) => void;
}

const GeofenceEditorModal: React.FC<GeofenceEditorModalProps> = ({ project, onClose, onSave }) => {
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const [currentGeofence, setCurrentGeofence] = useState<Geofence | null>(project.geofence || null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map-container').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          remove: false,
        },
        draw: {
          polygon: true,
          polyline: false,
          rectangle: false,
          marker: false,
          circle: true,
        }
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (event: any) => {
        drawnItems.clearLayers();
        const layer = event.layer;
        const type = event.layerType;
        drawnItems.addLayer(layer);

        if (type === 'circle') {
          const latlng = layer.getLatLng();
          setCurrentGeofence({
            type: 'circle',
            center: { lat: latlng.lat, lng: latlng.lng },
            radius: layer.getRadius(),
          });
        } else if (type === 'polygon') {
          const latlngs = layer.getLatLngs()[0]; // L.Polygon has nested array
          setCurrentGeofence({
            type: 'polygon',
            points: latlngs.map((p: any) => ({ lat: p.lat, lng: p.lng })),
          });
        }
      });

      map.on(L.Draw.Event.EDITED, (event: any) => {
        event.layers.eachLayer((layer: any) => {
          if (layer instanceof L.Circle) {
            const latlng = layer.getLatLng();
            setCurrentGeofence({
              type: 'circle',
              center: { lat: latlng.lat, lng: latlng.lng },
              radius: layer.getRadius(),
            });
          } else if (layer instanceof L.Polygon) {
            const latlngs = layer.getLatLngs()[0];
            setCurrentGeofence({
              type: 'polygon',
              points: latlngs.map((p: any) => ({ lat: p.lat, lng: p.lng })),
            });
          }
        });
      });

      mapRef.current = map;

      // Initial drawing if geofence exists
      if (project.geofence) {
        let layer;
        if (project.geofence.type === 'circle') {
            const { center, radius } = project.geofence;
            layer = L.circle([center.lat, center.lng], { radius });
        } else if (project.geofence.type === 'polygon') {
            const { points } = project.geofence;
            layer = L.polygon(points.map(p => [p.lat, p.lng]));
        }

        if (layer) {
            drawnItems.addLayer(layer);
            map.fitBounds(layer.getBounds());
        }
      } else {
        // Try to center on user's location if no geofence is set
        navigator.geolocation.getCurrentPosition(
          (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
          () => map.setView([51.505, -0.09], 5) // Fallback
        );
      }
    }

    // Invalidate map size on modal open to prevent gray tiles
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

  }, [project.geofence]);

  const handleSave = () => {
    onSave(project.id, currentGeofence);
  };
  
  const handleClear = () => {
    drawnItemsRef.current?.clearLayers();
    setCurrentGeofence(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Edytuj geostrefę dla "{project.name}"</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div id="map-container" className="flex-grow w-full h-full bg-gray-700" style={{minHeight: '400px'}}></div>
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-400">Narysuj okrąg lub wielokąt na mapie.</p>
            <div className="flex gap-2">
                <button onClick={handleClear} className="px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700">Wyczyść</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white">Zapisz zmiany</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GeofenceEditorModal;