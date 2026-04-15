import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Sparkles, Mic, TreePine, Users, 
  ArrowLeft, ArrowRight, CheckCircle2, Play, ShieldCheck,
  BrainCircuit, Sprout, HeartHandshake, ChevronRight, ChevronLeft, Globe, Menu, X as CloseIcon, LogIn
} from 'lucide-react';
import { landingTranslations, languages } from './landing-translations';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';

export function LandingPage() {
  const [lang, setLang] = useState('ar');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Merge selected language with English as fallback for missing keys
  const t = {
    ...landingTranslations['en'],
    ...(landingTranslations[lang] || landingTranslations['ar'])
  };
  
  const currentLang = languages.find(l => l.code === lang) || languages[0];
  const isRtl = currentLang.dir === 'rtl';

  useEffect(() => {
    document.title = `${t.app_name} - ${t.hero_title1} ${t.hero_title2}`;
    document.documentElement.dir = currentLang.dir;
    document.documentElement.lang = lang;

    // If already logged in, redirect to app
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/app');
      }
    });
    return () => unsubscribe();
  }, [lang, t, currentLang, navigate]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (error) {
      console.error("Login Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir={currentLang.dir}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt={`${t.app_name} Logo`} className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl text-emerald-700">{t.app_name}</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Language Selector - Visible on all screens */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 font-medium transition-all text-sm sm:text-base">
                  <Globe size={18} />
                  <span className="hidden xs:inline">{currentLang.name}</span>
                </button>
                <div className="absolute top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={isRtl ? { left: 0 } : { right: 0 }}>
                  <div className="max-h-[60vh] overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors ${lang === l.code ? 'text-emerald-600 font-bold bg-emerald-50/50' : 'text-slate-700'}`}
                        style={{ textAlign: isRtl ? 'right' : 'left' }}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="text-slate-600 hover:text-emerald-600 font-medium transition-colors hidden md:block"
              >
                {t.nav_login}
              </button>
              
              <button 
                onClick={handleStart}
                disabled={isLoading}
                className="bg-emerald-600 text-white px-4 sm:px-5 py-2 rounded-full font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2 text-sm sm:text-base disabled:opacity-50"
              >
                <span>{t.nav_start}</span>
                {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`text-center ${isRtl ? 'lg:text-right' : 'lg:text-left'}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm mb-6">
              <Sparkles size={16} />
              <span>{t.hero_badge}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              {t.hero_title1} <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                {t.hero_title2}
              </span>
            </h1>
            <p className={`text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto ${isRtl ? 'lg:mx-0' : 'lg:mx-0'} leading-relaxed`}>
              {t.hero_desc}
            </p>
            <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-start'}`}>
              <button 
                onClick={handleStart}
                disabled={isLoading}
                className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={20} fill="currentColor" />
                <span>{t.hero_btn_web}</span>
              </button>
              <button className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-full font-bold text-lg hover:border-emerald-200 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 opacity-80 cursor-not-allowed" title={t.hero_btn_app}>
                <span>{t.hero_btn_app}</span>
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200 to-teal-100 rounded-[3rem] transform rotate-3 scale-105 -z-10 opacity-50 blur-2xl"></div>
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden relative">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <BookOpen className="text-emerald-600" size={24} />
                    </div>
                    <div>
                      <div className="h-4 w-24 bg-slate-200 rounded-full mb-2"></div>
                      <div className="h-3 w-16 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">🪙</div>
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">🌱</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-slate-100 rounded-full"></div>
                  <div className="h-4 w-5/6 bg-slate-100 rounded-full"></div>
                  <div className="h-4 w-4/6 bg-slate-100 rounded-full"></div>
                </div>
                <div className="mt-8 flex justify-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 text-white animate-pulse">
                    <Mic size={28} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t.features_title}</h2>
            <p className="text-lg text-slate-600">{t.features_desc}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <BrainCircuit size={32} />,
                title: t.feat1_title,
                desc: t.feat1_desc,
                color: "bg-emerald-50 text-emerald-600"
              },
              {
                icon: <Mic size={32} />,
                title: t.feat2_title,
                desc: t.feat2_desc,
                color: "bg-emerald-50 text-emerald-600"
              },
              {
                icon: <Sprout size={32} />,
                title: t.feat3_title,
                desc: t.feat3_desc,
                color: "bg-amber-50 text-amber-600"
              },
              {
                icon: <Users size={32} />,
                title: t.feat4_title,
                desc: t.feat4_desc,
                color: "bg-purple-50 text-purple-600"
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t.how_title}</h2>
            <p className="text-lg text-slate-600">{t.how_desc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
            
            {[
              { step: "1", title: t.step1_title, desc: t.step1_desc },
              { step: "2", title: t.step2_title, desc: t.step2_desc },
              { step: "3", title: t.step3_title, desc: t.step3_desc }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="relative z-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center"
              >
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg shadow-emerald-200">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#pattern)" />
            <defs>
              <pattern id="pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">{t.cta_title}</h2>
          <p className="text-xl text-emerald-100 mb-10">{t.cta_desc}</p>
          <button 
            onClick={handleStart}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <span>{t.cta_btn}</span>
            {isRtl ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
          </button>
        </div>
      </section>

      {/* Legal & Warning Section */}
      <section id="legal" className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className={`p-6 rounded-2xl bg-amber-50 border border-amber-100 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 text-amber-700 font-bold mb-3">
                <ShieldCheck size={20} />
                <span>{t.warning?.split(':')[0] || 'Warning'}</span>
              </div>
              <p className="text-amber-800 text-sm leading-relaxed">
                {t.warning}
              </p>
            </div>
            
            <div id="privacy" className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="font-bold text-slate-900 mb-4">{t.privacy_policy}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.privacy_desc}
              </p>
            </div>

            <div id="terms" className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="font-bold text-slate-900 mb-4">{t.terms_of_use}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.terms_desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-50 grayscale">
            <img src="/logo.svg" alt={`${t.app_name} Logo`} className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl text-white">{t.app_name}</span>
          </div>
          <p className="mb-6">{t.footer_rights} &copy; {new Date().getFullYear()} {t.app_name}</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#privacy" className="hover:text-white transition-colors">{t.footer_privacy}</a>
            <a href="#terms" className="hover:text-white transition-colors">{t.footer_terms}</a>
            <a href="#" className="hover:text-white transition-colors">{t.footer_contact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
