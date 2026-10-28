import React, { useState } from 'react';
import { PlusCircle, ArrowLeft, ShieldCheck, Factory, Zap, Leaf, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

interface CreatePassportProps {
  onBack: () => void;
  onSuccess: (id: string) => void;
}

export const CreatePassport: React.FC<CreatePassportProps> = ({ onBack, onSuccess }) => {
  const [serialNumber, setSerialNumber] = useState('SN-2026-NMC-77412');
  const [manufacturer, setManufacturer] = useState('QuantumVolt Gigafactory');
  const [model, setModel] = useState('QV-Pack-90X');
  const [chemistry, setChemistry] = useState('NMC 811');
  const [facility, setFacility] = useState('Berlin-Brandenburg Gigafactory');
  const [country, setCountry] = useState('DE');
  const [custodian, setCustodian] = useState('QuantumVolt Gigafactory');

  const [capacity, setCapacity] = useState(88.0);
  const [voltage, setVoltage] = useState(400.0);
  const [chargePower, setChargePower] = useState(240.0);
  const [weight, setWeight] = useState(470.0);

  const [totalCo2, setTotalCo2] = useState(58.0);
  const [recCobalt, setRecCobalt] = useState(16.0);
  const [recLithium, setRecLithium] = useState(6.0);
  const [recNickel, setRecNickel] = useState(12.0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        serial_number: serialNumber,
        manufacturer_name: manufacturer,
        model_designation: model,
        chemistry: chemistry,
        manufacturing_date: new Date().toISOString(),
        manufacturing_country: country,
        manufacturing_facility: facility,
        current_custodian: custodian,
        technical_specs: {
          rated_capacity_kwh: capacity,
          nominal_voltage_v: voltage,
          max_charge_power_kw: chargePower,
          cell_count: 192,
          pack_weight_kg: weight,
        },
        carbon_footprint: {
          total_co2_kg_per_kwh: totalCo2,
          manufacturing_co2_kg: 25.0,
          raw_materials_co2_kg: 28.0,
          transport_co2_kg: 5.0,
          eu_compliance_class: 'Class A',
        },
        recycled_content: {
          cobalt_percentage: recCobalt,
          lithium_percentage: recLithium,
          nickel_percentage: recNickel,
          lead_percentage: 0.0,
        },
      };

      const result = await api.createPassport(payload);
      onSuccess(result.battery_id);
    } catch (err: any) {
      setError(err.message || 'Passport creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Mint New Battery Passport</h1>
          <p className="text-xs text-slate-400">EU Regulation 2023/1542 compliant genesis record creation</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Manufacturer & General Identity */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-bold">
            <Factory className="w-4 h-4" />
            <span>Manufacturing Identification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Serial Number *</label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Manufacturer Name *</label>
              <input
                type="text"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Model Designation *</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cell Chemistry *</label>
              <select
                value={chemistry}
                onChange={e => setChemistry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="NMC 811">NMC 811 (High Nickel)</option>
                <option value="NMC 622">NMC 622</option>
                <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
                <option value="Solid State Li-Metal">Solid State Li-Metal</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Facility Location</label>
              <input
                type="text"
                value={facility}
                onChange={e => setFacility(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Country of Origin (ISO 2-letter)</label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 text-sm font-bold">
            <Zap className="w-4 h-4" />
            <span>Technical System Parameters</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Capacity (kWh)</label>
              <input
                type="number"
                step="0.1"
                value={capacity}
                onChange={e => setCapacity(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Nominal Voltage (V)</label>
              <input
                type="number"
                value={voltage}
                onChange={e => setVoltage(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Charge (kW)</label>
              <input
                type="number"
                value={chargePower}
                onChange={e => setChargePower(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Pack Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Circular Economy & Carbon Footprint */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-bold">
            <Leaf className="w-4 h-4" />
            <span>Circularity & Carbon Footprint Targets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Total CO?e (kg/kWh)</label>
              <input
                type="number"
                step="0.1"
                value={totalCo2}
                onChange={e => setTotalCo2(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Recycled Cobalt (%)</label>
              <input
                type="number"
                step="0.1"
                value={recCobalt}
                onChange={e => setRecCobalt(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Recycled Lithium (%)</label>
              <input
                type="number"
                step="0.1"
                value={recLithium}
                onChange={e => setRecLithium(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Recycled Nickel (%)</label>
              <input
                type="number"
                step="0.1"
                value={recNickel}
                onChange={e => setRecNickel(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{submitting ? 'Minting Genesis Passport...' : 'Mint Battery Passport'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
