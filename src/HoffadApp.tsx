import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat, BookOpen, Settings, Coins, Heart, Plus, Check, ArrowRight, RefreshCw, X, Mic, ListOrdered, LayoutGrid, Eye, EyeOff, Book, Edit3, Loader2, Headphones, Play, Pause, Square, Volume2, TreePine, Leaf, Droplet, HeartHandshake, Utensils, Gift, Sprout, FileText, Languages, Moon, Sun, Download, Menu, ChevronDown, Image as ImageIcon, Video, ShieldCheck, AlertCircle, Star, Sparkles } from 'lucide-react';
import { QURAN_SURAHS, fetchAyahs, downloadSurahAudio, getAudioUrl } from './lib/quran';
import { MushafViewer } from './components/MushafViewer';
import { CustomSelect } from './components/CustomSelect';
import { GoogleGenAI } from "@google/genai";
import { translations } from './translations';
import { diff_match_patch } from 'diff-match-patch';
import { useAudio } from './AudioContext';

import { QRCodeSVG } from 'qrcode.react';
import { db, auth, storage } from './firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Types ---
type View = 'garden' | 'study' | 'parent' | 'game' | 'listen' | 'mushaf' | 'about' | 'upgrade';
type Lesson = { id: string; title: string; text: string; type?: 'quran' | 'custom' };
type Language = string;

const APP_LANGUAGES = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'it', name: 'Italiano', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'th', name: 'ไทย', dir: 'ltr' },
  { code: 'pl', name: 'Polski', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
];

// Proxy to handle all 20 languages with English fallback for both language and specific keys
const t: any = new Proxy(translations, {
  get: (target, lang: string) => {
    const langData = target[lang] || target['en'];
    return new Proxy(langData, {
      get: (innerTarget, key: string) => {
        // Return the translation if it exists in the current language, 
        // otherwise fall back to the English version of that key, 
        // and if that's also missing, return an empty string to prevent .replace() errors.
        return innerTarget[key] || target['en'][key] || '';
      }
    });
  }
});

// --- Helper: Normalize Arabic Text for Comparison ---
const normalizeArabic = (text: string) => {
  if (!text) return '';
  
  // 1. Unicode Normalization (NFC) to handle different character representations
  let normalized = text.normalize('NFC');

  return normalized
    // 2. Remove Tatweel (Kashida)
    .replace(/\u0640/g, "")
    // 3. Remove all Tashkeel (diacritics)
    // Range \u064B-\u065F covers Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun, Maddah, Hamza above/below
    .replace(/[\u064B-\u065F]/g, "")
    // 4. Remove all Quranic marks, small letters, and stop signs
    // This covers a wide range: \u0610-\u061A, \u06D6-\u06ED, \u0670 (Superscript Alef)
    .replace(/[\u0610-\u061A\u06D6-\u06ED\u0670]/g, "") 
    // 5. Normalize all forms of Alef (including Hamzat Wasl ٱ) to a simple Alef ا
    .replace(/[أإآٱ]/g, "ا")
    // 6. Normalize Ta'a Marbuta to Ha'a
    .replace(/ة/g, "ه")
    // 7. Normalize Alif Maksura and Yaa to a single form (Yaa)
    // This is crucial because STT engines often interchange them at the end of words
    .replace(/[ىي]/g, "ي")
    // 8. Normalize Waw with Hamza to simple Waw
    .replace(/ؤ/g, "و")
    // 9. Normalize Yaa with Hamza to simple Yaa
    .replace(/ئ/g, "ي")
    // 10. Handle specific Uthmani script spelling variations to match standard spelling
    .replace(/صلوه/g, "صلاه")
    .replace(/زكوه/g, "زكاه")
    .replace(/حيوه/g, "حياه")
    .replace(/ربوا/g, "ربا")
    // 11. Remove Ayah markers and numbers
    .replace(/۝/g, "")
    .replace(/[٠-٩0-9]/g, "") 
    // 12. Remove any remaining non-Arabic characters (except spaces)
    .replace(/[^\u0600-\u06FF\s]/g, "") 
    // 13. Clean up extra spaces
    .replace(/\s+/g, " ")
    .trim();
};

// --- Listen & Memorize Screen ---
function ListenScreen({ lang }: { lang: Language }) {
  const [listenMode, setListenMode] = useState<'quran' | 'custom'>('quran');

  // Quran State
  const [surahs, setSurahs] = useState<any[]>(QURAN_SURAHS);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [fromAyah, setFromAyah] = useState<number>(1);
  const [toAyah, setToAyah] = useState<number>(7);
  const {
    playlist, setPlaylist,
    currentTrackIndex, setCurrentTrackIndex,
    isPlaying, setIsPlaying,
    isLoading, setIsLoading,
    playTrack, pause, resume, stop, startNewPlaylist,
    reciter, setReciter,
    repetitions, setRepetitions,
    rangeRepetitions, setRangeRepetitions
  } = useAudio();

  // Custom Text State
  const [customText, setCustomText] = useState<string>('');
  const [customLang, setCustomLang] = useState<string>('ar-SA');
  const [customReps, setCustomReps] = useState<number>(3);
  const [customRangeReps, setCustomRangeReps] = useState<number>(1);
  const [customPlaylist, setCustomPlaylist] = useState<string[]>([]);
  const [customCurrentIndex, setCustomCurrentIndex] = useState<number>(-1);
  const [extractingType, setExtractingType] = useState<'image' | 'audio' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const RECITERS = [
    { id: 'Husary_64kbps', name: 'محمود خليل الحصري (معلم)' },
    { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي' },
    { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' },
    { id: 'Abdul_Basit_Murattal_64kbps', name: 'عبد الباسط عبد الصمد' },
    { id: 'Ghamadi_40kbps', name: 'سعد الغامدي' },
    { id: 'Maher_AlMuaiqly_64kbps', name: 'ماهر المعيقلي' },
    { id: 'https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/', name: 'إسلام صبحي' },
    { id: 'https://server9.mp3quran.net/omar_warsh/', name: 'عمر القزابري (المغرب)' },
    { id: 'https://server11.mp3quran.net/koshi/', name: 'العيون الكوشي (المغرب)' },
    { id: 'https://server16.mp3quran.net/souilass/Rewayat-Warsh-A-n-Nafi/', name: 'يونس اسويلص (المغرب)' },
    { id: 'https://server12.mp3quran.net/ifrad/', name: 'رشيد افراد (المغرب)' },
    { id: 'https://server6.mp3quran.net/bl3/Rewayat-Warsh-A-n-Nafi/', name: 'رشيد بلعالية (المغرب)' }
  ];

  useEffect(() => {
    // Cleanup custom audio on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = Number(e.target.value);
    setSelectedSurah(s);
    setFromAyah(1);
    const surahData = surahs.find(x => x.number === s);
    setToAyah(surahData ? surahData.numberOfAyahs : 1);
  };

  const selectedSurahData = surahs.find(s => s.number === selectedSurah);
  const maxAyahs = selectedSurahData ? selectedSurahData.numberOfAyahs : 1;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadSurahAudio(selectedSurah, fromAyah, toAyah, reciter, (progress) => {
        setDownloadProgress(progress);
      });
      alert(t[lang].downloadComplete);
    } catch (err) {
      console.error(err);
      alert(t[lang].downloadError);
    } finally {
      setIsDownloading(false);
    }
  };

  const startListening = async () => {
    if (listenMode === 'quran') {
      setIsLoading(true);
      try {
        const data = await fetchAyahs(selectedSurah, fromAyah, toAyah);
        const ayahs = data.ayahs;

        if (ayahs.length === 0) {
          setIsLoading(false);
          alert(t[lang].errorFetchingAyahs);
          return;
        }

        const newPlaylist: {url: string, text: string, surah: number, ayah: number}[] = [];

        // Build playlist: repeat each ayah X times, and repeat the whole range Y times
        for (let j = 0; j < rangeRepetitions; j++) {
          ayahs.forEach((ayah: any) => {
            for (let i = 0; i < repetitions; i++) {
              newPlaylist.push({
                url: getAudioUrl(reciter, selectedSurah, ayah.numberInSurah),
                text: ayah.text,
                surah: selectedSurah,
                ayah: ayah.numberInSurah
              });
            }
          });
        }

        startNewPlaylist(newPlaylist, 0);
      } catch (err) {
        console.error(err);
        alert(t[lang].errorFetchingAyahs);
        setIsLoading(false);
      }
    } else {
      // Custom text start logic
      if (!customText.trim()) return;
      const sentences = customText.split(/[.،\n]+/).filter(s => s.trim().length > 0);
      const newPlaylist: string[] = [];
      
      for (let j = 0; j < customRangeReps; j++) {
        sentences.forEach(sentence => {
          for (let i = 0; i < customReps; i++) {
            newPlaylist.push(sentence.trim());
          }
        });
      }
      
      setCustomPlaylist(newPlaylist);
      setCustomCurrentIndex(0);
      setIsPlaying(true);
    }
  };

  const stopListening = () => {
    if (listenMode === 'quran') {
      stop();
    } else {
      window.speechSynthesis.cancel();
      setCustomCurrentIndex(-1);
      setCustomPlaylist([]);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (listenMode === 'quran') {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 's' || e.key === 'S') {
        stopListening();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isPlaying, listenMode, customText, customReps, customRangeReps]);

  // Custom Text Effect
  useEffect(() => {
    if (listenMode !== 'custom') return;
    if (customCurrentIndex >= 0 && customCurrentIndex < customPlaylist.length) {
      window.speechSynthesis.cancel(); // cancel previous
      const text = customPlaylist[customCurrentIndex];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = customLang;
      utterance.rate = 0.85; // Slightly slower for memorization
      
      utterance.onend = () => {
        setCustomCurrentIndex(prev => prev + 1);
      };
      utterance.onerror = (e) => {
        console.error("TTS Error", e);
        setCustomCurrentIndex(prev => prev + 1);
      };
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else if (customCurrentIndex >= customPlaylist.length && customPlaylist.length > 0) {
      stopListening();
    }
  }, [customCurrentIndex, customPlaylist, customLang, listenMode]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(lang.startsWith('ar') ? "حجم الصورة كبير جداً. يرجى رفع صورة أقل من 15 ميجابايت." : "Image size is too large. Please upload an image smaller than 15MB.");
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "") {
      alert(lang.startsWith('ar') ? "خطأ: لم يتم العثور على مفتاح API. يرجى التأكد من إضافة GEMINI_API_KEY في قسم Secrets ثم قم بتحديث الصفحة (Refresh)." : "Error: API key not found. Please ensure GEMINI_API_KEY is added to Secrets and refresh the page.");
      return;
    }

    setExtractingType('image');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = error => reject(error);
      });

      const base64Data = (reader.result as string).split(',')[1];
      let mimeType = file.type || 'image/jpeg';

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: "استخرج النص من هذه الصورة بدقة. أعد النص فقط بدون أي إضافات أو تعليقات. إذا كان هناك نص عربي، حافظ على التشكيل إن وجد." }
            ]
          }
        ],
      });

      if (response.text) {
        setCustomText(prev => prev ? prev + '\n\n' + response.text.trim() : response.text.trim());
      } else {
        throw new Error("لم يتم العثور على نص في الصورة.");
      }
    } catch (error: any) {
      console.error("Extraction Error:", error);
      const msg = error?.message || String(error);
      alert(lang.startsWith('ar') ? `حدث خطأ: ${msg}` : `Error: ${msg}`);
    } finally {
      setExtractingType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(lang.startsWith('ar') ? "حجم الملف الصوتي كبير جداً. يرجى رفع ملف أقل من 15 ميجابايت." : "Audio file size is too large. Please upload a file smaller than 15MB.");
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "") {
      alert(lang.startsWith('ar') ? "خطأ: مفتاح API غير صالح أو غير مضبوط." : "Error: Invalid or missing API key.");
      return;
    }

    setExtractingType('audio');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = error => reject(error);
      });

      const base64Data = (reader.result as string).split(',')[1];
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        mimeType = ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
      } else if (mimeType === 'audio/mp3') {
        mimeType = 'audio/mpeg';
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: "استخرج النص من هذا المقطع الصوتي بدقة (تفريغ صوتي). أعد النص فقط بدون أي إضافات أو تعليقات." }
            ]
          }
        ],
      });

      if (response.text) {
        setCustomText(prev => prev ? prev + '\n\n' + response.text.trim() : response.text.trim());
      } else {
        throw new Error("لم يتم استخراج أي نص من الصوت.");
      }
    } catch (error: any) {
      console.error("Audio Extraction Error:", error);
      alert(lang.startsWith('ar') ? `خطأ في الصوت: ${error?.message || error}` : `Audio Error: ${error?.message || error}`);
    } finally {
      setExtractingType(null);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(lang.startsWith('ar') ? "حجم الفيديو كبير جداً. يرجى رفع ملف أقل من 15 ميجابايت." : "Video file size is too large. Please upload a file smaller than 15MB.");
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "") {
      alert(lang.startsWith('ar') ? "خطأ: مفتاح API غير صالح أو غير مضبوط." : "Error: Invalid or missing API key.");
      return;
    }

    setExtractingType('video');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = error => reject(error);
      });

      const base64Data = (reader.result as string).split(',')[1];
      let mimeType = file.type || 'video/mp4';

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: "استخرج النص من هذا الفيديو بدقة (تفريغ صوتي). أعد النص فقط بدون أي إضافات أو تعليقات." }
            ]
          }
        ],
      });

      if (response.text) {
        setCustomText(prev => prev ? prev + '\n\n' + response.text.trim() : response.text.trim());
      } else {
        throw new Error("لم يتم استخراج أي نص من الفيديو.");
      }
    } catch (error: any) {
      console.error("Video Extraction Error:", error);
      alert(lang.startsWith('ar') ? `خطأ في الفيديو: ${error?.message || error}` : `Video Error: ${error?.message || error}`);
    } finally {
      setExtractingType(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const startCustomListening = () => {
    window.speechSynthesis.cancel();
    // Split by newlines or periods to create chunks
    const chunks = customText.split(/\n|\./).map(s => s.trim()).filter(s => s.length > 0);
    if (chunks.length === 0) return;

    const newPlaylist: string[] = [];
    for (let j = 0; j < customRangeReps; j++) {
      chunks.forEach(chunk => {
        for (let i = 0; i < customReps; i++) {
          newPlaylist.push(chunk);
        }
      });
    }

    setCustomPlaylist(newPlaylist);
    setCustomCurrentIndex(0);
    setIsPlaying(true);
  };

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-2xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-emerald-100 p-4 rounded-2xl shadow-sm">
          <Headphones className="text-emerald-600" size={32} />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{t[lang].listenAndMemorizeTitle}</h2>
          <p className="text-slate-500 text-sm sm:text-base">{t[lang].listenAndMemorizeDesc}</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-200 p-1.5 rounded-2xl mb-8 shadow-inner">
        <button 
          onClick={() => { setListenMode('quran'); stopListening(); }}
          className={`flex-1 py-4 rounded-xl font-bold text-base transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${listenMode === 'quran' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t[lang].quran}
        </button>
        <button 
          onClick={() => { setListenMode('custom'); stopListening(); }}
          className={`flex-1 py-4 rounded-xl font-bold text-base transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${listenMode === 'custom' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t[lang].customTexts}
        </button>
      </div>

      {listenMode === 'quran' ? (
        playlist.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < playlist.length ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 mb-8 flex flex-col items-center text-center">
            <div className="bg-emerald-50 p-5 rounded-full mb-6">
              <Volume2 size={48} className="text-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-500 mb-4">
              {selectedSurahData?.name} - {t[lang].ayah} {playlist[currentTrackIndex].ayah}
            </h3>
            <div className="bg-emerald-50/50 p-8 rounded-3xl border-2 border-emerald-100/50 mb-10 w-full min-h-[160px] flex items-center justify-center shadow-inner">
              <p className="text-2xl sm:text-3xl leading-relaxed font-arabic text-slate-800">
                {playlist[currentTrackIndex].text} ۝
              </p>
            </div>
            
            <div className="flex items-center gap-6 w-full justify-center">
              <button 
                onClick={stopListening}
                className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 focus:ring-4 focus:ring-red-300 outline-none transition-all"
                title="S - Stop"
              >
                <Square size={28} fill="currentColor" />
              </button>
              <button 
                onClick={togglePlayPause}
                className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-300 outline-none transition-all transform active:scale-95"
                title="Space - Play/Pause"
              >
                {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 mt-8">
              <p className="text-slate-500 font-bold text-lg">
                {t[lang].currentRepetition.replace('{current}', String((currentTrackIndex % repetitions) + 1)).replace('{total}', String(repetitions))}
              </p>
              {rangeRepetitions > 1 && (
                <p className="text-emerald-700 font-black text-sm bg-emerald-100 px-4 py-1.5 rounded-full uppercase tracking-wide">
                  {t[lang].currentRangeRepetition
                    .replace('{current}', String(Math.floor(currentTrackIndex / (playlist.length / rangeRepetitions)) + 1))
                    .replace('{total}', String(rangeRepetitions))}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-lg border border-slate-100 space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-700 mb-3">{t[lang].chooseSurah}</label>
              <CustomSelect 
                value={selectedSurah} 
                onChange={(val) => handleSurahChange({ target: { value: val } } as any)}
                options={surahs.map(s => ({ value: s.number, label: s.name }))}
              />
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].fromAyah}</label>
                <input 
                  type="number" min="1" max={toAyah} 
                  value={fromAyah} onChange={e => setFromAyah(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].toAyah}</label>
                <input 
                  type="number" min={fromAyah} max={maxAyahs} 
                  value={toAyah} onChange={e => setToAyah(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-700 mb-3">{t[lang].reciter}</label>
              <CustomSelect 
                value={reciter} 
                onChange={(val) => setReciter(val)}
                options={RECITERS.map(r => ({ value: r.id, label: r.name }))}
              />
            </div>

            <div>
              <label className="block text-base font-bold text-slate-700 mb-3">{t[lang].repetitions}</label>
              <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                <input 
                  type="range" min="1" max="10" 
                  value={repetitions} onChange={e => setRepetitions(Number(e.target.value))}
                  className="flex-1 accent-emerald-500 h-2"
                />
                <span className="w-12 text-center font-black text-emerald-600 text-xl">{repetitions}</span>
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-700 mb-3">{t[lang].rangeRepetitions}</label>
              <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                <input 
                  type="range" min="1" max="10" 
                  value={rangeRepetitions} onChange={e => setRangeRepetitions(Number(e.target.value))}
                  className="flex-1 accent-emerald-500 h-2"
                />
                <span className="w-12 text-center font-black text-emerald-600 text-xl">{rangeRepetitions}</span>
              </div>
            </div>

            <button 
              onClick={startListening}
              disabled={isLoading}
              className="w-full bg-emerald-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-300 outline-none transition-all flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
              <span>{t[lang].startListening}</span>
            </button>
            <button 
              onClick={handleDownload}
              disabled={isDownloading || isLoading}
              className="w-full bg-slate-100 text-slate-700 font-bold py-5 rounded-2xl border-2 border-slate-200 flex items-center justify-center gap-3 hover:bg-slate-200 focus:ring-4 focus:ring-slate-300 outline-none transition-all text-lg"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t[lang].downloading.replace('{progress}', String(downloadProgress))}
                </>
              ) : (
                <>
                  <Download />
                  {t[lang].downloadOffline}
                </>
              )}
            </button>
          </div>
        )
      ) : (
        customPlaylist.length > 0 && customCurrentIndex >= 0 && customCurrentIndex < customPlaylist.length ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
            <Volume2 size={40} className="text-emerald-500 mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-500 mb-2">
              {t[lang].dictationText}
            </h3>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8 w-full min-h-[120px] flex items-center justify-center">
              <p className="text-2xl leading-loose font-medium text-slate-800" dir="auto">
                {customPlaylist[customCurrentIndex]}
              </p>
            </div>
            
            <div className="flex items-center gap-4 w-full justify-center">
              <button 
                onClick={stopListening}
                className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <Square size={24} fill="currentColor" />
              </button>
              <button 
                onClick={togglePlayPause}
                className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
              </button>
            </div>
            <div className="flex flex-col items-center gap-1 mt-6">
              <p className="text-slate-500 font-medium">
                {t[lang].currentRepetition.replace('{current}', String((customCurrentIndex % customReps) + 1)).replace('{total}', String(customReps))}
              </p>
              {customRangeReps > 1 && (
                <p className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">
                  {t[lang].currentRangeRepetition
                    .replace('{current}', String(Math.floor(customCurrentIndex / (customPlaylist.length / customRangeReps)) + 1))
                    .replace('{total}', String(customRangeReps))}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={extractingType !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {extractingType === 'image' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    {lang.startsWith('ar') ? 'صورة' : lang.startsWith('fr') ? 'Image' : 'Image'}
                  </button>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    ref={audioInputRef}
                    onChange={handleAudioUpload}
                  />
                  <button 
                    onClick={() => audioInputRef.current?.click()}
                    disabled={extractingType !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {extractingType === 'audio' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    {lang.startsWith('ar') ? 'صوت' : lang.startsWith('fr') ? 'Audio' : 'Audio'}
                  </button>
                  <input 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    ref={videoInputRef}
                    onChange={handleVideoUpload}
                  />
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    disabled={extractingType !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {extractingType === 'video' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    {lang.startsWith('ar') ? 'فيديو' : lang.startsWith('fr') ? 'Vidéo' : 'Video'}
                  </button>
                </div>
              </div>
              <textarea 
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder={t[lang].textPlaceholder}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium min-h-[150px] resize-none"
                dir="auto"
              />
              <p className="text-xs text-slate-400 mt-2">{t[lang].textTip}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].textLanguage}</label>
              <div className="relative">
                <Languages className="absolute right-4 top-4 text-slate-400" size={20} />
                <select 
                  value={customLang} 
                  onChange={e => setCustomLang(e.target.value)}
                  className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
                >
                  <option value="ar-SA">{t[lang].arabic}</option>
                  <option value="en-US">{t[lang].english}</option>
                  <option value="fr-FR">{t[lang].french}</option>
                  <option value="es-ES">{t[lang].spanish}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].repetitionsPerLine}</label>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <input 
                  type="range" min="1" max="10" 
                  value={customReps} onChange={e => setCustomReps(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-10 text-center font-bold text-emerald-600 text-lg">{customReps}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].rangeRepetitions}</label>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <input 
                  type="range" min="1" max="10" 
                  value={customRangeReps} onChange={e => setCustomRangeReps(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-10 text-center font-bold text-emerald-600 text-lg">{customRangeReps}</span>
              </div>
            </div>

            <button 
              onClick={startCustomListening}
              disabled={customText.trim().length === 0}
              className="w-full bg-emerald-500 text-white font-bold text-lg py-4 rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 mt-4 hover:bg-emerald-600 transition-colors disabled:opacity-70"
            >
              <Play fill="currentColor" />
              {t[lang].startDictation}
            </button>
          </div>
        )
      )}
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [view, setView] = useState<View>('study');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [donations, setDonations] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([
    { id: '1', title: 'سورة الإخلاص', text: 'قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد' },
    { id: '2', title: 'أنشودة الصباح', text: 'طلع الصباح فغردت طيور الحديقة فرحة بيوم جديد مشرق وجميل' }
  ]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lang, setLang] = useState<Language>('ar');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { isPlaying, playlist, currentTrackIndex, pause, resume } = useAudio();

  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [deviceId] = useState(() => {
    const saved = localStorage.getItem('hoffad_device_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('hoffad_device_id', newId);
    return newId;
  });

  // Listen for remote uploads
  useEffect(() => {
    const q = query(collection(db, 'uploads'), where('deviceId', '==', deviceId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Handle new upload (e.g., add to lessons)
          if (data.type === 'image') {
            setLessons(prev => [...prev, { 
              id: change.doc.id, 
              title: data.name || `Remote Image ${new Date().toLocaleTimeString()}`, 
              text: data.url, 
              type: 'custom' 
            }]);
          }
          // Delete from firestore after processing
          deleteDoc(doc(db, 'uploads', change.doc.id));
        }
      });
    });
    return () => unsubscribe();
  }, [deviceId]);

  useEffect(() => {
    const handleAppKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'm' || e.key === 'M') {
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleAppKeys);
    return () => window.removeEventListener('keydown', handleAppKeys);
  }, []);

  // Fallback translation helper
  const getT = (l: string) => {
    return (t as any)[l] || t['en'];
  };

  const currentT = getT(lang);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleDonate = (amount: number) => {
    if (coins >= amount) {
      setCoins(coins - amount);
      setDonations(donations + 1);
    }
  };

  const startGame = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setView('game');
  };

  const handleGameComplete = (earnedCoins: number) => {
    setCoins(coins + earnedCoins);
    setXp(xp + earnedCoins); // XP grows with effort
    setView('garden');
    setActiveLesson(null);
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 bg-slate-50 text-slate-800 ${isDarkMode ? 'dark' : ''}`} dir={APP_LANGUAGES.find(l => l.code === lang)?.dir || 'ltr'}>
      {/* Remote Upload Modal */}
      <AnimatePresence>
        {isRemoteModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setIsRemoteModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ImageIcon size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{currentT.remoteUploadTitle}</h2>
                <p className="text-slate-500 mb-8">{currentT.scanToUpload}</p>

                <div className="bg-white p-6 rounded-3xl border-4 border-slate-50 shadow-inner inline-block mb-8">
                  <QRCodeSVG 
                    value={`${window.location.origin}/upload?dev=${deviceId}`}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Device ID</p>
                  <p className="text-2xl font-mono font-black text-emerald-600 tracking-wider">{deviceId}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="bg-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-[100] transition-colors duration-300 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-[#00c48c] text-white p-2.5 sm:p-3 rounded-[16px] shadow-sm hover:bg-[#00b07d] transition-colors focus:ring-4 focus:ring-emerald-300 outline-none"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 hidden sm:flex">
            <img src="/logo.svg" alt="Hoffad Logo" className="w-8 h-8 object-contain" />
            <h1 className="font-bold text-xl text-slate-800">{currentT.myApp}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          {/* Custom Language Selector for TV Compatibility */}
          <div className="relative" ref={langMenuRef}>
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 bg-slate-50 text-slate-700 text-sm font-bold py-2 px-4 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <Languages size={18} className="text-emerald-600" />
              <span className="uppercase">{lang}</span>
              <ChevronDown size={14} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 start-0 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[1000] overflow-hidden py-2 max-h-[70vh] overflow-y-auto"
                >
                  {APP_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-start px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${lang === l.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span>{l.name}</span>
                      {lang === l.code && <Check size={16} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-slate-400 hover:text-slate-600 transition-colors focus:ring-2 focus:ring-emerald-500 outline-none p-1 rounded-full"
          >
            {isDarkMode ? <Sun size={24} className="text-amber-500" /> : <Moon size={24} />}
          </button>
          
          <div className="flex items-center gap-2">
            {!isPremium && (
              <button 
                onClick={() => setView('upgrade')}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 px-3 py-1.5 rounded-full font-black text-[10px] sm:text-xs shadow-md shadow-amber-200 hover:scale-105 transition-transform active:scale-95 focus:ring-4 focus:ring-amber-300 outline-none"
              >
                <Star size={14} fill="currentColor" />
                <span className="uppercase tracking-wider">{t[lang].upgradeShort}</span>
              </button>
            )}
            
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-4 py-2.5 rounded-full font-bold text-sm">
              <span className="text-base">{coins}</span>
              <Coins size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div 
              initial={{ x: lang === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-64 bg-white shadow-2xl z-50 flex flex-col`}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Hoffad Logo" className="w-8 h-8 object-contain" />
                  <span className="font-bold text-xl text-emerald-700">{t[lang].myApp}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
                <button 
                  onClick={() => { setView('mushaf'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'mushaf' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Book size={22} className={view === 'mushaf' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].quran}</span>
                </button>

                <button 
                  onClick={() => { setView('listen'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'listen' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Headphones size={22} className={view === 'listen' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].listen}</span>
                </button>

                <button 
                  onClick={() => { setView('study'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'study' || view === 'game' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <BookOpen size={22} className={view === 'study' || view === 'game' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].study}</span>
                </button>

                <button 
                  onClick={() => { setView('garden'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'garden' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <TreePine size={22} className={view === 'garden' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].garden}</span>
                </button>
                
                <button 
                  onClick={() => { setView('parent'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'parent' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <ShieldCheck size={22} className={view === 'parent' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].settings}</span>
                </button>

                {!isPremium && (
                  <button 
                    onClick={() => { setView('upgrade'); setIsSidebarOpen(false); }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-amber-500 outline-none ${view === 'upgrade' ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'}`}
                  >
                    <Star size={22} className={view === 'upgrade' ? 'text-amber-600' : 'text-white'} fill={view === 'upgrade' ? 'currentColor' : 'none'} />
                    <span>{t[lang].upgrade}</span>
                  </button>
                )}

                <button 
                  onClick={() => { setView('about'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full focus:ring-2 focus:ring-emerald-500 outline-none ${view === 'about' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <AlertCircle size={22} className={view === 'about' ? 'text-emerald-600' : 'text-emerald-500'} />
                  <span>{t[lang].aboutUs}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col pb-8">
        <AnimatePresence mode="wait">
          {view === 'garden' && (
            <motion.div key="garden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GardenScreen xp={xp} coins={coins} donations={donations} onDonate={handleDonate} onStudyClick={() => setView('study')} lang={lang} />
            </motion.div>
          )}
          {view === 'study' && (
            <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudyScreen lessons={lessons} onStartGame={startGame} lang={lang} />
            </motion.div>
          )}
          {view === 'game' && activeLesson && (
            <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GameScreen lesson={activeLesson} onComplete={handleGameComplete} onCancel={() => setView('study')} lang={lang} />
            </motion.div>
          )}
          {view === 'listen' && (
            <motion.div key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ListenScreen lang={lang} />
            </motion.div>
          )}
          {view === 'parent' && (
            <motion.div key="parent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ParentScreen lessons={lessons} setLessons={setLessons} lang={lang} setLang={setLang} isPremium={isPremium} onUpgrade={() => setView('upgrade')} setIsRemoteModalOpen={setIsRemoteModalOpen} />
            </motion.div>
          )}
          {view === 'mushaf' && (
            <motion.div key="mushaf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MushafViewer />
            </motion.div>
          )}
          {view === 'about' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AboutScreen lang={lang} />
            </motion.div>
          )}
          {view === 'upgrade' && (
            <motion.div key="upgrade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UpgradeScreen lang={lang} onUpgrade={() => { setIsPremium(true); setView('study'); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Screens ---

function UpgradeScreen({ lang, onUpgrade }: { lang: Language, onUpgrade: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6 py-4"
    >
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={120} className="text-emerald-600" />
        </div>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="p-4 bg-emerald-100 rounded-full mb-4">
            <Star className="text-emerald-600" size={48} fill="currentColor" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">{t[lang].upgrade}</h2>
          <p className="text-slate-500 max-w-xs">{t[lang].upgradeDesc}</p>
        </div>

        <div className="space-y-4 mb-10">
          {[
            { icon: <Mic size={20} />, text: t[lang].unlimitedMemorization },
            { icon: <Check size={20} />, text: t[lang].advancedTajweed },
            { icon: <BookOpen size={20} />, text: t[lang].unlimitedLessons },
            { icon: <Download size={20} />, text: t[lang].offlineMode },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-emerald-600">{feature.icon}</div>
              <span className="font-bold text-slate-700">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={onUpgrade}
            className="p-6 bg-emerald-500 text-white rounded-3xl shadow-lg shadow-emerald-200 flex flex-col items-center gap-1 hover:bg-emerald-600 transition-all active:scale-95"
          >
            <span className="text-xl font-black">{t[lang].monthlyPlan}</span>
            <span className="text-emerald-100 font-bold">{t[lang].priceMonthly}</span>
          </button>

          <button 
            onClick={onUpgrade}
            className="p-6 bg-slate-800 text-white rounded-3xl shadow-lg shadow-slate-200 flex flex-col items-center gap-1 hover:bg-slate-900 transition-all active:scale-95 relative"
          >
            <div className="absolute -top-3 right-6 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1 rounded-full shadow-sm">
              {t[lang].save25}
            </div>
            <span className="text-xl font-black">{t[lang].yearlyPlan}</span>
            <span className="text-slate-400 font-bold">{t[lang].priceYearly}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AboutScreen({ lang }: { lang: Language }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6 py-4"
    >
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-emerald-100 rounded-2xl">
            <AlertCircle className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">{t[lang].aboutUs}</h2>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-bold text-emerald-600 mb-2">{t[lang].myApp}</h3>
            <p className="text-slate-600 leading-relaxed">{t[lang].aboutDesc}</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t[lang].privacyPolicy}</h3>
            <p className="text-slate-600 leading-relaxed">{t[lang].privacyDesc}</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t[lang].termsOfUse}</h3>
            <p className="text-slate-600 leading-relaxed">{t[lang].termsDesc}</p>
          </section>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="flex gap-3">
              <AlertCircle className="text-emerald-500 shrink-0" size={20} />
              <p className="text-sm text-emerald-800 font-medium leading-snug">
                {t[lang].warning}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GardenScreen({ xp, coins, donations, onDonate, onStudyClick, lang }: { xp: number, coins: number, donations: number, onDonate: (amount: number) => void, onStudyClick: () => void, lang: Language }) {
  const levels = [
    { max: 50, title: t[lang].seedOfKnowledge, icon: '🌱', color: 'text-emerald-500' },
    { max: 150, title: t[lang].plantOfCertainty, icon: '🌿', color: 'text-emerald-600' },
    { max: 300, title: t[lang].treeOfWisdom, icon: '🌳', color: 'text-green-700' },
    { max: Infinity, title: t[lang].gardenOfGiving, icon: '🍎', color: 'text-red-500' }
  ];
  
  const currentLevelIndex = levels.findIndex(l => xp < l.max);
  const currentLevel = currentLevelIndex === -1 ? levels[levels.length - 1] : levels[currentLevelIndex];
  const nextLevel = currentLevelIndex === -1 ? null : levels[currentLevelIndex];
  const prevMax = currentLevelIndex <= 0 ? 0 : levels[currentLevelIndex - 1].max;
  
  const progress = nextLevel ? ((xp - prevMax) / (nextLevel.max - prevMax)) * 100 : 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6 py-4 pb-24"
    >
      {/* Section 1: The Self (Tree & Title) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm w-full text-center border border-slate-100">
        <h2 className="text-xl font-bold text-slate-500 mb-2">{t[lang].currentLevel}</h2>
        <h3 className={`text-3xl font-black mb-6 ${currentLevel.color}`}>{currentLevel.title}</h3>
        
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="text-9xl mb-6 drop-shadow-xl"
        >
          {currentLevel.icon}
        </motion.div>

        {nextLevel && (
          <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden flex">
            <motion.div 
              className="h-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', bounce: 0.5 }}
            />
          </div>
        )}
        <p className="text-slate-400 text-sm font-medium">
          {nextLevel ? t[lang].pointsToNext.replace('{points}', String(nextLevel.max - xp)) : t[lang].reachedHighestLevel}
        </p>
      </div>

      {/* Section 2: The Others (Charity Shop) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm w-full border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HeartHandshake className="text-rose-500" />
            {t[lang].fruitsOfGiving}
          </h2>
          <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Gift size={16} />
            {t[lang].donationsCount.replace('{count}', String(donations))}
          </div>
        </div>

        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          {t[lang].useCoins}
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onDonate(20)}
            disabled={coins < 20}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${coins >= 20 ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 opacity-70'}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm"><Droplet size={24} className={coins >= 20 ? 'text-emerald-500' : 'text-slate-400'} /></div>
              <span className="font-bold">{t[lang].water}</span>
            </div>
            <span className="font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">20 {t[lang].coin}</span>
          </button>

          <button 
            onClick={() => onDonate(50)}
            disabled={coins < 50}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${coins >= 50 ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400 opacity-70'}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm"><Utensils size={24} className={coins >= 50 ? 'text-amber-500' : 'text-slate-400'} /></div>
              <span className="font-bold">{t[lang].food}</span>
            </div>
            <span className="font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">50 {t[lang].coin}</span>
          </button>

          <button 
            onClick={() => onDonate(100)}
            disabled={coins < 100}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${coins >= 100 ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 opacity-70'}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm"><Sprout size={24} className={coins >= 100 ? 'text-emerald-500' : 'text-slate-400'} /></div>
              <span className="font-bold">{t[lang].plantTree}</span>
            </div>
            <span className="font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">100 {t[lang].coin}</span>
          </button>
        </div>

        {coins < 20 && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={onStudyClick}
            className="mt-6 text-emerald-600 font-bold flex items-center justify-center gap-2 w-full p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <BookOpen size={20} />
            {t[lang].goToStudy}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function StudyScreen({ lessons, onStartGame, lang }: { lessons: Lesson[], onStartGame: (l: Lesson) => void, lang: Language }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="py-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <BookOpen className="text-emerald-500" />
        {t[lang].memorizationTasks}
      </h2>
      
      <div className="flex flex-col gap-4">
        {lessons.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 text-slate-500">
            {t[lang].noTasks}
          </div>
        ) : (
          lessons.map(lesson => (
            <div key={lesson.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{lesson.title}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-1">{lesson.text}</p>
              </div>
              <button 
                onClick={() => onStartGame(lesson)}
                className="bg-emerald-100 text-emerald-600 p-3 rounded-xl hover:bg-emerald-200 transition-colors"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// --- Game Modes Container ---
function GameScreen({ lesson, onComplete, onCancel, lang }: { lesson: Lesson, onComplete: (coins: number) => void, onCancel: () => void, lang: Language }) {
  const [mode, setMode] = useState<'blanks' | 'order' | 'recite'>('blanks');
  const [isSuccess, setIsSuccess] = useState(false);
  const [earned, setEarned] = useState(0);

  const handleSuccess = (coins: number) => {
    setEarned(coins);
    setIsSuccess(true);
    setTimeout(() => {
      onComplete(coins);
    }, 2500);
  };

  if (isSuccess) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center flex-1 py-8 text-center">
        <div className="text-8xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-green-500 mb-2">{t[lang].wellDone}</h2>
        <p className="text-slate-600 text-lg mb-8">{t[lang].taskCompleted}</p>
        <div className="flex items-center gap-2 bg-amber-100 text-amber-600 px-6 py-3 rounded-full font-bold text-xl">
          <Coins size={24} />
          <span>+{earned}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col h-full py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">{lesson.title}</h2>
        <button onClick={onCancel} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
          <X size={20} />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex bg-slate-200 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setMode('blanks')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'blanks' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
        >
          <LayoutGrid size={16} />
          {t[lang].blanks}
        </button>
        <button 
          onClick={() => setMode('order')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'order' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
        >
          <ListOrdered size={16} />
          {t[lang].order}
        </button>
        <button 
          onClick={() => setMode('recite')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'recite' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Mic size={16} />
          {t[lang].recite}
        </button>
      </div>

      {/* Render Active Game Mode */}
      <div className="flex-1 flex flex-col">
        {mode === 'blanks' && <BlanksGame lesson={lesson} onSuccess={() => handleSuccess(30)} lang={lang} />}
        {mode === 'order' && <OrderGame lesson={lesson} onSuccess={() => handleSuccess(40)} lang={lang} />}
        {mode === 'recite' && <ReciteGame lesson={lesson} onSuccess={() => handleSuccess(50)} lang={lang} />}
      </div>
    </motion.div>
  );
}

// --- Game Mode 1: Blanks ---
function BlanksGame({ lesson, onSuccess, lang }: { lesson: Lesson, onSuccess: () => void, lang: Language }) {
  const [words, setWords] = useState<{word: string, isHidden: boolean, id: number}[]>([]);
  const [options, setOptions] = useState<{word: string, id: number}[]>([]);
  const [filledBlanks, setFilledBlanks] = useState<Record<number, string>>({});

  useEffect(() => {
    const textWords = lesson.text.split(' ').filter(w => w.trim() !== '');
    const gameWords = textWords.map((word, index) => ({ 
      word, 
      isHidden: Math.random() > 0.6 && word.length > 1, 
      id: index 
    }));
    if (!gameWords.some(w => w.isHidden) && gameWords.length > 0) {
      gameWords[Math.floor(Math.random() * gameWords.length)].isHidden = true;
    }
    setWords(gameWords);
    setOptions(gameWords.filter(w => w.isHidden).map(w => ({ word: w.word, id: w.id })).sort(() => Math.random() - 0.5));
  }, [lesson]);

  const handleOptionClick = (option: {word: string, id: number}) => {
    const firstEmptyIndex = words.findIndex(w => w.isHidden && !filledBlanks[w.id]);
    if (firstEmptyIndex !== -1) {
      const targetId = words[firstEmptyIndex].id;
      setFilledBlanks(prev => ({ ...prev, [targetId]: option.word }));
      setOptions(prev => prev.filter(o => o.id !== option.id));
    }
  };

  const handleBlankClick = (id: number) => {
    if (filledBlanks[id]) {
      setOptions(prev => [...prev, { word: filledBlanks[id], id }]);
      const newBlanks = { ...filledBlanks };
      delete newBlanks[id];
      setFilledBlanks(newBlanks);
    }
  };

  const checkAnswer = () => {
    const correct = words.every(w => !w.isHidden || filledBlanks[w.id] === w.word);
    if (correct) onSuccess();
    else alert(t[lang].someErrorsTryAgain);
  };

  const isAllFilled = words.filter(w => w.isHidden).length === Object.keys(filledBlanks).length;

  return (
    <>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex-1">
        <p className="text-slate-500 text-sm mb-6 text-center">{t[lang].fillBlanksInstructions}</p>
        <div className="flex flex-wrap gap-2 leading-loose text-lg font-medium text-slate-800 justify-center">
          {words.map((w, i) => {
            if (!w.isHidden) return <span key={i} className="px-1">{w.word}</span>;
            const filledWord = filledBlanks[w.id];
            return (
              <button
                key={i} onClick={() => handleBlankClick(w.id)}
                className={`min-w-[80px] h-10 px-4 rounded-xl border-2 flex items-center justify-center transition-colors ${filledWord ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
              >
                {filledWord || '___'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-slate-100 p-4 rounded-3xl min-h-[120px]">
        <div className="flex flex-wrap gap-3 justify-center">
          <AnimatePresence>
            {options.map(opt => (
              <motion.button
                key={opt.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                onClick={() => handleOptionClick(opt)}
                className="bg-white px-5 py-3 rounded-xl shadow-sm font-bold text-emerald-600 border border-emerald-100 hover:bg-emerald-50 active:scale-95 transition-all"
              >
                {opt.word}
              </motion.button>
            ))}
          </AnimatePresence>
          {options.length === 0 && isAllFilled && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={checkAnswer}
              className="w-full bg-green-500 text-white font-bold text-lg py-4 rounded-2xl shadow-md shadow-green-200 flex items-center justify-center gap-2 mt-2"
            >
              <Check size={24} /> {t[lang].checkAnswer}
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
}

// --- Game Mode 2: Ordering ---
function OrderGame({ lesson, onSuccess, lang }: { lesson: Lesson, onSuccess: () => void, lang: Language }) {
  const [chunks, setChunks] = useState<{id: number, text: string}[]>([]);
  const [selected, setSelected] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    const words = lesson.text.split(' ').filter(w => w.trim() !== '');
    const newChunks = [];
    // Split into chunks of 2 words for easier ordering
    for(let i=0; i<words.length; i+=2) {
      newChunks.push({ id: i, text: words.slice(i, i+2).join(' ') });
    }
    setChunks(newChunks.sort(() => Math.random() - 0.5));
    setSelected([]);
  }, [lesson]);

  const selectChunk = (chunk: {id: number, text: string}) => {
    setSelected([...selected, chunk]);
    setChunks(chunks.filter(c => c.id !== chunk.id));
  };

  const deselectChunk = (chunk: {id: number, text: string}) => {
    setChunks([...chunks, chunk]);
    setSelected(selected.filter(c => c.id !== chunk.id));
  };

  const checkAnswer = () => {
    const currentText = selected.map(c => c.text).join(' ');
    if (currentText === lesson.text) onSuccess();
    else alert(t[lang].incorrectOrderTryAgain);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex-1 flex flex-col">
        <p className="text-slate-500 text-sm mb-4 text-center">{t[lang].orderInstructions}</p>
        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-wrap content-start gap-2 bg-slate-50">
          <AnimatePresence>
            {selected.map(chunk => (
              <motion.button
                key={chunk.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={() => deselectChunk(chunk)}
                className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold shadow-sm"
              >
                {chunk.text}
              </motion.button>
            ))}
            {selected.length === 0 && <span className="text-slate-400 w-full text-center mt-4">{t[lang].clickSentencesToOrder}</span>}
          </AnimatePresence>
        </div>
      </div>
      <div className="bg-slate-100 p-4 rounded-3xl min-h-[120px]">
        <div className="flex flex-wrap gap-2 justify-center">
          <AnimatePresence>
            {chunks.map(chunk => (
              <motion.button
                key={chunk.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={() => selectChunk(chunk)}
                className="bg-white px-4 py-3 rounded-xl shadow-sm font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95"
              >
                {chunk.text}
              </motion.button>
            ))}
          </AnimatePresence>
          {chunks.length === 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={checkAnswer}
              className="w-full bg-green-500 text-white font-bold text-lg py-4 rounded-2xl shadow-md shadow-green-200 flex items-center justify-center gap-2 mt-2"
            >
              <Check size={24} /> {t[lang].checkOrder}
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
}

// --- Game Mode 3: Recitation (Voice, Write, Self) ---
function ReciteGame({ lesson, onSuccess, lang }: { lesson: Lesson, onSuccess: () => void, lang: Language }) {
  const [subMode, setSubMode] = useState<'voice' | 'write' | 'self'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [writeText, setWriteText] = useState('');
  const [isSelfRevealed, setIsSelfRevealed] = useState(false);
  const [result, setResult] = useState<{ score: number, matchedWords: boolean[], originalWords: string[], mistakes?: string[] } | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const currentSessionTranscriptRef = useRef('');

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = lang.includes('-') ? lang : (lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US');
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let sessionString = '';
        for (let i = 0; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript.trim();
          if (!chunk) continue;

          if (i > 0) {
            const prevChunk = event.results[i-1][0].transcript.trim();
            if (prevChunk && chunk.startsWith(prevChunk)) {
              const newPart = chunk.substring(prevChunk.length).trim();
              if (newPart) sessionString += newPart + ' ';
            } else {
              sessionString += chunk + ' ';
            }
          } else {
            sessionString += chunk + ' ';
          }
        }
        currentSessionTranscriptRef.current = sessionString.trim();
        setTranscript((fullTranscriptRef.current + ' ' + currentSessionTranscriptRef.current).trim());
      };

      rec.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        if (event.error === 'not-allowed') {
          setError(t[lang].micPermission);
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        if (isRecordingRef.current) {
          if (currentSessionTranscriptRef.current) {
            fullTranscriptRef.current = (fullTranscriptRef.current + ' ' + currentSessionTranscriptRef.current).trim();
            currentSessionTranscriptRef.current = '';
          }
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { recognitionRef.current?.start(); } catch (e) {}
            }
          }, 300);
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = rec;
      return () => {
        isRecordingRef.current = false;
        rec.onend = null;
        rec.onerror = null;
        try { rec.stop(); } catch (e) {}
      };
    } else {
      if (subMode === 'voice') setError(t[lang].speechNotSupported);
    }
  }, [lang, subMode]);

  const toggleRecording = () => {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      fullTranscriptRef.current = '';
      currentSessionTranscriptRef.current = '';
      setTranscript('');
      setResult(null);
      setError('');
      
      isRecordingRef.current = true;
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const checkRecitation = async (textToCheck: string) => {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current?.stop();
    }

    const originalWords = lesson.text.split(/\s+/).filter(w => w.trim() !== '' && w !== '۝');
    const normalizedOriginal = originalWords.map(w => normalizeArabic(w));
    const normalizedTranscript = normalizeArabic(textToCheck).split(/\s+/).filter(w => w);

    if (normalizedTranscript.length === 0) {
       setError(t[lang].didNotHear);
       return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // --- LOCAL COMPARISON LOGIC (Strict Word Alignment) ---
      const n = normalizedOriginal.length;
      const m = normalizedTranscript.length;
      const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

      // Initialize DP table
      for (let i = 0; i <= n; i++) dp[i][0] = i;
      for (let j = 0; j <= m; j++) dp[0][j] = j;

      // Fill DP table
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const cost = normalizedOriginal[i - 1] === normalizedTranscript[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,       // deletion (word missed)
            dp[i][j - 1] + 1,       // insertion (extra word said)
            dp[i - 1][j - 1] + cost // substitution (wrong word)
          );
        }
      }

      // Backtrack to find exactly which original words were matched in the correct order
      const matchedWords = new Array(n).fill(false);
      const rawMistakes: { type: 'sub'|'del'|'ins', origIdx: number, transIdx: number }[] = [];
      let i = n;
      let j = m;

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && normalizedOriginal[i - 1] === normalizedTranscript[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
          // Exact match
          matchedWords[i - 1] = true;
          i--;
          j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
          // Substitution
          rawMistakes.unshift({ type: 'sub', origIdx: i - 1, transIdx: j - 1 });
          i--;
          j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
          // Deletion (missed word)
          rawMistakes.unshift({ type: 'del', origIdx: i - 1, transIdx: -1 });
          i--;
        } else {
          // Insertion (extra word)
          rawMistakes.unshift({ type: 'ins', origIdx: i - 1, transIdx: j - 1 });
          j--;
        }
      }

      // Process rawMistakes to generate human-readable grouped messages
      const mistakes: string[] = [];
      let currentGroup: any[] = [];
      
      const flushGroup = () => {
        if (currentGroup.length === 0) return;
        const type = currentGroup[0].type;
        const isAr = lang.startsWith('ar');
        
        if (type === 'del') {
          const words = currentGroup.map(m => originalWords[m.origIdx]).join(' ');
          mistakes.push(isAr ? `نقصان في القراءة (كلمة/آية): "${words}"` : `Missing words: "${words}"`);
        } else if (type === 'ins') {
          const addedWords = currentGroup.map(m => normalizedTranscript[m.transIdx]).join(' ');
          const afterIdx = currentGroup[0].origIdx;
          const afterWord = isAr 
            ? (afterIdx >= 0 ? `بعد كلمة "${originalWords[afterIdx]}"` : "في بداية القراءة")
            : (afterIdx >= 0 ? `after word "${originalWords[afterIdx]}"` : "at the beginning");
          mistakes.push(isAr ? `زيادة في القراءة: قرأت "${addedWords}" ${afterWord}` : `Extra words: you said "${addedWords}" ${afterWord}`);
        } else if (type === 'sub') {
          currentGroup.forEach(m => {
            const originalWord = originalWords[m.origIdx];
            const transcriptWord = normalizedTranscript[m.transIdx];
            const existsElsewhere = normalizedOriginal.includes(transcriptWord);
            
            if (existsElsewhere) {
              mistakes.push(isAr 
                ? `إخلال بالترتيب (كلمة في غير موضعها): قرأت "${transcriptWord}" بدلاً من "${originalWord}"`
                : `Order violation (word out of place): you said "${transcriptWord}" instead of "${originalWord}"`);
            } else {
              mistakes.push(isAr 
                ? `خطأ في النطق (كلمة غير صحيحة): قرأت "${transcriptWord}" بدلاً من "${originalWord}"`
                : `Pronunciation error (incorrect word): you said "${transcriptWord}" instead of "${originalWord}"`);
            }
          });
        }
        currentGroup = [];
      };

      for (const m of rawMistakes) {
        if (currentGroup.length === 0 || currentGroup[currentGroup.length - 1].type === m.type) {
          currentGroup.push(m);
        } else {
          flushGroup();
          currentGroup.push(m);
        }
      }
      flushGroup();

      // Calculate strict score
      const maxDistance = Math.max(n, m);
      const distance = dp[n][m];
      // If maxDistance is 0, score is 100. Otherwise, calculate percentage.
      const score = maxDistance === 0 ? 100 : Math.max(0, Math.round(((maxDistance - distance) / maxDistance) * 100));
      
      setResult({ score, matchedWords, originalWords, mistakes });
    } catch (e: any) {
      console.error("Analysis error:", e);
      setError(t[lang].errorAnalyzingRecitation || "Error analyzing recitation. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-8">
      {/* Sub-Mode Selector */}
      <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
        <button 
          onClick={() => { setSubMode('voice'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${subMode === 'voice' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}
        >
          <Mic size={18} />
          {t[lang].voice}
        </button>
        <button 
          onClick={() => { setSubMode('write'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${subMode === 'write' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}
        >
          <Edit3 size={18} />
          {t[lang].write}
        </button>
        <button 
          onClick={() => { setSubMode('self'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${subMode === 'self' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}
        >
          <Eye size={18} />
          {t[lang].self}
        </button>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-lg border border-slate-100 flex-1 flex flex-col items-center">
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">{lang.startsWith('ar') ? "جاري التحليل..." : "Analyzing..."}</p>
          </div>
        )}

        {!isAnalyzing && !result && (
          <>
            {subMode === 'voice' && (
              <>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${isRecording ? 'bg-red-100 text-red-500 animate-pulse scale-110' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Mic size={40} />
                </div>
                <p className="text-slate-500 text-center mb-8 font-medium">{isRecording ? t[lang].listening : t[lang].clickMicToStart}</p>
                <div className="w-full bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 min-h-[120px] mb-8 text-center">
                  <p className="text-xl leading-relaxed text-slate-700 italic">{transcript || "..."}</p>
                </div>
                {error && <p className="text-red-500 text-sm mb-4 font-bold">{error}</p>}
                <div className="flex gap-4 w-full">
                  <button onClick={toggleRecording} className={`flex-1 py-5 rounded-2xl font-bold text-lg shadow-lg transition-all focus:ring-4 outline-none ${isRecording ? 'bg-red-500 text-white shadow-red-100 focus:ring-red-300' : 'bg-emerald-500 text-white shadow-emerald-100 focus:ring-emerald-300'}`}>
                    {isRecording ? t[lang].stop : t[lang].start}
                  </button>
                  {transcript && (
                    <button onClick={() => checkRecitation(transcript)} className="flex-1 bg-blue-500 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 outline-none transition-all flex items-center justify-center gap-2">
                      <Check /> {t[lang].check}
                    </button>
                  )}
                </div>
              </>
            )}

            {subMode === 'write' && (
              <div className="w-full flex flex-col">
                <textarea 
                  value={writeText} onChange={(e) => setWriteText(e.target.value)}
                  placeholder={t[lang].typeHere}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[180px] text-xl font-arabic mb-6 resize-none"
                  dir="auto"
                />
                <button onClick={() => checkRecitation(writeText)} disabled={!writeText.trim()} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-300 outline-none transition-all flex items-center justify-center gap-2">
                  <Check /> {t[lang].check}
                </button>
              </div>
            )}

            {subMode === 'self' && (
              <div className="w-full flex flex-col items-center">
                <div className="w-full bg-emerald-50/50 p-8 rounded-[32px] border-2 border-emerald-100/50 mb-8 min-h-[160px] flex items-center justify-center relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isSelfRevealed ? (
                      <motion.p key="revealed" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} className="text-2xl sm:text-3xl leading-relaxed font-arabic text-slate-800 text-center">
                        {lesson.text}
                      </motion.p>
                    ) : (
                      <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(i => <div key={i} className="w-3 h-3 bg-emerald-200 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
                        </div>
                        <p className="text-emerald-600 font-bold">{t[lang].reciteThenReveal}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setIsSelfRevealed(!isSelfRevealed)} className="flex-1 bg-slate-100 text-slate-700 py-5 rounded-2xl font-bold text-lg border-2 border-slate-200 hover:bg-slate-200 focus:ring-4 focus:ring-slate-300 outline-none transition-all flex items-center justify-center gap-2">
                    {isSelfRevealed ? <EyeOff /> : <Eye />} {isSelfRevealed ? t[lang].hideAyah : t[lang].showAyah}
                  </button>
                  <button onClick={() => onSuccess()} className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-300 outline-none transition-all flex items-center justify-center gap-2">
                    <Check /> {t[lang].wellDone}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col items-center">
            <div className="mb-6 text-center">
              <div className="text-5xl mb-2">{result.score === 100 ? '🌟' : '💪'}</div>
              <h3 className={`text-2xl font-bold ${result.score >= 80 ? 'text-green-500' : 'text-amber-500'}`}>
                {t[lang].resultScore.replace('{score}', String(result.score))}
              </h3>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 w-full text-right leading-loose text-xl font-medium">
              {result.originalWords.map((word, index) => (
                <span key={index} className={`inline-block mx-1 px-1 rounded ${result.matchedWords[index] ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50 underline decoration-red-300'}`}>
                  {word}
                </span>
              ))}
            </div>
            {result.mistakes && result.mistakes.length > 0 && (
              <div className="w-full text-right mb-8 bg-red-50 p-4 rounded-2xl border border-red-100">
                <h4 className="font-bold text-red-700 mb-3 text-lg flex items-center gap-2 justify-end">
                  {lang.startsWith('ar') ? 'ملاحظات:' : 'Notes:'} <AlertCircle size={20} />
                </h4>
                <ul className="list-disc list-inside text-red-600 space-y-1">
                  {result.mistakes.map((mistake, idx) => <li key={idx} className="text-base">{mistake}</li>)}
                </ul>
              </div>
            )}
            <div className="flex gap-3 w-full">
              <button onClick={() => { setResult(null); setTranscript(''); setWriteText(''); setIsSelfRevealed(false); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 hover:bg-slate-200">
                <RefreshCw size={20} /> {t[lang].reciteAgain}
              </button>
              {result.score >= 80 && (
                <button onClick={onSuccess} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-md shadow-green-200">
                  <Coins size={20} /> {t[lang].claimReward}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// --- Parent Screen (Dashboard) ---
function ParentScreen({ lessons, setLessons, lang, setLang, isPremium, onUpgrade, setIsRemoteModalOpen }: { 
  lessons: Lesson[], 
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>, 
  lang: Language, 
  setLang: React.Dispatch<React.SetStateAction<Language>>,
  isPremium: boolean,
  onUpgrade: () => void,
  setIsRemoteModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [addMode, setAddMode] = useState<'custom' | 'quran'>('quran');
  
  // Custom text state
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  // Quran state
  const [surahs, setSurahs] = useState<any[]>(QURAN_SURAHS);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(7);
  const [isLoadingQuran, setIsLoadingQuran] = useState(false);

  const handleAddCustom = () => {
    if (!isPremium && lessons.length >= 5) {
      onUpgrade();
      return;
    }
    if (newTitle.trim() && newText.trim()) {
      setLessons([...lessons, { id: Date.now().toString(), title: newTitle, text: newText, type: 'custom' }]);
      setNewTitle('');
      setNewText('');
    }
  };

  const handleAddQuran = async () => {
    if (!isPremium && lessons.length >= 5) {
      onUpgrade();
      return;
    }
    setIsLoadingQuran(true);
    try {
      const data = await fetchAyahs(selectedSurah, startAyah, endAyah);
      const selectedAyahs = data.ayahs;
      
      // Join ayahs with the beautiful end-of-ayah symbol
      let text = selectedAyahs.map((a: any) => a.text).join(' ۝ ') + ' ۝';
      const surahName = data.surahName;
      const title = `${surahName} ${t[lang].ayahsRange.replace('{start}', String(startAyah)).replace('{end}', String(endAyah))}`;
      
      setLessons([...lessons, { id: Date.now().toString(), title, text, type: 'quran' }]);
      alert(t[lang].ayahsAddedSuccessfully);
    } catch (e) {
      alert(t[lang].errorFetchingAyahsCheckInternet);
    }
    setIsLoadingQuran(false);
  };

  const handleDelete = (id: string) => {
    setLessons(lessons.filter(l => l.id !== id));
  };

  const activeSurah = surahs.find(s => s.number === selectedSurah);
  const maxAyahs = activeSurah ? activeSurah.numberOfAyahs : 1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Settings className="text-slate-500" />
        {t[lang].parentDashboard}
      </h2>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <ImageIcon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{t[lang].remoteUploadTitle}</h3>
            <p className="text-sm text-slate-500">{t[lang].connectPhone}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsRemoteModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          {t[lang].connectPhone}
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider mb-1">{t[lang].currentPlan}</h3>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-black ${isPremium ? 'text-emerald-600' : 'text-slate-800'}`}>
              {isPremium ? t[lang].premium : t[lang].free}
            </span>
            {isPremium && <Star size={18} className="text-amber-400" fill="currentColor" />}
          </div>
        </div>
        {!isPremium && (
          <button 
            onClick={onUpgrade}
            className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all"
          >
            {t[lang].upgrade}
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Languages className="text-emerald-500" size={20} />
          {t[lang].textLanguage}
        </h3>
        <CustomSelect 
          value={lang}
          onChange={(val) => setLang(val)}
          options={APP_LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
        />
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-8">
        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button 
            onClick={() => setAddMode('quran')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${addMode === 'quran' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Book size={16} />
            {t[lang].quran}
          </button>
          <button 
            onClick={() => setAddMode('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${addMode === 'custom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Edit3 size={16} />
            {t[lang].customTexts}
          </button>
        </div>

        {addMode === 'custom' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-bold text-lg mb-4">{t[lang].addNewTask}</h3>
            <input 
              type="text" 
              placeholder={t[lang].taskTitle}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea 
              placeholder={t[lang].taskText}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <button 
              onClick={handleAddCustom}
              disabled={!newTitle.trim() || !newText.trim()}
              className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={20} />
              {t[lang].add}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-bold text-lg mb-4">{t[lang].chooseSurah}</h3>
            
            {surahs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin mb-2 text-emerald-500" size={32} />
                <p>{t[lang].loadingSurahs}</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-bold text-slate-600 mb-1">{t[lang].chooseSurah}:</label>
                  <CustomSelect 
                    value={selectedSurah}
                    onChange={(val) => {
                      const num = parseInt(val);
                      setSelectedSurah(num);
                      setStartAyah(1);
                      const surah = surahs.find(s => s.number === num);
                      setEndAyah(surah ? surah.numberOfAyahs : 1);
                    }}
                    options={surahs.map(s => ({ value: s.number, label: `${s.number}. ${s.name}` }))}
                  />
                </div>
                
                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-600 mb-1">{t[lang].fromAyah}:</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={maxAyahs}
                      value={startAyah}
                      onChange={(e) => setStartAyah(Math.min(maxAyahs, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-600 mb-1">{t[lang].toAyah}:</label>
                    <input 
                      type="number" 
                      min={startAyah} 
                      max={maxAyahs}
                      value={endAyah}
                      onChange={(e) => setEndAyah(Math.min(maxAyahs, Math.max(startAyah, parseInt(e.target.value) || startAyah)))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddQuran}
                  disabled={isLoadingQuran}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                >
                  {isLoadingQuran ? <Loader2 className="animate-spin" size={20} /> : <Book size={20} />}
                  {isLoadingQuran ? '...' : t[lang].addAyahs}
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>

      <h3 className="font-bold text-lg mb-4 text-slate-700">{t[lang].currentTasks}</h3>
      <div className="flex flex-col gap-3">
        {lessons.map(lesson => (
          <div key={lesson.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-800">{lesson.title}</span>
            <button onClick={() => handleDelete(lesson.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        ))}
        {lessons.length === 0 && (
          <p className="text-center text-slate-400 py-4">{t[lang].noTasks}</p>
        )}
      </div>
    </motion.div>
  );
}

