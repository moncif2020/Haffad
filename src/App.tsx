import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { RemoteUploadPage } from './RemoteUploadPage';
import { TVLoginPage } from './TVLoginPage';
import HoffadApp from './HoffadApp';
import { AudioProvider } from './AudioContext';

export default function App() {
  return (
    <BrowserRouter>
      <AudioProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<RemoteUploadPage />} />
          <Route path="/tv-login" element={<TVLoginPage />} />
          <Route path="/app/*" element={<HoffadApp />} />
        </Routes>
      </AudioProvider>
    </BrowserRouter>
  );
}
