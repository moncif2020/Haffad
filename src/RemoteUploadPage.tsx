import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Mic, Video, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function RemoteUploadPage() {
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('dev');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'audio' | 'video' | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !deviceId) return;

    setStatus('uploading');
    setUploadType(type);
    setError('');

    try {
      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `remote_uploads/${deviceId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // 2. Add to Firestore
      await addDoc(collection(db, 'uploads'), {
        deviceId,
        type,
        url,
        name: file.name,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  if (!deviceId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <X size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Invalid Link</h1>
          <p className="text-slate-500">Please scan the QR code from your TV device again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Remote Upload</h1>
          <p className="text-slate-500">Connected to TV: <span className="font-mono font-bold text-emerald-600">{deviceId}</span></p>
        </div>

        <div className="grid gap-4">
          {/* Image Upload */}
          <label className="relative flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} disabled={status === 'uploading'} />
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Upload Photo</p>
              <p className="text-sm text-slate-500">JPG, PNG, WebP</p>
            </div>
          </label>

          {/* Audio Upload */}
          <label className="relative flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, 'audio')} disabled={status === 'uploading'} />
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Mic size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Upload Audio</p>
              <p className="text-sm text-slate-500">MP3, WAV, M4A</p>
            </div>
          </label>

          {/* Video Upload */}
          <label className="relative flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer group">
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} disabled={status === 'uploading'} />
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Video size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Upload Video</p>
              <p className="text-sm text-slate-500">MP4, MOV, WebM</p>
            </div>
          </label>
        </div>

        <AnimatePresence>
          {status === 'uploading' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center gap-3 font-bold"
            >
              <Loader2 className="animate-spin" size={20} />
              Uploading {uploadType}...
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-4 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center gap-3 font-bold"
            >
              <Check size={20} />
              Uploaded Successfully!
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-4 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center gap-3 font-bold"
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
