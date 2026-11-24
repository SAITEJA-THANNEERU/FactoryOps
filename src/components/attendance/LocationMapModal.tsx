import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { api } from '../../services/api.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import type { FactoryLocation } from '../../types/index.ts';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  X,
  Compass,
  Save,
  Loader2,
  ShieldCheck,
  Globe,
  RefreshCw
} from 'lucide-react';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSaved?: (newLocation: FactoryLocation) => void;
  currentLocation?: FactoryLocation | null;
}

const PRESET_PLANTS = [
  { name: 'Apex Precision (Hyderabad)', lat: 17.4435, lng: 78.3772, address: 'Sanath Nagar Industrial Estate, Hyderabad, Telangana 500018' },
  { name: 'Austin Gigafactory Site', lat: 30.2223, lng: -97.6171, address: 'Tesla Gigafactory, Austin, TX 78725, USA' },
  { name: 'Nova Industrial (Pune)', lat: 18.5204, lng: 73.8567, address: 'Bhosari Industrial Area, Pune, Maharashtra 411026' },
  { name: 'Vertex Auto (Chennai)', lat: 13.0827, lng: 80.2707, address: 'Ambattur Industrial Estate, Chennai, Tamil Nadu 600058' }
];

// 1.0 km (1,000 metres) Geofence Circle Component
declare const google: any;

interface MapCircleProps {
  center: { lat: number; lng: number };
  radius: number;
}

const MapCircle: React.FC<MapCircleProps> = ({ center, radius }) => {
  const map = useMap();
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius,
        strokeColor: '#0E79B2',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#0E79B2',
        fillOpacity: 0.18,
        clickable: false
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius);
    }
  }, [map, center.lat, center.lng, radius]);

  useEffect(() => {
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, []);

  return null;
};

// Map Recenter Controller
const MapRecenterController: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
};

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  onLocationSaved,
  currentLocation
}) => {
  useLockBodyScroll(isOpen);
  const { activeFactory } = useAuth();

  const [lat, setLat] = useState<number>(currentLocation?.latitude || 17.4435);
  const [lng, setLng] = useState<number>(currentLocation?.longitude || 78.3772);
  const [address, setAddress] = useState<string>(currentLocation?.address || 'Sanath Nagar Industrial Estate, Hyderabad, Telangana 500018');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (currentLocation) {
      setLat(currentLocation.latitude);
      setLng(currentLocation.longitude);
      setAddress(currentLocation.address || '');
    }
  }, [currentLocation]);

  // Quota warning global listener (Case A / Demo key defense)
  useEffect(() => {
    const handleQuotaExceeded = () => {
      setErrorMsg('Google Maps Platform quota reached. You can still set coordinates manually.');
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  if (!isOpen) return null;

  // Reverse Geocoding Helper
  const performReverseGeocode = useCallback(async (targetLat: number, targetLng: number, forceOverwrite = false) => {
    if (!googleMapsApiKey) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${targetLat},${targetLng}&key=${googleMapsApiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const fetchedAddress = data.results[0].formatted_address;
          if (forceOverwrite || !address || address.startsWith('GPS Device Location:')) {
            setAddress(fetchedAddress);
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, [googleMapsApiKey, address]);

  const handleUseCurrentLocation = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsDetectingGps(false);
        const detectedLat = Number(pos.coords.latitude.toFixed(6));
        const detectedLng = Number(pos.coords.longitude.toFixed(6));
        setLat(detectedLat);
        setLng(detectedLng);
        setSuccessMsg(`Device GPS coordinates detected (±${Math.round(pos.coords.accuracy)}m accuracy).`);
        performReverseGeocode(detectedLat, detectedLng, true);
      },
      err => {
        setIsDetectingGps(false);
        setErrorMsg(`Unable to retrieve GPS location: ${err.message}. You can manually adjust coordinates below.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSelectPreset = (preset: typeof PRESET_PLANTS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setAddress(preset.address);
    setErrorMsg(null);
    setSuccessMsg(`Applied preset for ${preset.name}`);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Please enter valid numerical latitude and longitude.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('Latitude must be between -90 and 90. Longitude must be between -180 and 180.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.attendance.setFactoryLocation({
        factory_id: activeFactory?.id || 'FAC-001',
        latitude: lat,
        longitude: lng,
        address: address.trim() || undefined
      });

      setSuccessMsg('Factory location and 1.0 km attendance geofence saved successfully.');
      if (onLocationSaved) {
        onLocationSaved(res.location);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save factory location.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#191923] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E79B2] flex items-center justify-center text-white shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Configure Factory Attendance Location</h3>
              <p className="text-xs text-slate-400">
                {activeFactory?.name || 'Apex Precision Manufacturing'} • 1.0 km Attendance Geofence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#0E79B2]" />
              <span>Quick Coordinate Setting:</span>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isDetectingGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0E79B2] hover:bg-[#0c6799] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Acquiring GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Use Device Current GPS</span>
                </>
              )}
            </button>
          </div>

          {/* Plant Presets Bar */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Or Select Factory Site Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_PLANTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    Math.abs(lat - preset.lat) < 0.001 && Math.abs(lng - preset.lng) < 0.001
                      ? 'border-[#0E79B2] bg-blue-50/70 text-[#0E79B2] ring-1 ring-[#0E79B2]'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{preset.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {preset.lat}, {preset.lng}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{preset.address}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Google Maps Component */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0E79B2]" />
                <span>Interactive Geofence Map (Click or Drag Marker)</span>
              </span>
              <span className="font-mono text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                1.0 km (1,000m) Radius Active
              </span>
            </div>

            <div className="w-full h-64 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative shadow-inner">
              <APIProvider apiKey={googleMapsApiKey}>
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{ lat, lng }}
                  defaultZoom={14}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  onClick={(e) => {
                    if (e.detail.latLng) {
                      const newLat = Number(e.detail.latLng.lat.toFixed(6));
                      const newLng = Number(e.detail.latLng.lng.toFixed(6));
                      setLat(newLat);
                      setLng(newLng);
                      performReverseGeocode(newLat, newLng, false);
                    }
                  }}
                  className="w-full h-full"
                >
                  <MapRecenterController center={{ lat, lng }} />
                  <AdvancedMarker
                    position={{ lat, lng }}
                    draggable={true}
                    onDragEnd={(e) => {
                      if (e.latLng) {
                        const newLat = Number(e.latLng.lat().toFixed(6));
                        const newLng = Number(e.latLng.lng().toFixed(6));
                        setLat(newLat);
                        setLng(newLng);
                        performReverseGeocode(newLat, newLng, false);
                      }
                    }}
                  />
                  <MapCircle center={{ lat, lng }} radius={1000} />
                </Map>
              </APIProvider>

              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 text-[10px] font-mono text-slate-800 shadow-2xs pointer-events-none z-10 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-[#0E79B2]" />
                <span>Selected Center: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* Coordinate & Address Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Latitude (°N/°S)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={e => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-[#0E79B2] focus:bg-white"
                placeholder="e.g. 17.4435"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Longitude (°E/°W)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={e => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-[#0E79B2] focus:bg-white"
                placeholder="e.g. 78.3772"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Factory Physical Address / Facility Note
                </label>
                <button
                  type="button"
                  onClick={() => performReverseGeocode(lat, lng, true)}
                  disabled={isGeocoding}
                  className="text-[10px] text-[#0E79B2] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Reverse geocode address for current coordinates"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                  <span>Reverse Geocode Address</span>
                </button>
              </div>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#0E79B2] focus:bg-white"
                placeholder="e.g. Main Plant Gate, Sanath Nagar Industrial Estate, Hyderabad"
              />
            </div>
          </div>

          {/* Security & Enforcement Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Administrative Attendance Geofence Policy</span>
            </div>
            <p>
              When an employee checks in, their device coordinates are compared against this center point using the Haversine spherical formula. Check-ins exceeding <strong>1,000 metres (1.0 km)</strong> are automatically rejected by the server.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Location...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Factory Location & Geofence</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
