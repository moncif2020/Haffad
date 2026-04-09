import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, Download, CheckCircle2, Search, X } from 'lucide-react';
import quranMetadata from '../data/quran-metadata.json';

interface MushafViewerProps {
  initialPage?: number;
}

export function MushafViewer({ initialPage = 1 }: MushafViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isFullyDownloaded, setIsFullyDownloaded] = useState(false);
  
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

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Optional: can be used to prevent default behavior if needed
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStart - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swiped left (finger moved left) -> Go to previous page (RTL)
      handlePrevPage();
    } else if (isRightSwipe) {
      // Swiped right (finger moved right) -> Go to next page (RTL)
      handleNextPage();
    }
    
    setTouchStart(null);
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

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full bg-[#f4f1ea] p-4 relative touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-bold font-arabic text-gray-800">البحث عن آية</h3>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
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
                  className="p-3 border border-gray-200 rounded-xl font-arabic text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="p-3 border border-gray-200 rounded-xl font-arabic text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="mt-4 w-full bg-emerald-600 text-white font-bold font-arabic py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span>الذهاب للآية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between w-full max-w-2xl mb-4 bg-white p-3 rounded-xl shadow-sm" dir="rtl">
        <div className="flex items-center gap-1">
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 transition-colors"
            title="بحث عن سورة أو آية"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-800 font-arabic">
            الصفحة {currentPage}
          </span>
          <span className="text-xs text-gray-500 font-arabic">
            رواية ورش عن نافع
          </span>
        </div>

        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="relative w-full max-w-2xl flex-1 flex items-center justify-center bg-white rounded-xl shadow-md overflow-hidden min-h-[60vh]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {imageSrc && (
          <img
            src={imageSrc}
            alt={`صفحة ${currentPage} من المصحف`}
            className="w-full h-auto max-h-[70vh] object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            dir="rtl"
          />
        )}
      </div>

      <div className="w-full max-w-2xl mt-4 flex flex-col gap-3" dir="rtl">
        <button
          onClick={downloadAllPages}
          disabled={downloadProgress !== null || isFullyDownloaded}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors ${
            isFullyDownloaded 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400'
          }`}
        >
          {isFullyDownloaded ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>المصحف متاح بدون إنترنت</span>
            </>
          ) : downloadProgress !== null ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>جاري التحميل... {downloadProgress}%</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>تحميل المصحف كاملاً للقراءة بدون إنترنت</span>
            </>
          )}
        </button>

        <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="font-arabic leading-relaxed">
            ملاحظة: تم استخدام صور مصحف مجمع الملك فهد برواية ورش لعدم توفر واجهة برمجية مفتوحة المصدر لصور "المصحف المحمدي" الرسمي. هذه النسخة دقيقة وموثوقة ومطابقة لقواعد التجويد والرسم العثماني برواية ورش.
          </p>
        </div>
      </div>
    </div>
  );
}
