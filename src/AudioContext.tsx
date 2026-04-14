import React, { createContext, useState, useRef, useContext, useEffect } from 'react';

export const AudioContext = createContext<any>(null);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlistRef = useRef<any[]>([]);

  // Update ref whenever playlist state changes
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  const playTrack = (index: number) => {
    const currentPlaylist = playlistRef.current;
    if (index >= 0 && index < currentPlaylist.length) {
      setCurrentTrackIndex(index);
      setIsLoading(true);
      if (audioRef.current) {
        audioRef.current.src = currentPlaylist[index].url;
        audioRef.current.load();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsLoading(false);
            setIsPlaying(true);
          }).catch(e => {
            console.error("Playback failed", e);
            setIsLoading(false);
            setIsPlaying(false);
          });
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTrackIndex(-1);
    setPlaylist([]);
  };

  const handleAudioEnded = () => {
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < playlistRef.current.length) {
      playTrack(nextIndex);
    } else {
      setIsPlaying(false);
      setPlaylist([]);
      setCurrentTrackIndex(-1);
    }
  };

  const [reciter, setReciter] = useState('Husary_64kbps');
  const [repetitions, setRepetitions] = useState(1);
  const [rangeRepetitions, setRangeRepetitions] = useState(1);

  const startNewPlaylist = (newPlaylist: any[], startIndex: number = 0) => {
    playlistRef.current = newPlaylist;
    setPlaylist(newPlaylist);
    playTrack(startIndex);
  };

  const handleAudioError = (e: any) => {
    console.error("Audio element error", e);
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
    setIsPlaying(true);
  };

  return (
    <AudioContext.Provider value={{
      playlist, setPlaylist,
      currentTrackIndex, setCurrentTrackIndex,
      isPlaying, setIsPlaying,
      isLoading, setIsLoading,
      playTrack, pause, resume, stop,
      startNewPlaylist,
      reciter, setReciter,
      repetitions, setRepetitions,
      rangeRepetitions, setRangeRepetitions,
      currentTime, duration
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded} 
        onError={handleAudioError}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      />
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
