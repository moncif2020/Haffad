import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, Download, CheckCircle2, Search, X, Headphones, Play, Loader2, Square, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import quranMetadata from '../data/quran-metadata.json';
import { useAudio } from '../AudioContext';
import { fetchAyahs, getAudioUrl, QURAN_SURAHS } from '../lib/quran';
import { CustomSelect } from './CustomSelect';
import { QuranSearchInline } from './QuranSearchInline';

const MushafHeader = ({ surahName, surahEnglish, juz, lang }: { surahName: string, surahEnglish: string, juz: number, lang: string }) => (
  <div className="w-full flex items-center justify-between px-4 py-2 bg-transparent pointer-events-none select-none z-max" dir="rtl">
    <div className="flex flex-col items-center portrait:items-start min-w-[80px]">
      <span className="text-[#8b6b4e] font-bold text-sm sm:text-lg font-sans">{surahEnglish}</span>
    </div>
    
    <div className="relative flex items-center justify-center">
      {/* Decorative center frame */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
         <svg width="280" height="60" viewBox="0 0 280 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[180px] sm:w-[280px] h-auto">
            <path d="M10 30C10 15 25 2 60 2H220C255 2 270 15 270 30C270 45 255 58 220 58H60C25 58 10 45 10 30Z" stroke="#8b6b4e" strokeWidth="1"/>
            <path d="M30 30C30 20 40 10 60 10H220C240 10 250 20 250 30C250 40 240 50 220 50H60C40 50 30 40 30 30Z" stroke="#8b6b4e" strokeWidth="0.5"/>
            <circle cx="20" cy="30" r="4" stroke="#8b6b4e" strokeWidth="1"/>
            <circle cx="260" cy="30" r="4" stroke="#8b6b4e" strokeWidth="1"/>
         </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-[#8b6b4e] font-arabic font-black text-xl sm:text-2xl mt-1">سورة {surahName}</span>
      </div>
    </div>

    <div className="flex flex-col items-center portrait:items-end min-w-[80px]">
      <span className="text-[#8b6b4e] font-bold text-sm sm:text-lg font-arabic">الجزء {juz}</span>
      <span className="text-[10px] text-[#8b6b4e]/60 font-bold -mt-1 uppercase">{lang === 'ar' ? 'الحزب' : 'Part'} {juz * 2}</span>
    </div>
  </div>
);

const MushafFooter = ({ page }: { page: number }) => (
  <div className="w-full flex items-center justify-center py-4 bg-transparent pointer-events-none select-none z-max">
    <div className="relative flex items-center justify-center">
      <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
        <path d="M10 20C10 10 20 2 50 2C80 2 90 10 90 20C90 30 80 38 50 38C20 38 10 30 10 20Z" stroke="#8b6b4e" strokeWidth="1.5"/>
        <circle cx="5" cy="20" r="2" fill="#8b6b4e"/>
        <circle cx="95" cy="20" r="2" fill="#8b6b4e"/>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[#8b6b4e] font-black text-lg sm:text-xl font-sans mt-0.5">{page}</span>
    </div>
  </div>
);

interface MushafViewerProps {
  initialPage?: number;
  onClose?: () => void;
  lang?: string;
}

export function MushafViewer({ initialPage = 1, onClose, lang = 'ar' }: MushafViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isFullyDownloaded, setIsFullyDownloaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedAyah, setSelectedAyah] = useState(1);
  const [isTextSearchOpen, setIsTextSearchOpen] = useState(false);
  const [focusedAyah, setFocusedAyah] = useState<{surah: number, ayah: number} | null>(null);

  const totalPages = 604;

  const getPageMetadata = (page: number) => {
    // Find the first surah that appears on this page
    const surah = quranMetadata.find(s => s.ayahPages.includes(page));
    
    // Calculate Juz (roughly based on standard page boundaries)
    // Most Juz are 20 pages, Juz 1 is 21, Juz 30 is 23
    let juz = 1;
    if (page > 581) juz = 30;
    else if (page > 21) juz = Math.ceil((page - 21) / 20) + 1;
    else juz = 1;

    return {
      surahName: surah ? surah.name.replace('سُورَةُ ', '') : '',
      surahEnglish: surah ? QURAN_SURAHS[surah.number - 1]?.englishName || '' : '',
      juz: juz
    };
  };

  const pageMeta = getPageMetadata(currentPage);

  useEffect(() => {
    // Check if all pages are downloaded
    const checkDownloadStatus = async () => {
      try {
        const cache = await caches.open('quran-pages');
        const keys = await cache.keys();
        // Count how many pages are cached
        const cachedPagesCount = keys.filter(req => req.url.includes('quran-pages-images')).length;
        if (cachedPagesCount >= totalPages - 10) { // Allow small margin of error
          setIsFullyDownloaded(true);
        }
      } catch (e) {
        console.error("Error checking cache status", e);
      }
    };
    checkDownloadStatus();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const loadImage = async () => {
      setIsLoading(true);
      const url = `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${currentPage}.jpg`;
      
      try {
        const cache = await caches.open('quran-pages');
        const cachedRes = await cache.match(url);
        
        if (cachedRes) {
          const blob = await cachedRes.blob();
          if (isMounted) {
            currentBlobUrl = URL.createObjectURL(blob);
            setImageSrc(currentBlobUrl);
            setIsLoading(false);
          }
        } else {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) {
            const resClone = res.clone();
            await cache.put(url, resClone);
            const blob = await res.blob();
            if (isMounted) {
              currentBlobUrl = URL.createObjectURL(blob);
              setImageSrc(currentBlobUrl);
              setIsLoading(false);
            }
          } else {
            if (isMounted) setImageSrc(url);
          }
        }
      } catch (e) {
        if (isMounted) setImageSrc(url);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const downloadAllPages = async () => {
    if (isFullyDownloaded) return;
    
    try {
      setDownloadProgress(0);
      const cache = await caches.open('quran-pages');
      let downloaded = 0;
      const batchSize = 3; // Download in smaller batches to avoid rate limits
      
      const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) return res;
            if (i === retries - 1) throw new Error(`Status: ${res.status}`);
          } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        throw new Error('Unreachable');
      };

      for (let i = 1; i <= totalPages; i += batchSize) {
        const promises = [];
        for (let j = 0; j < batchSize && i + j <= totalPages; j++) {
          const pageNum = i + j;
          const url = `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${pageNum}.jpg`;
          
          promises.push(
            cache.match(url).then(async (cachedRes) => {
              if (!cachedRes) {
                try {
                  const res = await fetchWithRetry(url);
                  await cache.put(url, res);
                } catch (e) {
                  console.error(`Failed to download page ${pageNum}`, e);
                }
              }
              downloaded++;
              setDownloadProgress(Math.round((downloaded / totalPages) * 100));
            })
          );
        }
        await Promise.all(promises);
        // Add a small delay between batches to prevent network congestion
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setDownloadProgress(null);
      setIsFullyDownloaded(true);
    } catch (error) {
      console.error('Error downloading pages:', error);
      setDownloadProgress(null);
      alert('حدث خطأ أثناء تحميل الصفحات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
    }
  };

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [mouseStartY, setMouseStartY] = useState<number | null>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && isSearchOpen) {
          handleSearch();
        }
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(!isFullscreen);
      } else if (e.key === 's' || e.key === 'S') {
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isSearchOpen, isFullscreen, selectedSurah, selectedAyah]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Optional: can be used to prevent default behavior if needed
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;

    // Only trigger horizontal swipe if horizontal movement is greater than vertical movement
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        handlePrevPage();
      } else {
        handleNextPage();
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
    setMouseStartY(e.clientY);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX === null || mouseStartY === null) return;
    
    const mouseEndX = e.clientX;
    const mouseEndY = e.clientY;
    
    const distanceX = mouseStartX - mouseEndX;
    const distanceY = mouseStartY - mouseEndY;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        handlePrevPage();
      } else {
        handleNextPage();
      }
    }
    
    setMouseStartX(null);
    setMouseStartY(null);
  };

  const onMouseLeave = () => {
    setMouseStartX(null);
    setMouseStartY(null);
  };

  const handleSearch = () => {
    const surahData = quranMetadata.find(s => s.number === selectedSurah);
    if (surahData) {
      // Ayah index is 0-based, so ayah 1 is at index 0
      const page = surahData.ayahPages[selectedAyah - 1];
      if (page) {
        setCurrentPage(page);
        setIsSearchOpen(false);
      }
    }
  };

  const listenToSurah = async (surahNum: number) => {
    setIsSearchOpen(false);
    setIsPageLoading(true);
    try {
      const surahData = quranMetadata.find(s => s.number === surahNum);
      if (!surahData) return;

      // Jump to the first page of the surah
      const firstPage = surahData.ayahPages[0];
      setCurrentPage(firstPage);

      const data = await fetchAyahs(surahNum, 1, surahData.numberOfAyahs);
      const ayahs = data.ayahs;

      const newPlaylist: any[] = [];
      for (let j = 0; j < rangeRepetitions; j++) {
        ayahs.forEach((ayah: any) => {
          for (let i = 0; i < repetitions; i++) {
            newPlaylist.push({
              url: getAudioUrl(reciter, surahNum, ayah.numberInSurah),
              text: ayah.text,
              surah: surahNum,
              ayah: ayah.numberInSurah
            });
          }
        });
      }

      startNewPlaylist(newPlaylist, 0);
    } catch (e) {
      console.error("Failed to start surah audio", e);
    } finally {
      setIsPageLoading(false);
    }
  };

  const currentSurahData = quranMetadata.find(s => s.number === selectedSurah);

  const { 
    startNewPlaylist, 
    isPlaying, 
    isLoading: isAudioLoading,
    reciter,
    repetitions,
    rangeRepetitions,
    stop: stopAudio,
    playlist,
    currentTrackIndex
  } = useAudio();

  // Sync Mushaf with playing audio
  useEffect(() => {
    if (isPlaying && currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
      const currentTrack = playlist[currentTrackIndex];
      if (currentTrack.surah && currentTrack.ayah) {
        const surahData = quranMetadata.find(s => s.number === currentTrack.surah);
        if (surahData) {
          const page = surahData.ayahPages[currentTrack.ayah - 1];
          if (page && page !== currentPage) {
            setCurrentPage(page);
          }
        }
      }
    }
  }, [isPlaying, currentTrackIndex, playlist, currentPage]);

  const [isPageLoading, setIsPageLoading] = useState(false);

  const listenToPage = async (startPage?: number, ayahToFocus?: {surah: number, ayah: number}) => {
    setIsPageLoading(true);
    try {
      const targetPage = typeof startPage === 'number' ? startPage : currentPage;
      const targetFocus = ayahToFocus && typeof (ayahToFocus as any).surah === 'number' ? ayahToFocus : focusedAyah;

      // Find all ayahs starting from this page onwards (limit to 50 pages for performance)
      const pageAyahs: {surah: number, ayah: number}[] = [];
      const endPage = Math.min(targetPage + 50, totalPages);
      
      quranMetadata.forEach(surah => {
        surah.ayahPages.forEach((p, index) => {
          if (p >= targetPage && p <= endPage) {
            pageAyahs.push({ surah: surah.number, ayah: index + 1 });
          }
        });
      });

      if (pageAyahs.length === 0) {
        setIsPageLoading(false);
        return;
      }

      // Check if we have a focused ayah on this page to start from
      let startIndex = 0;
      if (targetFocus) {
        const foundIndex = pageAyahs.findIndex(a => a.surah === targetFocus.surah && a.ayah === targetFocus.ayah);
        if (foundIndex !== -1) {
          startIndex = foundIndex;
        }
      }

      // Group by surah to fetch text
      const surahsToFetch = Array.from(new Set(pageAyahs.map(a => a.surah)));
      
      // Fetch all needed surahs in parallel for better performance
      const surahDataResults = await Promise.all(
        surahsToFetch.map(async (surahNum) => {
          const ayahsInSurah = pageAyahs.filter(a => a.surah === surahNum);
          const minAyah = Math.min(...ayahsInSurah.map(a => a.ayah));
          const maxAyah = Math.max(...ayahsInSurah.map(a => a.ayah));
          
          const data = await fetchAyahs(surahNum, minAyah, maxAyah);
          return data.ayahs.map((a: any) => ({
            ...a,
            surahNum
          }));
        })
      );

      const allAyahsData = surahDataResults.flat();

      const newPlaylist: any[] = [];
      for (let j = 0; j < rangeRepetitions; j++) {
        allAyahsData.forEach(ayah => {
          for (let i = 0; i < repetitions; i++) {
            newPlaylist.push({
              url: getAudioUrl(reciter, ayah.surahNum, ayah.numberInSurah),
              text: ayah.text,
              surah: ayah.surahNum,
              ayah: ayah.numberInSurah
            });
          }
        });
      }

      // Adjust the start index to account for repetitions if necessary
      // but usually we just want to jump to the first instance
      const adjustedStartIndex = startIndex * repetitions;

      startNewPlaylist(newPlaylist, adjustedStartIndex);
      setFocusedAyah(null); // Clear focus after starting
    } catch (e) {
      console.error("Failed to start page audio", e);
    } finally {
      setIsPageLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full bg-[#f4f1ea] dark:bg-[#0f1113] p-2 sm:p-4 relative touch-pan-y select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[9999] bg-[#f4f1ea] flex flex-col items-center justify-center p-0"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close Button at Top Right with Emerald Glow - Adjusted position to clear text */}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            className="absolute top-0.5 right-0.5 z-[10001] p-1.5 sm:p-2 bg-white/95 backdrop-blur-md rounded-full text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] border-2 border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.8)] transition-all active:scale-90 group overflow-hidden"
            aria-label="إغلاق"
          >
            <div className="absolute inset-0 bg-emerald-400/15 animate-pulse"></div>
            <X size={24} className="relative z-10 font-bold" />
          </button>

          <div className="flex-1 w-full h-full landscape:h-auto relative overflow-hidden landscape:overflow-y-auto flex flex-col items-center justify-between landscape:justify-start p-0">
            {/* Header Content */}
            <MushafHeader surahName={pageMeta.surahName} surahEnglish={pageMeta.surahEnglish} juz={pageMeta.juz} lang={lang} />

            <div className="flex-1 w-full flex items-center justify-center relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={`صفحة ${currentPage} من المصحف`}
                  className="w-full h-auto portrait:w-auto portrait:max-h-[85vh] object-contain animate-in fade-in zoom-in duration-300 shadow-[0_0_50px_rgba(0,196,140,0.1)]"
                  dir="rtl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Footer Content */}
            <MushafFooter page={currentPage} />
          </div>
          
          {/* Navigation Overlay for Fullscreen */}
          <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}>
             <div className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-emerald-600 shadow-lg border border-emerald-100 opacity-20 group-hover/nav:opacity-100 transition-all active:scale-90">
                <ChevronLeft size={32} />
             </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handleNextPage(); }}>
             <div className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-emerald-600 shadow-lg border border-emerald-100 opacity-20 group-hover/nav:opacity-100 transition-all active:scale-90">
                <ChevronRight size={32} />
             </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-300 border dark:border-slate-800 h-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Search size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-arabic text-gray-800 dark:text-white leading-tight">
                    {lang === 'ar' ? 'البحث الذكي' : 'Smart Search'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {lang === 'ar' ? 'سورة، رقم، أو آية' : 'Surah, Number, or Verse'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-all outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden h-full">
              <QuranSearchInline 
                lang={lang}
                onSelect={(surahNum, ayahNum, action) => {
                  const surahMeta = quranMetadata.find(s => s.number === surahNum);
                  if (surahMeta && surahMeta.ayahPages && surahMeta.ayahPages[ayahNum - 1]) {
                    const targetPage = surahMeta.ayahPages[ayahNum - 1];
                    setCurrentPage(targetPage);
                    setFocusedAyah({ surah: surahNum, ayah: ayahNum });
                    setIsSearchOpen(false);

                    if (action === 'play') {
                       listenToPage(targetPage, { surah: surahNum, ayah: ayahNum });
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between w-full max-w-7xl mb-4 bg-white dark:bg-slate-900 p-1 sm:p-5 rounded-[24px] shadow-md border border-gray-100 dark:border-slate-800" dir="rtl">
        <div className="flex items-center gap-0.5 sm:gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 sm:p-3.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
              title="خروج"
            >
              <X className="w-5 h-5 sm:w-8 sm:h-8" />
            </button>
          )}
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-1 sm:p-3.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-6 h-6 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
          </button>
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-1 sm:p-3.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
            title="بحث عن سورة أو آية"
          >
            <Search className="w-5 h-5 sm:w-8 sm:h-8" />
          </button>
 
          <button
            onClick={isPlaying ? stopAudio : () => listenToPage()}
            disabled={isPageLoading}
            className={`p-1 sm:p-3.5 rounded-xl transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${isPageLoading || isAudioLoading || isPlaying ? 'text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
            title={isPlaying ? (lang === 'ar' ? "إيقاف الاستماع" : "Stop listening") : (lang === 'ar' ? "الاستماع من هذه الصفحة" : "Listen from this page")}
          >
            {isPageLoading || isAudioLoading ? (
              <Loader2 className="w-5 h-5 sm:w-8 sm:h-8 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-5 h-5 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Headphones className="w-5 h-5 sm:w-8 sm:h-8" />
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center px-1 sm:px-8 border-x border-emerald-50 dark:border-slate-800 flex-1 min-w-0">
          <span className="text-base sm:text-3xl font-black text-emerald-900 dark:text-emerald-50 font-arabic whitespace-nowrap overflow-hidden text-ellipsis">
            الصفحة {currentPage}
          </span>
          <span className="text-[8px] sm:text-sm text-emerald-600/70 dark:text-emerald-400/70 font-bold font-arabic whitespace-nowrap overflow-hidden text-ellipsis">
            رواية ورش عن نافع
          </span>
        </div>
 
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="p-1 sm:p-3.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>

      <div className="relative w-full max-w-7xl flex-1 flex flex-col bg-white dark:bg-[#1a1c1e] rounded-[32px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden landscape:overflow-y-auto group transition-all duration-500">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-[#1a1c1e]/90 z-10 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {imageSrc && (
          <div className="w-full flex-1 landscape:h-auto p-2 sm:px-6 sm:py-2 flex flex-col items-center justify-between landscape:justify-start">
            <MushafHeader surahName={pageMeta.surahName} surahEnglish={pageMeta.surahEnglish} juz={pageMeta.juz} lang={lang} />
            
            <div className="flex-1 flex items-center justify-center">
              <img
                src={imageSrc}
                alt={`صفحة ${currentPage} من المصحف`}
                className="w-full h-auto portrait:w-auto portrait:max-h-[70vh] landscape:max-h-none object-contain cursor-pointer transition-transform duration-500 group-hover:scale-[1.01] shadow-2xl rounded-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                onClick={() => setIsFullscreen(true)}
                dir="rtl"
              />
            </div>

            <MushafFooter page={currentPage} />
          </div>
        )}
        
        {/* TV Navigation Hints (Visible on hover or focus) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:flex">
          <span className="bg-black/40 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">استخدم الأسهم للتنقل</span>
          <span className="bg-black/40 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">F للملء</span>
        </div>
      </div>

      <div className="w-full max-w-3xl mt-4 flex flex-col gap-3" dir="rtl">
        {!isFullyDownloaded && (
          <button
            onClick={downloadAllPages}
            disabled={downloadProgress !== null}
            className="flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 outline-none disabled:bg-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-none text-lg"
          >
            {downloadProgress !== null ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>جاري التحميل... {downloadProgress}%</span>
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                <span>تحميل المصحف كاملاً للقراءة بدون إنترنت</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
