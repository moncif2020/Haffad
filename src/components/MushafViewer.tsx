import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, Download, CheckCircle2, Search, X, Headphones, Play, Loader2 } from 'lucide-react';
import quranMetadata from '../data/quran-metadata.json';
import { useAudio } from '../AudioContext';
import { fetchAyahs, getAudioUrl } from '../lib/quran';

interface MushafViewerProps {
  initialPage?: number;
}

export function MushafViewer({ initialPage = 1 }: MushafViewerProps) {
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

  const totalPages = 604;

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

  const listenToPage = async () => {
    setIsPageLoading(true);
    try {
      // Find all ayahs on this page
      const pageAyahs: {surah: number, ayah: number}[] = [];
      
      quranMetadata.forEach(surah => {
        surah.ayahPages.forEach((page, index) => {
          if (page === currentPage) {
            pageAyahs.push({ surah: surah.number, ayah: index + 1 });
          }
        });
      });

      if (pageAyahs.length === 0) {
        setIsPageLoading(false);
        return;
      }

      // Group by surah to fetch text
      const surahsToFetch = Array.from(new Set(pageAyahs.map(a => a.surah)));
      const allAyahsData: any[] = [];

      for (const surahNum of surahsToFetch) {
        const ayahsInSurah = pageAyahs.filter(a => a.surah === surahNum);
        const minAyah = Math.min(...ayahsInSurah.map(a => a.ayah));
        const maxAyah = Math.max(...ayahsInSurah.map(a => a.ayah));
        
        const data = await fetchAyahs(surahNum, minAyah, maxAyah);
        allAyahsData.push(...data.ayahs.map((a: any) => ({
          ...a,
          surahNum
        })));
      }

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

      startNewPlaylist(newPlaylist, 0);
    } catch (e) {
      console.error("Failed to start page audio", e);
    } finally {
      setIsPageLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full bg-[#f4f1ea] p-2 sm:p-4 relative touch-pan-y select-none"
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
          className="fixed inset-0 z-50 bg-black overflow-y-auto overflow-x-hidden touch-pan-y"
          onClick={() => setIsFullscreen(false)}
        >
          {isLoading && (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="min-h-full w-full flex items-center justify-center p-2">
            {imageSrc && (
              <img
                src={imageSrc}
                alt={`صفحة ${currentPage} من المصحف`}
                className="w-full h-auto max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl object-contain shadow-2xl"
                dir="rtl"
              />
            )}
          </div>
          <button 
            className="fixed top-4 right-4 z-50 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 focus:ring-4 focus:ring-emerald-500 outline-none transition-all"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            aria-label="إغلاق ملء الشاشة"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
      {/* Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-bold font-arabic text-gray-800">البحث عن آية</h3>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 font-arabic">السورة</label>
                <select 
                  value={selectedSurah}
                  onChange={(e) => {
                    setSelectedSurah(Number(e.target.value));
                    setSelectedAyah(1); // Reset ayah when surah changes
                  }}
                  className="p-4 border-2 border-gray-100 rounded-xl font-arabic text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                >
                  {quranMetadata.map(surah => (
                    <option key={surah.number} value={surah.number}>
                      {surah.number}. {surah.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 font-arabic">الآية</label>
                <select 
                  value={selectedAyah}
                  onChange={(e) => setSelectedAyah(Number(e.target.value))}
                  className="p-4 border-2 border-gray-100 rounded-xl font-arabic text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                >
                  {Array.from({ length: currentSurahData?.numberOfAyahs || 0 }, (_, i) => i + 1).map(ayah => (
                    <option key={ayah} value={ayah}>
                      الآية {ayah}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleSearch}
                className="mt-4 w-full bg-emerald-600 text-white font-bold font-arabic py-4 rounded-xl hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 outline-none transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-emerald-200"
              >
                <Search className="w-6 h-6" />
                <span>الذهاب للآية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between w-full max-w-3xl mb-4 bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-gray-100" dir="rtl">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-3 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-8 h-8 text-gray-700" />
          </button>
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-3 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
            title="بحث عن سورة أو آية"
          >
            <Search className="w-7 h-7" />
          </button>

          <button
            onClick={listenToPage}
            disabled={isPageLoading}
            className={`p-3 rounded-xl transition-all focus:ring-2 focus:ring-emerald-500 outline-none ${isPageLoading || isAudioLoading ? 'text-emerald-400 bg-emerald-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
            title="استماع لهذه الصفحة"
          >
            {isPageLoading || isAudioLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Headphones className="w-7 h-7" />}
          </button>
        </div>
        
        <div className="flex flex-col items-center px-4">
          <span className="text-xl sm:text-2xl font-bold text-gray-800 font-arabic">
            الصفحة {currentPage}
          </span>
          <span className="text-xs sm:text-sm text-gray-500 font-arabic">
            رواية ورش عن نافع
          </span>
        </div>

        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="p-3 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-8 h-8 text-gray-700" />
        </button>
      </div>

      <div className="relative w-full max-w-3xl flex-1 flex items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden min-h-[50vh] sm:min-h-[60vh] group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {imageSrc && (
          <img
            src={imageSrc}
            alt={`صفحة ${currentPage} من المصحف`}
            className="w-full h-auto max-h-[75vh] object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            onClick={() => setIsFullscreen(true)}
            dir="rtl"
          />
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
            className="flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 outline-none disabled:bg-emerald-400 shadow-lg shadow-emerald-100 text-lg"
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
