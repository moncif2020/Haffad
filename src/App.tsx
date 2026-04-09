import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat, BookOpen, Settings, Coins, Heart, Plus, Check, ArrowRight, RefreshCw, X, Mic, ListOrdered, LayoutGrid, Eye, EyeOff, Book, Edit3, Loader2, Headphones, Play, Pause, Square, Volume2, TreePine, Leaf, Droplet, HeartHandshake, Utensils, Gift, Sprout, FileText, Languages, Moon, Sun, Download, Menu, ChevronDown } from 'lucide-react';
import { QURAN_SURAHS, fetchAyahs, downloadSurahAudio } from './lib/quran';
import { MushafViewer } from './components/MushafViewer';

// --- Types ---
type View = 'garden' | 'study' | 'parent' | 'game' | 'listen' | 'mushaf';
type Lesson = { id: string; title: string; text: string };
type Language = 'ar' | 'en' | 'fr' | 'es';

// --- Translations ---
const t = {
  ar: { 
    garden: 'بستاني', 
    study: 'المذاكرة', 
    listen: 'استماع', 
    settings: 'الإعدادات',
    currentLevel: 'مستواك الحالي',
    pointsToNext: 'باقي {points} نقطة للمستوى القادم',
    fruitsOfGiving: 'ثمار العطاء',
    donationsCount: '{count} تبرعات',
    useCoins: 'استخدمي عملاتك (ثمار شجرتك) لمساعدة الآخرين ونشر الخير في العالم.',
    water: 'سقيا ماء',
    food: 'إطعام مسكين',
    plantTree: 'زراعة شجرة',
    coin: 'عملة',
    goToStudy: 'اذهبي للمذاكرة لجمع المزيد من الثمار!',
    memorizationTasks: 'مهام الحفظ',
    noTasks: 'لا توجد مهام حالياً. اطلب من والدك إضافة دروس جديدة!',
    listenAndMemorize: 'التلقين والاستماع',
    repeatTexts: 'كرري النصوص والآيات لتثبيت الحفظ',
    quran: 'القرآن الكريم',
    customTexts: 'نصوص مخصصة',
    chooseSurah: 'اختر السورة',
    fromAyah: 'من آية',
    toAyah: 'إلى آية',
    reciter: 'القارئ',
    repetitions: 'عدد التكرارات (لكل آية)',
    startListening: 'بدء الاستماع والتلقين',
    textToMemorize: 'النص المراد حفظه',
    textPlaceholder: 'الصقي هنا النص، الحوار، أو القصيدة... (كل سطر سيتم تكراره بشكل منفصل)',
    textTip: 'نصيحة: افصلي بين الجمل الطويلة بـ "سطر جديد" (Enter) ليسهل حفظها.',
    textLanguage: 'لغة النص (صوت الذكاء الاصطناعي)',
    arabic: 'العربية (Arabic)',
    english: 'الإنجليزية (English)',
    french: 'الفرنسية (French)',
    spanish: 'الإسبانية (Spanish)',
    currentRepetition: 'التكرار الحالي للمقطع: {current} من {total}',
    parentDashboard: 'لوحة التحكم (للآباء)',
    addNewTask: 'إضافة مهمة حفظ جديدة',
    taskTitle: 'عنوان المهمة',
    taskText: 'النص المراد حفظه',
    add: 'إضافة',
    addAyahs: 'إضافة الآيات',
    currentTasks: 'المهام الحالية',
    blanks: 'فراغات',
    order: 'ترتيب',
    recite: 'تسميع',
    wellDone: 'أحسنتِ يا بطلة!',
    taskCompleted: 'لقد أنجزتِ المهمة بنجاح',
    checkOrder: 'تحقق من الترتيب',
    smartRecitationChallenge: 'تحدي التسميع الذكي',
    recitationInstructions: 'اضغطي على الزر، اقرئي ما حفظتيه، وسيقوم التطبيق بتصحيح قراءتك تلقائياً!',
    stopRecording: 'إيقاف التسجيل',
    startRecitation: 'بدء التسميع',
    checkMyRecitation: 'تحقق من حفظي',
    result: 'النتيجة',
    excellentRecitation: 'ممتازة! حفظك رائع جداً.',
    goodTry: 'محاولة جيدة! راجعي الكلمات الحمراء وحاولي مرة أخرى.',
    retryRecitation: 'إعادة التسميع',
    claimReward: 'استلام المكافأة',
    micNotAllowed: 'الرجاء السماح للمتصفح باستخدام الميكروفون.',
    browserNotSupported: 'متصفحك الحالي لا يدعم ميزة التعرف على الصوت. يرجى استخدام متصفح Google Chrome.',
    didNotHear: 'لم أسمع شيئاً، حاولي رفع صوتك والتسميع مرة أخرى.',
    listenAndMemorizeTitle: 'التلقين والاستماع',
    listenAndMemorizeDesc: 'كرري النصوص والآيات لتثبيت الحفظ',
    startDictation: 'بدء التلقين',
    dictationText: 'تلقين النص',
    errorFetchingAyahs: 'حدث خطأ أثناء جلب الآيات',
    fillBlanksInstructions: 'أكملي الفراغات بالكلمات الصحيحة',
    checkAnswer: 'تحقق من الإجابة',
    someErrorsTryAgain: 'هناك بعض الأخطاء، حاولي مرة أخرى!',
    orderInstructions: 'رتبي الجمل لتكوين النص الصحيح',
    incorrectOrderTryAgain: 'الترتيب غير صحيح، حاولي مرة أخرى!',
    clickSentencesToOrder: 'اضغطي على الجمل بالأسفل لترتيبها هنا',
    checkOrder: 'تحقق من الترتيب',
    micPermission: 'الرجاء السماح للمتصفح باستخدام الميكروفون.',
    speechNotSupported: 'متصفحك الحالي لا يدعم ميزة التعرف على الصوت. يرجى استخدام متصفح Google Chrome.',
    didNotHear: 'لم أسمع شيئاً، حاولي رفع صوتك والتسميع مرة أخرى.',
    smartRecitationChallenge: 'تحدي التسميع الذكي',
    recitationInstructions: 'اضغطي على الزر، اقرئي ما حفظتيه، وسيقوم التطبيق بتصحيح قراءتك تلقائياً!',
    stopRecording: 'إيقاف التسجيل',
    startReciting: 'بدء التسميع',
    checkMyMemorization: 'تحقق من حفظي',
    resultScore: 'النتيجة: {score}%',
    excellentMemorization: 'ممتازة! حفظك رائع جداً.',
    goodTryReview: 'محاولة جيدة! راجعي الكلمات الحمراء وحاولي مرة أخرى.',
    reciteAgain: 'إعادة التسميع',
    claimReward: 'استلام المكافأة',
    myApp: 'تطبيقي',
    seedOfKnowledge: 'بذرة المعرفة',
    plantOfCertainty: 'غرسة اليقين',
    treeOfWisdom: 'شجرة الحكمة',
    gardenOfGiving: 'بستان العطاء',
    reachedHighestLevel: 'لقد وصلت لأعلى مستوى!',
    ayahsRange: '(الآيات {start}-{end})',
    ayahsAddedSuccessfully: 'تمت إضافة الآيات بنجاح!',
    errorFetchingAyahsCheckInternet: 'حدث خطأ أثناء جلب الآيات. تأكد من اتصالك بالإنترنت.',
    loadingSurahs: 'جاري تحميل قائمة السور...',
    startMemorizing: 'بدء الحفظ',
    downloadOffline: 'تنزيل للاستماع بدون إنترنت',
    downloadComplete: 'تم التنزيل بنجاح!',
    downloadError: 'حدث خطأ أثناء التنزيل',
    downloading: 'جاري التنزيل... {progress}%',
  },
  en: { 
    garden: 'My Garden', 
    study: 'Study', 
    listen: 'Listen', 
    settings: 'Settings',
    currentLevel: 'Current Level',
    pointsToNext: '{points} points to next level',
    fruitsOfGiving: 'Fruits of Giving',
    donationsCount: '{count} Donations',
    useCoins: 'Use your coins (fruits of your tree) to help others and spread goodness in the world.',
    water: 'Provide Water',
    food: 'Feed the Needy',
    plantTree: 'Plant a Tree',
    coin: 'coins',
    goToStudy: 'Go study to collect more fruits!',
    memorizationTasks: 'Memorization Tasks',
    noTasks: 'No tasks currently. Ask your parent to add new lessons!',
    listenAndMemorize: 'Listen & Memorize',
    repeatTexts: 'Repeat texts and verses to solidify memorization',
    quran: 'Holy Quran',
    customTexts: 'Custom Texts',
    chooseSurah: 'Choose Surah',
    fromAyah: 'From Ayah',
    toAyah: 'To Ayah',
    reciter: 'Reciter',
    repetitions: 'Repetitions (per Ayah)',
    startListening: 'Start Listening',
    textToMemorize: 'Text to Memorize',
    textPlaceholder: 'Paste text, dialogue, or poem here... (each line will be repeated separately)',
    textTip: 'Tip: Separate long sentences with a "new line" (Enter) to make them easier to memorize.',
    textLanguage: 'Text Language (AI Voice)',
    arabic: 'Arabic',
    english: 'English',
    french: 'French',
    spanish: 'Spanish',
    currentRepetition: 'Current repetition: {current} of {total}',
    parentDashboard: 'Parent Dashboard',
    addNewTask: 'Add New Task',
    taskTitle: 'Task Title',
    taskText: 'Text to Memorize',
    add: 'Add',
    addAyahs: 'Add Ayahs',
    currentTasks: 'Current Tasks',
    blanks: 'Blanks',
    order: 'Order',
    recite: 'Recite',
    wellDone: 'Well done, champion!',
    taskCompleted: 'You have successfully completed the task',
    checkOrder: 'Check Order',
    smartRecitationChallenge: 'Smart Recitation Challenge',
    recitationInstructions: 'Press the button, read what you memorized, and the app will correct your reading automatically!',
    stopRecording: 'Stop Recording',
    startRecitation: 'Start Recitation',
    checkMyRecitation: 'Check My Recitation',
    result: 'Result',
    excellentRecitation: 'Excellent! Your memorization is great.',
    goodTry: 'Good try! Review the red words and try again.',
    retryRecitation: 'Retry Recitation',
    claimReward: 'Claim Reward',
    micNotAllowed: 'Please allow the browser to use the microphone.',
    browserNotSupported: 'Your current browser does not support voice recognition. Please use Google Chrome.',
    didNotHear: 'I didn\'t hear anything, try raising your voice and reciting again.',
    listenAndMemorizeTitle: 'Listen & Memorize',
    listenAndMemorizeDesc: 'Repeat texts and verses to consolidate memorization',
    startDictation: 'Start Dictation',
    dictationText: 'Dictation Text',
    errorFetchingAyahs: 'Error fetching Ayahs',
    fillBlanksInstructions: 'Fill in the blanks with the correct words',
    checkAnswer: 'Check Answer',
    someErrorsTryAgain: 'There are some errors, try again!',
    orderInstructions: 'Order the sentences to form the correct text',
    incorrectOrderTryAgain: 'Incorrect order, try again!',
    clickSentencesToOrder: 'Click the sentences below to order them here',
    checkOrder: 'Check Order',
    micPermission: 'Please allow the browser to use the microphone.',
    speechNotSupported: 'Your current browser does not support speech recognition. Please use Google Chrome.',
    didNotHear: 'I did not hear anything, try speaking louder and reciting again.',
    smartRecitationChallenge: 'Smart Recitation Challenge',
    recitationInstructions: 'Click the button, read what you memorized, and the app will automatically correct your reading!',
    stopRecording: 'Stop Recording',
    startReciting: 'Start Reciting',
    checkMyMemorization: 'Check My Memorization',
    resultScore: 'Result: {score}%',
    excellentMemorization: 'Excellent! Your memorization is great.',
    goodTryReview: 'Good try! Review the red words and try again.',
    reciteAgain: 'Recite Again',
    claimReward: 'Claim Reward',
    myApp: 'My App',
    seedOfKnowledge: 'Seed of Knowledge',
    plantOfCertainty: 'Plant of Certainty',
    treeOfWisdom: 'Tree of Wisdom',
    gardenOfGiving: 'Garden of Giving',
    reachedHighestLevel: 'You have reached the highest level!',
    ayahsRange: '(Ayahs {start}-{end})',
    ayahsAddedSuccessfully: 'Ayahs added successfully!',
    errorFetchingAyahsCheckInternet: 'Error fetching Ayahs. Check your internet connection.',
    loadingSurahs: 'Loading Surahs...',
    startMemorizing: 'Start Memorizing',
    downloadOffline: 'Download for offline listening',
    downloadComplete: 'Download complete!',
    downloadError: 'Error during download',
    downloading: 'Downloading... {progress}%',
  },
  fr: { 
    garden: 'Mon Jardin', 
    study: 'Étudier', 
    listen: 'Écouter', 
    settings: 'Paramètres',
    currentLevel: 'Niveau Actuel',
    pointsToNext: '{points} points pour le niveau suivant',
    fruitsOfGiving: 'Fruits du Don',
    donationsCount: '{count} Dons',
    useCoins: 'Utilisez vos pièces (fruits de votre arbre) pour aider les autres et répandre le bien dans le monde.',
    water: 'Fournir de l\'eau',
    food: 'Nourrir les Nécessiteux',
    plantTree: 'Planter un Arbre',
    coin: 'pièces',
    goToStudy: 'Allez étudier pour récolter plus de fruits !',
    memorizationTasks: 'Tâches de Mémorisation',
    noTasks: 'Aucune tâche pour le moment. Demandez à votre parent d\'ajouter de nouvelles leçons !',
    listenAndMemorize: 'Écouter et Mémoriser',
    repeatTexts: 'Répétez les textes et les versets pour consolider la mémorisation',
    quran: 'Saint Coran',
    customTexts: 'Textes Personnalisés',
    chooseSurah: 'Choisir la Sourate',
    fromAyah: 'De la Ayah',
    toAyah: 'À la Ayah',
    reciter: 'Récitateur',
    repetitions: 'Répétitions (par Ayah)',
    startListening: 'Commencer l\'écoute',
    textToMemorize: 'Texte à Mémoriser',
    textPlaceholder: 'Collez le texte, le dialogue ou le poème ici... (chaque ligne sera répétée séparément)',
    textTip: 'Astuce : Séparez les phrases longues par un "saut de ligne" (Entrée) pour faciliter la mémorisation.',
    textLanguage: 'Langue du Texte (Voix IA)',
    arabic: 'Arabe',
    english: 'Anglais',
    french: 'Français',
    spanish: 'Espagnol',
    currentRepetition: 'Répétition actuelle : {current} sur {total}',
    parentDashboard: 'Tableau de Bord (Parents)',
    addNewTask: 'Ajouter une Tâche',
    taskTitle: 'Titre de la Tâche',
    taskText: 'Texte à Mémoriser',
    add: 'Ajouter',
    addAyahs: 'Ajouter Ayahs',
    currentTasks: 'Tâches Actuelles',
    blanks: 'Espaces',
    order: 'Ordre',
    recite: 'Réciter',
    wellDone: 'Bien joué, championne !',
    taskCompleted: 'Vous avez terminé la tâche avec succès',
    checkOrder: 'Vérifier l\'ordre',
    smartRecitationChallenge: 'Défi de Récitation Intelligente',
    recitationInstructions: 'Appuyez sur le bouton, lisez ce que vous avez mémorisé, et l\'application corrigera votre lecture automatiquement !',
    stopRecording: 'Arrêter l\'enregistrement',
    startRecitation: 'Commencer la récitation',
    checkMyRecitation: 'Vérifier ma récitation',
    result: 'Résultat',
    excellentRecitation: 'Excellent ! Votre mémorisation est super.',
    goodTry: 'Bon essai ! Révisez les mots en rouge et réessayez.',
    retryRecitation: 'Réessayer la récitation',
    claimReward: 'Réclamer la récompense',
    micNotAllowed: 'Veuillez autoriser le navigateur à utiliser le microphone.',
    browserNotSupported: 'Votre navigateur actuel ne prend pas en charge la reconnaissance vocale. Veuillez utiliser Google Chrome.',
    didNotHear: 'Je n\'ai rien entendu, essayez de parler plus fort et de réciter à nouveau.',
    listenAndMemorizeTitle: 'Écouter et Mémoriser',
    listenAndMemorizeDesc: 'Répétez les textes et les versets pour consolider la mémorisation',
    startDictation: 'Commencer la dictée',
    dictationText: 'Texte de Dictée',
    errorFetchingAyahs: 'Erreur lors de la récupération des Ayahs',
    fillBlanksInstructions: 'Remplissez les espaces avec les mots corrects',
    checkAnswer: 'Vérifier la réponse',
    someErrorsTryAgain: 'Il y a quelques erreurs, réessayez !',
    orderInstructions: 'Ordonnez les phrases pour former le texte correct',
    incorrectOrderTryAgain: 'Ordre incorrect, réessayez !',
    clickSentencesToOrder: 'Cliquez sur les phrases ci-dessous pour les ordonner ici',
    checkOrder: 'Vérifier l\'ordre',
    micPermission: 'Veuillez autoriser le navigateur à utiliser le microphone.',
    speechNotSupported: 'Votre navigateur actuel ne prend pas en charge la reconnaissance vocale. Veuillez utiliser Google Chrome.',
    didNotHear: 'Je n\'ai rien entendu, essayez de parler plus fort et de réciter à nouveau.',
    smartRecitationChallenge: 'Défi de Récitation Intelligente',
    recitationInstructions: 'Cliquez sur le bouton, lisez ce que vous avez mémorisé, et l\'application corrigera automatiquement votre lecture !',
    stopRecording: 'Arrêter l\'enregistrement',
    startReciting: 'Commencer la récitation',
    checkMyMemorization: 'Vérifier ma mémorisation',
    resultScore: 'Résultat : {score}%',
    excellentMemorization: 'Excellent ! Votre mémorisation est super.',
    goodTryReview: 'Bon essai ! Révisez les mots rouges et réessayez.',
    reciteAgain: 'Réciter à nouveau',
    claimReward: 'Réclamer la récompense',
    myApp: 'Mon App',
    seedOfKnowledge: 'Graine de Connaissance',
    plantOfCertainty: 'Plante de Certitude',
    treeOfWisdom: 'Arbre de Sagesse',
    gardenOfGiving: 'Jardin du Don',
    reachedHighestLevel: 'Vous avez atteint le niveau le plus élevé !',
    ayahsRange: '(Ayahs {start}-{end})',
    ayahsAddedSuccessfully: 'Ayahs ajoutés avec succès !',
    errorFetchingAyahsCheckInternet: 'Erreur lors de la récupération des Ayahs. Vérifiez votre connexion internet.',
    loadingSurahs: 'Chargement des Sourates...',
    startMemorizing: 'Commencer à Mémoriser',
    downloadOffline: 'Télécharger pour écouter hors ligne',
    downloadComplete: 'Téléchargement terminé !',
    downloadError: 'Erreur lors du téléchargement',
    downloading: 'Téléchargement... {progress}%',
  },
  es: { 
    garden: 'Mi Jardín', 
    study: 'Estudiar', 
    listen: 'Escuchar', 
    settings: 'Ajustes',
    currentLevel: 'Nivel Actual',
    pointsToNext: '{points} puntos para el siguiente nivel',
    fruitsOfGiving: 'Frutos de Dar',
    donationsCount: '{count} Donaciones',
    useCoins: 'Usa tus monedas (frutos de tu árbol) para ayudar a otros y difundir el bien en el mundo.',
    water: 'Proveer Agua',
    food: 'Alimentar a los Necesitados',
    plantTree: 'Plantar un Árbol',
    coin: 'monedas',
    goToStudy: '¡Ve a estudiar para recolectar más frutos!',
    memorizationTasks: 'Tareas de Memorización',
    noTasks: 'No hay tareas actualmente. ¡Pídele a tu padre que agregue nuevas lecciones!',
    listenAndMemorize: 'Escuchar y Memorizar',
    repeatTexts: 'Repite textos y versos para consolidar la memorización',
    quran: 'Sagrado Corán',
    customTexts: 'Textos Personalizados',
    chooseSurah: 'Elegir Sura',
    fromAyah: 'Desde Aleya',
    toAyah: 'Hasta Aleya',
    reciter: 'Recitador',
    repetitions: 'Repeticiones (por Aleya)',
    startListening: 'Empezar a Escuchar',
    textToMemorize: 'Texto a Memorizar',
    textPlaceholder: 'Pega el texto, diálogo o poema aquí... (cada línea se repetirá por separado)',
    textTip: 'Consejo: Separa las oraciones largas con un "salto de línea" (Enter) para facilitar la memorización.',
    textLanguage: 'Idioma del Texto (Voz de IA)',
    arabic: 'Árabe',
    english: 'Inglés',
    french: 'Francés',
    spanish: 'Español',
    currentRepetition: 'Repetición actual: {current} de {total}',
    parentDashboard: 'Panel de Padres',
    addNewTask: 'Añadir Nueva Tarea',
    taskTitle: 'Título de la Tarea',
    taskText: 'Texto a Memorizar',
    add: 'Añadir',
    addAyahs: 'Añadir Aleyas',
    currentTasks: 'Tareas Actuales',
    blanks: 'Espacios',
    order: 'Orden',
    recite: 'Recitar',
    wellDone: '¡Bien hecho, campeona!',
    taskCompleted: 'Has completado la tarea con éxito',
    checkOrder: 'Comprobar Orden',
    smartRecitationChallenge: 'Desafío de Recitación Inteligente',
    recitationInstructions: '¡Presiona el botón, lee lo que has memorizado y la aplicación corregirá tu lectura automáticamente!',
    stopRecording: 'Detener Grabación',
    startRecitation: 'Iniciar Recitación',
    checkMyRecitation: 'Comprobar mi Recitación',
    result: 'Resultado',
    excellentRecitation: '¡Excelente! Tu memorización es genial.',
    goodTry: '¡Buen intento! Revisa las palabras en rojo y vuelve a intentarlo.',
    retryRecitation: 'Reintentar Recitación',
    claimReward: 'Reclamar Recompensa',
    micNotAllowed: 'Por favor, permite que el navegador use el micrófono.',
    browserNotSupported: 'Tu navegador actual no admite el reconocimiento de voz. Por favor, usa Google Chrome.',
    didNotHear: 'No escuché nada, intenta levantar la voz y recitar de nuevo.',
    listenAndMemorizeTitle: 'Escuchar y Memorizar',
    listenAndMemorizeDesc: 'Repite textos y versos para consolidar la memorización',
    startDictation: 'Iniciar Dictado',
    dictationText: 'Texto de Dictado',
    errorFetchingAyahs: 'Error al obtener Ayahs',
    fillBlanksInstructions: 'Rellena los espacios con las palabras correctas',
    checkAnswer: 'Comprobar Respuesta',
    someErrorsTryAgain: '¡Hay algunos errores, inténtalo de nuevo!',
    orderInstructions: 'Ordena las oraciones para formar el texto correcto',
    incorrectOrderTryAgain: '¡Orden incorrecto, inténtalo de nuevo!',
    clickSentencesToOrder: 'Haz clic en las oraciones a continuación para ordenarlas aquí',
    checkOrder: 'Comprobar Orden',
    micPermission: 'Por favor, permite que el navegador use el micrófono.',
    speechNotSupported: 'Tu navegador actual no soporta el reconocimiento de voz. Por favor, usa Google Chrome.',
    didNotHear: 'No escuché nada, intenta hablar más alto y recitar de nuevo.',
    smartRecitationChallenge: 'Desafío de Recitación Inteligente',
    recitationInstructions: '¡Haz clic en el botón, lee lo que memorizaste y la aplicación corregirá automáticamente tu lectura!',
    stopRecording: 'Detener Grabación',
    startReciting: 'Empezar a Recitar',
    checkMyMemorization: 'Comprobar mi Memorización',
    resultScore: 'Resultado: {score}%',
    excellentMemorization: '¡Excelente! Tu memorización es genial.',
    goodTryReview: '¡Buen intento! Revisa las palabras rojas e inténtalo de nuevo.',
    reciteAgain: 'Recitar de Nuevo',
    claimReward: 'Reclamar Recompensa',
    myApp: 'Mi App',
    seedOfKnowledge: 'Semilla de Conocimiento',
    plantOfCertainty: 'Planta de Certeza',
    treeOfWisdom: 'Árbol de Sabiduría',
    gardenOfGiving: 'Jardín de Dar',
    reachedHighestLevel: '¡Has alcanzado el nivel más alto!',
    ayahsRange: '(Ayahs {start}-{end})',
    ayahsAddedSuccessfully: '¡Ayahs añadidos con éxito!',
    errorFetchingAyahsCheckInternet: 'Error al obtener Ayahs. Comprueba tu conexión a internet.',
    loadingSurahs: 'Cargando Surahs...',
    startMemorizing: 'Empezar a Memorizar',
    downloadOffline: 'Descargar para escuchar sin conexión',
    downloadComplete: '¡Descarga completada!',
    downloadError: 'Error durante la descarga',
    downloading: 'Descargando... {progress}%',
  }
};

// --- Helper: Normalize Arabic Text for Comparison ---
const normalizeArabic = (text: string) => {
  if (!text) return '';
  return text
    .replace(/[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "") // Remove Tashkeel & Quranic marks
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/۝/g, "")
    .replace(/[٠-٩0-9]/g, "") // Remove numbers
    .replace(/[^\u0600-\u06FF\s]/g, "") // Remove non-Arabic chars
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
  const [reciter, setReciter] = useState<string>('ar.husary');
  const [repetitions, setRepetitions] = useState<number>(3);
  const [playlist, setPlaylist] = useState<{url: string, text: string, numberInSurah: number}[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);

  // Custom Text State
  const [customText, setCustomText] = useState<string>('');
  const [customLang, setCustomLang] = useState<string>('ar-SA');
  const [customReps, setCustomReps] = useState<number>(3);
  const [customPlaylist, setCustomPlaylist] = useState<string[]>([]);
  const [customCurrentIndex, setCustomCurrentIndex] = useState<number>(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const RECITERS = [
    { id: 'ar.husary', name: 'محمود خليل الحصري (معلم)' },
    { id: 'ar.alafasy', name: 'مشاري العفاسي' },
    { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد' },
    { id: 'ar.saadalghamidi', name: 'سعد الغامدي' },
    { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' }
  ];

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
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
    setIsLoading(true);
    try {
      const data = await fetchAyahs(selectedSurah, fromAyah, toAyah);
      const ayahs = data.ayahs;

      const newPlaylist: {url: string, text: string, numberInSurah: number}[] = [];

      // Build playlist: repeat each ayah X times before moving to the next
      ayahs.forEach((ayah: any) => {
        for (let i = 0; i < repetitions; i++) {
          newPlaylist.push({
            url: `https://cdn.islamic.network/quran/audio/128/${reciter}/${ayah.globalNumber}.mp3`,
            text: ayah.text,
            numberInSurah: ayah.numberInSurah
          });
        }
      });

      setPlaylist(newPlaylist);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert(t[lang].errorFetchingAyahs);
    } finally {
      setIsLoading(false);
    }
  };

  const stopListening = () => {
    setIsPlaying(false);
    if (listenMode === 'quran') {
      setCurrentTrackIndex(-1);
      setPlaylist([]);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } else {
      window.speechSynthesis.cancel();
      setCustomCurrentIndex(-1);
      setCustomPlaylist([]);
    }
  };

  const togglePlayPause = () => {
    if (listenMode === 'quran') {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
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

  // Quran Effect
  useEffect(() => {
    if (listenMode !== 'quran') return;
    if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
      if (audioRef.current) {
        audioRef.current.src = playlist[currentTrackIndex].url;
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
        setIsPlaying(true);
      }
    } else if (currentTrackIndex >= playlist.length && playlist.length > 0) {
      stopListening();
    }
  }, [currentTrackIndex, playlist, listenMode]);

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

  const handleAudioEnded = () => {
    if (listenMode === 'quran') {
      setCurrentTrackIndex(prev => prev + 1);
    }
  };

  const startCustomListening = () => {
    window.speechSynthesis.cancel();
    // Split by newlines or periods to create chunks
    const chunks = customText.split(/\n|\./).map(s => s.trim()).filter(s => s.length > 0);
    if (chunks.length === 0) return;

    const newPlaylist: string[] = [];
    chunks.forEach(chunk => {
      for (let i = 0; i < customReps; i++) {
        newPlaylist.push(chunk);
      }
    });

    setCustomPlaylist(newPlaylist);
    setCustomCurrentIndex(0);
    setIsPlaying(true);
  };

  return (
    <div className="p-6 pb-24 max-w-md mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-3 rounded-2xl">
          <Headphones className="text-emerald-600" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t[lang].listenAndMemorizeTitle}</h2>
          <p className="text-slate-500 text-sm">{t[lang].listenAndMemorizeDesc}</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-200 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => { setListenMode('quran'); stopListening(); }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${listenMode === 'quran' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t[lang].quran}
        </button>
        <button 
          onClick={() => { setListenMode('custom'); stopListening(); }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${listenMode === 'custom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t[lang].customTexts}
        </button>
      </div>

      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {listenMode === 'quran' ? (
        playlist.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < playlist.length ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
            <Volume2 size={40} className="text-emerald-500 mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-500 mb-2">
              {selectedSurahData?.name} - {t[lang].ayah} {playlist[currentTrackIndex].numberInSurah}
            </h3>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8 w-full min-h-[120px] flex items-center justify-center">
              <p className="text-2xl leading-loose font-medium text-slate-800">
                {playlist[currentTrackIndex].text} ۝
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
            <p className="text-slate-400 text-sm mt-6">
              {t[lang].currentRepetition.replace('{current}', String((currentTrackIndex % repetitions) + 1)).replace('{total}', String(repetitions))}
            </p>
          </motion.div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].chooseSurah}</label>
              <select 
                value={selectedSurah} 
                onChange={handleSurahChange}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              >
                {surahs.map(s => (
                  <option key={s.number} value={s.number}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].fromAyah}</label>
                <input 
                  type="number" min="1" max={toAyah} 
                  value={fromAyah} onChange={e => setFromAyah(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].toAyah}</label>
                <input 
                  type="number" min={fromAyah} max={maxAyahs} 
                  value={toAyah} onChange={e => setToAyah(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].reciter}</label>
              <select 
                value={reciter} 
                onChange={e => setReciter(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              >
                {RECITERS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].repetitionsPerAyah}</label>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <input 
                  type="range" min="1" max="10" 
                  value={repetitions} onChange={e => setRepetitions(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-10 text-center font-bold text-emerald-600 text-lg">{repetitions}</span>
              </div>
            </div>

            <button 
              onClick={startListening}
              disabled={isLoading}
              className="w-full bg-emerald-500 text-white font-bold text-lg py-4 rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 mt-4 hover:bg-emerald-600 transition-colors disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
              {t[lang].startDictation}
            </button>
            <button 
              onClick={handleDownload}
              disabled={isDownloading || isLoading}
              className="w-full bg-slate-100 text-slate-700 font-bold text-lg py-4 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 mt-2 hover:bg-slate-200 transition-colors disabled:opacity-70"
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
            <p className="text-slate-400 text-sm mt-6">
              {t[lang].currentRepetition.replace('{current}', String((customCurrentIndex % customReps) + 1)).replace('{total}', String(customReps))}
            </p>
          </motion.div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t[lang].textToMemorize}</label>
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
  const [view, setView] = useState<View>('garden');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 bg-slate-50 text-slate-800 ${isDarkMode ? 'dark' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-[#00c48c] text-white p-2.5 sm:p-3 rounded-[16px] shadow-sm hover:bg-[#00b07d] transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-bold text-lg text-slate-800 hidden sm:block">{t[lang].myApp}</h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as Language)}
              className="appearance-none bg-slate-50 text-slate-700 text-sm font-bold py-2.5 ps-4 pe-10 rounded-full outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="ar">AR</option>
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="es">ES</option>
            </select>
            <div className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronDown size={16} />
            </div>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isDarkMode ? <Sun size={24} className="text-amber-500" /> : <Moon size={24} />}
          </button>
          
          <div className="flex items-center gap-2 bg-[#fff4d4] text-[#d97706] px-4 py-2.5 rounded-full font-bold text-sm">
            <span className="text-base">{coins}</span>
            <Coins size={20} />
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
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Sprout size={24} />
                  <span className="font-bold text-lg">{t[lang].myApp}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-3">
                <button 
                  onClick={() => { setView('garden'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'garden' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <TreePine size={22} className={view === 'garden' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{t[lang].garden}</span>
                </button>
                
                <button 
                  onClick={() => { setView('study'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'study' || view === 'game' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <BookOpen size={22} className={view === 'study' || view === 'game' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>{t[lang].study}</span>
                </button>
                
                <button 
                  onClick={() => { setView('listen'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'listen' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Headphones size={22} className={view === 'listen' ? 'text-purple-600' : 'text-slate-400'} />
                  <span>{t[lang].listen}</span>
                </button>
                
                <button 
                  onClick={() => { setView('mushaf'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'mushaf' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Book size={22} className={view === 'mushaf' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{t[lang].quran}</span>
                </button>
                
                <div className="h-px bg-slate-100 my-2 mx-2"></div>
                
                <button 
                  onClick={() => { setView('parent'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'parent' ? 'bg-slate-200 text-slate-800 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Settings size={22} className={view === 'parent' ? 'text-slate-700' : 'text-slate-400'} />
                  <span>{t[lang].settings}</span>
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
            <GardenScreen key="garden" xp={xp} coins={coins} donations={donations} onDonate={handleDonate} onStudyClick={() => setView('study')} lang={lang} />
          )}
          {view === 'study' && (
            <StudyScreen key="study" lessons={lessons} onStartGame={startGame} lang={lang} />
          )}
          {view === 'game' && activeLesson && (
            <GameScreen key="game" lesson={activeLesson} onComplete={handleGameComplete} onCancel={() => setView('study')} lang={lang} />
          )}
          {view === 'listen' && (
            <ListenScreen key="listen" lang={lang} />
          )}
          {view === 'parent' && (
            <ParentScreen key="parent" lessons={lessons} setLessons={setLessons} lang={lang} />
          )}
          {view === 'mushaf' && (
            <MushafViewer key="mushaf" />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Screens ---

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
            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${coins >= 20 ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400 opacity-70'}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm"><Droplet size={24} className={coins >= 20 ? 'text-blue-500' : 'text-slate-400'} /></div>
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
        <BookOpen className="text-blue-500" />
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
                className="bg-blue-100 text-blue-600 p-3 rounded-xl hover:bg-blue-200 transition-colors"
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
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'blanks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          <LayoutGrid size={16} />
          {t[lang].blanks}
        </button>
        <button 
          onClick={() => setMode('order')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'order' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          <ListOrdered size={16} />
          {t[lang].order}
        </button>
        <button 
          onClick={() => setMode('recite')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'recite' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
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
                className={`min-w-[80px] h-10 px-4 rounded-xl border-2 flex items-center justify-center transition-colors ${filledWord ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
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
                className="bg-white px-5 py-3 rounded-xl shadow-sm font-bold text-blue-600 border border-blue-100 hover:bg-blue-50 active:scale-95 transition-all"
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
                className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow-sm"
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

// --- Game Mode 3: Recitation (Voice Recognition) ---
function ReciteGame({ lesson, onSuccess, lang }: { lesson: Lesson, onSuccess: () => void, lang: Language }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<{ score: number, matchedWords: boolean[], originalWords: string[] } | null>(null);
  const [error, setError] = useState('');

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const currentSessionTranscriptRef = useRef('');

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'ar-SA';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let sessionString = '';
        for (let i = 0; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript.trim();
          if (!chunk) continue;

          if (i > 0) {
            const prevChunk = event.results[i-1][0].transcript.trim();
            // Workaround for Android Chrome bug where it duplicates previous results
            if (prevChunk && chunk.startsWith(prevChunk)) {
              const newPart = chunk.substring(prevChunk.length).trim();
              if (newPart) {
                sessionString += newPart + ' ';
              }
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
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setError(t[lang].micPermission);
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        // If the user didn't explicitly stop it, it means the browser paused it automatically.
        // We need to restart it to keep listening!
        if (isRecordingRef.current) {
          if (currentSessionTranscriptRef.current) {
            fullTranscriptRef.current = (fullTranscriptRef.current + ' ' + currentSessionTranscriptRef.current).trim();
            currentSessionTranscriptRef.current = '';
          }
          try {
            rec.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = rec;
    } else {
      setError(t[lang].speechNotSupported);
    }
  }, [lang]);

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

  const checkRecitation = () => {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current?.stop();
    }

    const originalWords = lesson.text.split(' ').filter(w => w.trim() !== '' && w !== '۝');
    const normalizedOriginal = originalWords.map(w => normalizeArabic(w));
    const normalizedTranscript = normalizeArabic(transcript).split(' ').filter(w => w);

    if (normalizedTranscript.length === 0) {
       setError(t[lang].didNotHear);
       return;
    }

    let matchCount = 0;
    const matchedWords = normalizedOriginal.map((origWord) => {
      // Forgiving match: check if the spoken words contain the target word
      const found = normalizedTranscript.includes(origWord);
      if (found) matchCount++;
      return found;
    });

    const score = Math.round((matchCount / normalizedOriginal.length) * 100);
    setResult({ score, matchedWords, originalWords });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col items-center text-center overflow-y-auto">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm w-full font-bold">
          {error}
        </div>
      )}

      {!result ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full flex-1 justify-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors ${isRecording ? 'bg-red-100' : 'bg-blue-50'}`}>
            <Mic size={40} className={isRecording ? "text-red-500 animate-pulse" : "text-blue-500"} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{t[lang].smartRecitationChallenge}</h3>
          <p className="text-slate-500 mb-6">{t[lang].recitationInstructions}</p>
          
          {transcript && (
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 min-h-[80px]">
              <p className="text-slate-700 font-medium">{transcript}</p>
            </div>
          )}

          <div className="flex gap-3 w-full mt-auto">
            <button 
              onClick={toggleRecording}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-colors shadow-sm ${isRecording ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-800 text-white shadow-slate-200'}`}
            >
              {isRecording ? t[lang].stopRecording : t[lang].startReciting}
            </button>

            {transcript && !isRecording && (
              <button 
                onClick={checkRecitation}
                className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-md shadow-blue-200"
              >
                <Check size={20} />
                {t[lang].checkMyMemorization}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col items-center">
          <div className="mb-6 text-center">
            <div className="text-5xl mb-2">{result.score >= 80 ? '🌟' : '💪'}</div>
            <h3 className={`text-2xl font-bold ${result.score >= 80 ? 'text-green-500' : 'text-amber-500'}`}>
              {t[lang].resultScore.replace('{score}', String(result.score))}
            </h3>
            <p className="text-slate-500 mt-1">
              {result.score >= 80 ? t[lang].excellentMemorization : t[lang].goodTryReview}
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 w-full text-right leading-loose text-xl font-medium">
            {result.originalWords.map((word, index) => (
              <span 
                key={index} 
                className={`inline-block mx-1 px-1 rounded ${result.matchedWords[index] ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50 underline decoration-red-300'}`}
              >
                {word}
              </span>
            ))}
          </div>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => { setResult(null); setTranscript(''); }}
              className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 hover:bg-slate-200"
            >
              <RefreshCw size={20} />
              {t[lang].reciteAgain}
            </button>
            {result.score >= 80 && (
              <button 
                onClick={onSuccess}
                className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-md shadow-green-200"
              >
                <Coins size={20} />
                {t[lang].claimReward}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// --- Parent Screen (Dashboard) ---
function ParentScreen({ lessons, setLessons, lang }: { lessons: Lesson[], setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>, lang: Language }) {
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
    if (newTitle.trim() && newText.trim()) {
      setLessons([...lessons, { id: Date.now().toString(), title: newTitle, text: newText }]);
      setNewTitle('');
      setNewText('');
    }
  };

  const handleAddQuran = async () => {
    setIsLoadingQuran(true);
    try {
      const data = await fetchAyahs(selectedSurah, startAyah, endAyah);
      const selectedAyahs = data.ayahs;
      
      // Join ayahs with the beautiful end-of-ayah symbol
      let text = selectedAyahs.map((a: any) => a.text).join(' ۝ ') + ' ۝';
      const surahName = data.surahName;
      const title = `${surahName} ${t[lang].ayahsRange.replace('{start}', String(startAyah)).replace('{end}', String(endAyah))}`;
      
      setLessons([...lessons, { id: Date.now().toString(), title, text }]);
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

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-8">
        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button 
            onClick={() => setAddMode('quran')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${addMode === 'quran' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Book size={16} />
            {t[lang].quran}
          </button>
          <button 
            onClick={() => setAddMode('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${addMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea 
              placeholder={t[lang].taskText}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
                <p>{t[lang].loadingSurahs}</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-bold text-slate-600 mb-1">{t[lang].chooseSurah}:</label>
                  <select 
                    value={selectedSurah}
                    onChange={(e) => {
                      const num = parseInt(e.target.value);
                      setSelectedSurah(num);
                      setStartAyah(1);
                      const surah = surahs.find(s => s.number === num);
                      setEndAyah(surah ? surah.numberOfAyahs : 1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {surahs.map(s => (
                      <option key={s.number} value={s.number}>{s.number}. {s.name}</option>
                    ))}
                  </select>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddQuran}
                  disabled={isLoadingQuran}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
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

