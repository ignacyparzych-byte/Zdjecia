export interface Photo {
  id: string;
  url: string;
  file: File;
  name: string;
  size: number;
  description: string | null;
  projectId: string | null;
  storagePath?: string;
  location?: { lat: number; lng: number };
  createdAt: string; // ISO string for when it was uploaded
  takenAt: string;   // ISO string for when the photo was taken (from file metadata)
}

export type CircleGeofence = {
  type: 'circle';
  center: { lat: number; lng: number };
  radius: number;
};

export type PolygonGeofence = {
  type: 'polygon';
  points: Array<{ lat: number; lng: number }>;
};

export type Geofence = CircleGeofence | PolygonGeofence;


export interface Project {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  geofence?: Geofence;
}