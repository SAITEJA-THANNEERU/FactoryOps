import React, { useState, useEffect } from 'react';
import type { Machine, MachineStatus } from '../types/index.ts';
import { X, Cpu, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AddEditMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: Machine | null;
  onSave: (machineData: Partial<Machine>) => Promise<void>;
}

export const AddEditMachineModal: React.FC<AddEditMachineModalProps> = ({
  isOpen,
  onClose,
  machine,
  onSave
}) => {
  const isEditing = Boolean(machine);

  const [machineId, setMachineId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [lineName, setLineName] = useState('Line 1');
  const [lineId, setLineId] = useState('L01');
  const [stationNumber, setStationNumber] = useState('ST-01');
  const [machineType, setMachineType] = useState('CNC Machining Center');
  const [manufacturer, setManufacturer] = useState('DMG Mori');
  const [model, setModel] = useState('NVX 5080');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<MachineStatus>('running');
  const [powerRatingKw, setPowerRatingKw] = useState<number>(30);
  const [targetCycleTimeSeconds, setTargetCycleTimeSeconds] = useState<number>(60);
  const [ratedCapacityUph, setRatedCapacityUph] = useState<number>(60);
  const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState<number>(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (machine) {
      setMachineId(machine.machine_id || machine.id || '');
      setMachineName(machine.name || machine.machine_name || '');
      setLineName(machine.line || machine.line_name || 'Line 1');
      setLineId(machine.line_id || (machine.line === 'Line 2' ? 'L02' : machine.line === 'Line 3' ? 'L03' : 'L01'));
      setStationNumber(machine.station_number || 'ST-01');
      setMachineType(machine.type || machine.machine_type || 'CNC Machining Center');
      setManufacturer(machine.manufacturer || 'DMG Mori');
      setModel(machine.model || '');
      setSerialNumber(machine.serial_number || '');
      setStatus(machine.status || 'running');
      setPowerRatingKw(machine.power_rating_kw ? Number(machine.power_rating_kw) : 30);
      setTargetCycleTimeSeconds(machine.target_cycle_time_seconds ? Number(machine.target_cycle_time_seconds) : 60);
      setRatedCapacityUph(machine.rated_capacity_uph ? Number(machine.rated_capacity_uph) : 60);
      setMaintenanceIntervalDays(machine.maintenance_interval_days ? Number(machine.maintenance_interval_days) : 30);
    } else {
      // Auto generate a candidate ID e.g. M025
      const randomSuffix = Math.floor(25 + Math.random() * 20);
      setMachineId(`M0${randomSuffix}`);
      setMachineName('');
      setLineName('Line 1');
      setLineId('L01');
      setStationNumber('ST-01');
      setMachineType('CNC Machining Center');
      setManufacturer('DMG Mori');
      setModel('NVX 5080');
      setSerialNumber(`SN-${Math.floor(100000 + Math.random() * 900000)}`);
      setStatus('running');
      setPowerRatingKw(30);
      setTargetCycleTimeSeconds(60);
      setRatedCapacityUph(60);
      setMaintenanceIntervalDays(30);
    }
    setErrorMessage(null);
  }, [machine, isOpen]);

  const handleLineChange = (line: string) => {
    setLineName(line);
    if (line === 'Line 1') setLineId('L01');
    else if (line === 'Line 2') setLineId('L02');
    else if (line === 'Line 3') setLineId('L03');
    else setLineId('L01');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName.trim()) {
      setErrorMessage('Machine name is required');
      return;
    }
    if (!machineId.trim()) {
      setErrorMessage('Machine ID is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSave({
        machine_id: machineId.trim().toUpperCase(),
        machine_name: machineName.trim(),
        name: machineName.trim(),
        line_id: lineId,
        line_name: lineName,
        line: lineName,
        station_number: stationNumber.trim(),
        machine_type: machineType.trim(),
        type: machineType.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim(),
        status,
        power_rating_kw: Number(powerRatingKw) || 25,
        target_cycle_time_seconds: Number(targetCycleTimeSeconds) || 60,
        rated_capacity_uph: Number(ratedCapacityUph) || 60,
        maintenance_interval_days: Number(maintenanceIntervalDays) || 30
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving machine:', err);
      setErrorMessage(err.message || 'Failed to save machine. Please verify input fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#191923]/10 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#191923] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#0E79B2]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {isEditing ? `Edit Machine: ${machine?.machine_id}` : 'Add New Plant Machine'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing ? 'Update specifications, telemetry limits, and line assignment' : 'Register a new manufacturing cell or equipment asset'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Machine ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                disabled={isEditing}
                placeholder="e.g. M025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] disabled:bg-slate-100 disabled:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Machine Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={machineName}
                onChange={e => setMachineName(e.target.value)}
                placeholder="e.g. 5-Axis Precision Milling Cell 02"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Production Line
              </label>
              <select
                value={lineName}
                onChange={e => handleLineChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0E79B2]"
              >
                <option value="Line 1">Line 1 (L01 - Machining)</option>
                <option value="Line 2">Line 2 (L02 - Stamping)</option>
                <option value="Line 3">Line 3 (L03 - Assembly & QA)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Station Number
              </label>
              <input
                type="text"
                value={stationNumber}
                onChange={e => setStationNumber(e.target.value)}
                placeholder="e.g. ST-04"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0E79B2]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Operating Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as MachineStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0E79B2] font-semibold"
              >
                <option value="running">🟢 Running / Active</option>
                <option value="warning">🟡 Warning (High Vib/Temp)</option>
                <option value="maintenance">🟠 Maintenance (Servicing)</option>
                <option value="offline">⚪ Offline (Standby)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Machine Type
              </label>
              <input
                type="text"
                value={machineType}
                onChange={e => setMachineType(e.target.value)}
                placeholder="e.g. CNC Turning Center"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0E79B2]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                placeholder="e.g. Mazak, Fanuc, Trumpf"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0E79B2]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Model / Series
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. Series-700X"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0E79B2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                Target Cycle (sec)
              </label>
              <input
                type="number"
                value={targetCycleTimeSeconds}
                onChange={e => setTargetCycleTimeSeconds(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                min="1"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                Rated UPH (units/hr)
              </label>
              <input
                type="number"
                value={ratedCapacityUph}
                onChange={e => setRatedCapacityUph(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                min="1"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                Power Rating (kW)
              </label>
              <input
                type="number"
                value={powerRatingKw}
                onChange={e => setPowerRatingKw(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                min="1"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1 text-[11px]">
                Service Interval (days)
              </label>
              <input
                type="number"
                value={maintenanceIntervalDays}
                onChange={e => setMaintenanceIntervalDays(Math.max(1, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                min="1"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              {isEditing ? 'Saved modifications reflect immediately across real-time dashboards.' : 'Machine will be added to the live operational telemetry fleet.'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Update Machine' : 'Create Machine'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
