import { useState, useRef, useEffect } from 'react';
import {
  Camera, MapPin, Send, ArrowLeft, Loader2, CheckCircle2,
  FileText, Brain, Crosshair, Copy, Gauge, Building2,
} from 'lucide-react';
import type { Route } from '@/router';
import { MapPicker } from '@/components/MapView';
import { useToast } from '@/components/Toast';
import { submitComplaint, uploadImage, geocodeAddress } from '@/services/api';

interface Props {
  navigate: (r: Route) => void;
}

const processingSteps = [
  { label: 'Reading complaint',              icon: FileText   },
  { label: 'Classifying issue',              icon: Brain      },
  { label: 'Checking location',              icon: Crosshair  },
  { label: 'Searching for duplicate reports', icon: Copy      },
  { label: 'Calculating priority',           icon: Gauge      },
  { label: 'Assigning department',           icon: Building2  },
];

export function CitizenReport({ navigate }: Props) {
  const { showToast } = useToast();
  const [description, setDescription]   = useState('');
  const [imageFile,   setImageFile]      = useState<File | null>(null);
  const [imagePreview, setImagePreview]  = useState('');
  const [lat,  setLat]  = useState(28.6139);
  const [lng,  setLng]  = useState(77.2090);
  const [address,      setAddress]       = useState('');
  const [citizenName,  setCitizenName]   = useState('');
  const [errors,       setErrors]        = useState<Record<string, string>>({});
  const [processing,   setProcessing]    = useState(false);
  const [currentStep,  setCurrentStep]   = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!address || address.length < 5) return;
    const t = setTimeout(async () => {
      try {
        const geo = await geocodeAddress(address);
        setLat(geo.latitude);
        setLng(geo.longitude);
      } catch (err) {
        showToast('Could not find location from address', 'error');
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [address]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = 'Please describe the issue';
    if (!address.trim())     errs.address      = 'Please provide an address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setProcessing(true);

    // --- Step 0: reading complaint ---
    setCurrentStep(0);
    await delay(600);

    try {
      // --- Step 1: classify (server-side) ---
      setCurrentStep(1);
      await delay(400);

      // --- Step 2: checking location ---
      setCurrentStep(2);

      // Upload image if selected
      let imageUrl: string | undefined;
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch {
          // Image upload failure is non-fatal
          showToast('Image upload failed — complaint will be submitted without image', 'info');
        }
      }

      // --- Step 3: duplicates ---
      setCurrentStep(3);
      await delay(300);

      // --- Step 4: priority ---
      setCurrentStep(4);

      // Submit to backend — AI pipeline runs server-side
      const complaint = await submitComplaint({
        description:  description.trim(),
        citizen_name: citizenName.trim() || undefined,
        address:      address.trim(),
        latitude:     lat,
        longitude:    lng,
        image_url:    imageUrl,
      });

      // --- Step 5: department ---
      setCurrentStep(5);
      await delay(300);

      setProcessing(false);
      showToast(`Complaint ${complaint.id} submitted successfully`, 'success');
      navigate({ name: 'citizen-result', id: complaint.id });

    } catch (err: unknown) {
      setProcessing(false);
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      showToast(msg, 'error');
    }
  };

  if (processing) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 pulse-ring">
              <Brain className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">AI Analysis in Progress</h2>
            <p className="text-slate-500 mt-1">Analyzing your complaint with CivicFix AI engines</p>
          </div>
          <div className="space-y-3">
            {processingSteps.map((step, i) => {
              const Icon = step.icon;
              const done   = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    done ? 'bg-green-50' : active ? 'bg-blue-50' : 'bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-green-600' : active ? 'bg-blue-600' : 'bg-slate-300'
                  }`}>
                    {done   ? <CheckCircle2 size={18} className="text-white" /> :
                     active ? <Loader2 size={18} className="text-white animate-spin" /> :
                              <Icon size={18} className="text-slate-500" />}
                  </div>
                  <span className={`font-medium ${
                    done ? 'text-green-700' : active ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                  {done   && <span className="ml-auto text-xs text-green-600 font-semibold">Done</span>}
                  {active && <span className="ml-auto text-xs text-blue-600 font-semibold">Processing...</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate({ name: 'citizen-home' })}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Home
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Report a Civic Issue</h1>
      <p className="text-slate-500 mb-6">Fill in the details below. Our AI will analyze and route your complaint.</p>

      <div className="card p-6 space-y-5">
        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Complaint Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue in detail. e.g. 'Large pothole near the college gate causing difficulty for two-wheelers.'"
            className="input-field resize-none"
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Upload Image</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-2 right-2 px-3 py-1 bg-black/60 text-white text-xs rounded-lg hover:bg-black/80"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            >
              <Camera size={24} />
              <span className="text-sm font-medium">Click to upload an image</span>
              <span className="text-xs text-slate-400">PNG, JPG up to 10MB</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">Click on the map to pinpoint the issue location.</p>
          <MapPicker latitude={lat} longitude={lng} onPick={(la, ln) => { setLat(la); setLng(ln); }} />
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={14} /> {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address or landmark"
            className="input-field mt-2"
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>

        {/* Citizen Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Your Name <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="input-field"
          />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} className="btn-primary w-full py-3 text-base">
          <Send size={18} /> Analyze & Submit Complaint
        </button>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
