import { createContext, useContext, useEffect, useState } from "react"
import i18n from "@/lib/i18n"

type Language = "BI" | "BM"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  BI: {
    dashboard: "Dashboard",
    profile: "Profile",
    selfCheck: "Self Check",
    schedule: "Schedule",
    medication: "Medication",
    vitals: "Vitals",
    aiAssistant: "AI Assistant",
    education: "Education",
    helpSupport: "Help & Support",
    welcomeBack: "Welcome Back",
    myProfile: "My Profile",
    personalInformation: "Personal Information",
    preferences: "Preferences",
    currentMedication: "Current Medication",
    baselineHealthData: "Baseline Health Data",
    language: "Language",
    coinCollection: "Coin Collection",
    saveProfile: "Save Profile",
    backToDashboard: "Back to Dashboard",

    // profile
    profileDesc: "Manage your personal details, baseline health data, medication and preferences.",
    baselineLocked: "Baseline Locked",
    baselineNotice: "These baseline values are saved as your reference profile and cannot be edited directly. You can still update your medication and language preference.",
    fullName: "Full Name",
    age: "Age",
    icNumber: "IC Number",
    bloodPressureSystolic: "Blood Pressure - Systolic",
    bloodPressureDiastolic: "Blood Pressure - Diastolic",
    heartRate: "Heart Rate (bpm)",
    dryWeight: "Dry Weight (kg)",
    height: "Height (cm)",
    bmi: "BMI",
    enterFullName: "Enter full name",
    enterAge: "Enter age",
    enterIcNumber: "Enter IC number",
    enterCurrentMedication: "Enter current medication...",
    saving: "Saving...",

    // dashboard
    dashboardWelcome: "Welcome Back",
    dashboardChooseSection: "Please choose a section to continue your care.",
    syncRequired: "Sync Required:",
    openAppToSync: "Open the MyHFGuard app to sync your latest data.",
    dismiss: "Dismiss",
    myLearning: "My Learning",
    myLearningDesc: "Learn modern, useful heart failure knowledge and self-care guidance.",
    mySelfCheck: "My Self-Check",
    mySelfCheckDesc: "Manage all your heart health records with MyHFGuard.",
    myWaterDiet: "My Water & Diet",
    myWaterDietDesc: "Track healthy water intake and follow heart-friendly diet guidance.",
    myExercise: "My Exercise",
    myExerciseDesc: "Follow safe exercise guidance and daily physical activity support.",
    myMedicationReminder: "My Medication & Reminder",
    myMedicationReminderDesc: "Put medication records and reminders in one place.",
    myChat: "My Chat",
    myChatDesc: "Chat with AI assistant for support, guidance and heart health questions.",
    patient: "Patient",
    lastSynced: "Last Synced",

    // exercise 
    exerciseTitle: "My Exercise",
    exerciseDesc: "Track your activity, monitor smart band data and improve safely over time.",
    weeklyGoal: "Weekly Goal",
    selectGoal: "Select one goal to focus on for this week.",
    saveGoal: "Save Goal",
    goalSaved: "Weekly goal saved",
    currentGoal: "Current weekly goal",
    dailyTarget: "Daily Target",
    minimumTarget: "Minimum target",
    stepsPerDay: "steps per day",
    stepsCompleted: "steps completed",
    targetAchieved: "Target achieved today",
    stepsRemaining: "more steps needed to reach target",
    collectData: "Collect Data",
    collecting: "Collecting...",
    collectDesc: "Load the latest synced exercise-related data available in the system for activity analysis.",
    stepCount: "Step Count",
    distance: "Distance",
    exerciseTime: "Exercise Time",
    oximetry: "Oximetry",
    exerciseReminder: "Exercise Reminder",
    todaySteps: "Today’s steps from smart band",
    distanceDesc: "Distance accumulated in a day",
    exerciseTimeDesc: "Estimated active exercise duration today",
    spo2Desc: "Current average SpO₂ from smart band/device",
    exerciseNotes: "Exercise Module Notes",
    exerciseNotesDesc: "This module currently reads exercise-related data from the latest synced summary data in the system. In the final Android companion app phase, the Collect Data flow can be connected back to direct device synchronization.",
    goalBetterSleep: "Better sleep",
    goalBoostedEnergy: "Boosted daytime energy",
    goalWalkWithEase: "Able to walk with ease without frequent pauses",
    goalLessPain: "Less physical pain",
    goalFeelBetter: "Feel better",
    goalReducedBreathlessness: "Reduced shortness of breath",
    goalLessFatigue: "Less daytime fatigue",
    goalMoreHouseEnergy: "More energy to do things around the house",
    goalMoreSocialEnergy: "Increased desire and energy for social activities",
    goalImprovedAppetite: "Improved appetite",
    exerciseRecommendationReached: "Great job. You reached today's target.",
    exerciseRecommendationGood: "You are doing well. Increase gradually.",
    exerciseRecommendationSlow: "Take it slow and stay consistent.",

    // medication
    medicationReminderDesc: "Medication entered in profile will appear here automatically.",
    totalMedications: "Total medications",
    medicationPageInfo:
    "This page displays medication from the profile page and groups them into 12:00 PM and 10:00 PM reminders.",
    medicationFromProfile: "Medication from Profile",
    medicationFromProfileDesc:
    "This list is pulled automatically from current medication in profile.",
    noMedicationFoundInProfile: "No medication found in profile yet.",
    noonReminder: "Noon Reminder",
    nightReminder: "Night Reminder",
    twelveNoon: "12 noon",
    tenPm: "10 pm",
    nextAppointmentReminder: "Next Appointment Reminder",
    nextAppointmentReminderDesc: "Upcoming reminders based on appointment schedule.",
    noUpcomingAppointmentReminder: "No upcoming appointment reminder yet.",
    reminderSummary: "Reminder Summary",
    twelvePmMedicines: "12:00 PM medicines",
    tenPmMedicines: "10:00 PM medicines",
    noMedicationForThisReminderTime: "No medication available for this reminder time.",
    addReminder: "Add Reminder",
    reminderTitle: "Title",
    reminderTitlePlaceholder: "e.g. Cardiology Follow-up",
    reminderDate: "Date (YYYY-MM-DD)",
    reminderTime: "Time",
    reminderNotes: "Notes",
    reminderNotesPlaceholder: "Optional notes",
    saveReminder: "Save Reminder",
    savingReminder: "Saving...",
    cancel: "Cancel",
    updateReminder: "Update Reminder",
    edit: "Edit",
    delete: "Delete",

    //ai chat
    myChatTitle: "My Chat",
    myChatWelcome: "Hello! I'm your MyHFGuard AI Chat Assistant. I can help answer questions based on your symptoms, reminders, medication and health data.\n\n**Important:** I am not a doctor and cannot diagnose conditions. If you have chest pain, severe breathing difficulty or stroke symptoms, please seek emergency help immediately.\n\nHow can I help you today?",
    patientSummary: "Patient Summary",
    patientSummaryDesc: "Basic data used to support AI responses",
    latestVitals: "Latest Vitals",
    chatSummaryNote: "The AI uses your stored profile and health-related records to give more personalized answers.",
    chatWithAssistant: "Chat with AI Assistant",
    chatWithAssistantDesc: "Ask about symptoms, reminders, medication, vitals or general health guidance.",
    chatPromptVitals: "What do my recent vitals indicate?",
    chatPromptBreathless: "I'm feeling short of breath, what should I do?",
    chatPromptMedication: "What medicine do I need to take tonight?",
    chatPromptDoctor: "What signs mean I should call my doctor?",
    suggestedQuestions: "Suggested Questions",
    aiAnalyzing: "Analyzing your health data...",
    aiMedicalDisclaimer: "AI provides information, not diagnosis. Consult a doctor for medical advice.",
    chatInputPlaceholder: "Type your question here...",
    aiResponseFailed: "Failed to get response. Please try again.",
    aiFallbackError: "I'm sorry, I encountered an error processing your request. Please try again or contact your healthcare provider if you have urgent concerns.",
    bloodPressure: "Blood Pressure",
    noRecordFound: "No record found",
    noMedicationFound: "No medication found",
    noUpcomingReminder: "No upcoming reminder",
  },

  BM: {
    dashboard: "Papan Pemuka",
    profile: "Profil",
    selfCheck: "Semakan Kendiri",
    schedule: "Jadual",
    medication: "Ubat",
    vitals: "Vital",
    aiAssistant: "Pembantu AI",
    education: "Pendidikan",
    helpSupport: "Bantuan & Sokongan",
    welcomeBack: "Selamat Kembali",
    myProfile: "Profil Saya",
    personalInformation: "Maklumat Peribadi",
    preferences: "Keutamaan",
    currentMedication: "Ubat Semasa",
    baselineHealthData: "Data Kesihatan Asas",
    language: "Bahasa",
    coinCollection: "Koleksi Syiling",
    saveProfile: "Simpan Profil",
    backToDashboard: "Kembali ke Papan Pemuka",

    // profile
    profileDesc: "Urus maklumat peribadi, data kesihatan asas, ubat dan keutamaan anda.",
    baselineLocked: "Asas Dikunci",
    baselineNotice: "Nilai asas ini disimpan sebagai profil rujukan anda dan tidak boleh diedit secara langsung. Anda masih boleh mengemas kini ubat dan bahasa pilihan anda.",
    fullName: "Nama Penuh",
    age: "Umur",
    icNumber: "Nombor IC",
    bloodPressureSystolic: "Tekanan Darah - Sistolik",
    bloodPressureDiastolic: "Tekanan Darah - Diastolik",
    heartRate: "Kadar Nadi (bpm)",
    dryWeight: "Berat Kering (kg)",
    height: "Tinggi (cm)",
    bmi: "BMI",
    enterFullName: "Masukkan nama penuh",
    enterAge: "Masukkan umur",
    enterIcNumber: "Masukkan nombor IC",
    enterCurrentMedication: "Masukkan ubat semasa...",
    saving: "Menyimpan...",

    // dashboard
    dashboardWelcome: "Selamat Kembali",
    dashboardChooseSection: "Sila pilih bahagian untuk meneruskan penjagaan anda.",
    syncRequired: "Penyegerakan Diperlukan:",
    openAppToSync: "Buka aplikasi MyHFGuard untuk menyegerakkan data terkini anda.",
    dismiss: "Tutup",
    myLearning: "Pembelajaran Saya",
    myLearningDesc: "Pelajari ilmu kegagalan jantung moden dan panduan penjagaan kendiri.",
    mySelfCheck: "Semakan Kendiri Saya",
    mySelfCheckDesc: "Urus semua rekod kesihatan jantung anda dengan MyHFGuard.",
    myWaterDiet: "Air & Diet Saya",
    myWaterDietDesc: "Jejak pengambilan air sihat dan ikut panduan diet mesra jantung.",
    myExercise: "Senaman Saya",
    myExerciseDesc: "Ikuti panduan senaman selamat dan sokongan aktiviti fizikal harian.",
    myMedicationReminder: "Ubat & Peringatan Saya",
    myMedicationReminderDesc: "Letakkan rekod ubat dan peringatan di satu tempat.",
    myChat: "Sembang Saya",
    myChatDesc: "Berbual dengan pembantu AI untuk sokongan, panduan dan soalan kesihatan jantung.",
    patient: "Pesakit",
    lastSynced: "Terakhir Disegerakkan",

    // exercise
    exerciseTitle: "Senaman Saya",
    exerciseDesc: "Jejak aktiviti anda, pantau data smart band dan tingkatkan secara selamat dari masa ke masa.",
    weeklyGoal: "Matlamat Mingguan",
    selectGoal: "Pilih satu matlamat untuk minggu ini.",
    saveGoal: "Simpan Matlamat",
    goalSaved: "Matlamat mingguan disimpan",
    currentGoal: "Matlamat semasa",
    dailyTarget: "Sasaran Harian",
    minimumTarget: "Sasaran minimum",
    stepsPerDay: "langkah sehari",
    stepsCompleted: "langkah dicapai",
    targetAchieved: "Sasaran dicapai hari ini",
    stepsRemaining: "langkah lagi diperlukan",
    collectData: "Kutip Data",
    collecting: "Mengambil data...",
    collectDesc: "Muatkan data senaman terkini daripada sistem untuk analisis aktiviti.",
    stepCount: "Jumlah Langkah",
    distance: "Jarak",
    exerciseTime: "Masa Senaman",
    oximetry: "Oksimetri",
    exerciseReminder: "Peringatan Senaman",
    todaySteps: "Langkah hari ini dari smart band",
    distanceDesc: "Jumlah jarak dalam sehari",
    exerciseTimeDesc: "Anggaran tempoh senaman hari ini",
    spo2Desc: "Purata SpO₂ semasa daripada peranti",
    exerciseNotes: "Nota Modul Senaman",
    exerciseNotesDesc: "Modul ini menggunakan data terkini daripada sistem. Pada fasa aplikasi Android nanti, fungsi ini boleh disambungkan terus ke smart band.",
    goalBetterSleep: "Tidur lebih baik",
    goalBoostedEnergy: "Lebih bertenaga pada waktu siang",
    goalWalkWithEase: "Boleh berjalan dengan lebih mudah tanpa kerap berhenti",
    goalLessPain: "Kurang sakit fizikal",
    goalFeelBetter: "Berasa lebih sihat",
    goalReducedBreathlessness: "Kurang sesak nafas",
    goalLessFatigue: "Kurang keletihan pada waktu siang",
    goalMoreHouseEnergy: "Lebih bertenaga untuk melakukan kerja rumah",
    goalMoreSocialEnergy: "Lebih keinginan dan tenaga untuk aktiviti sosial",
    goalImprovedAppetite: "Selera makan bertambah baik",
    exerciseRecommendationReached: "Syabas. Anda telah mencapai sasaran hari ini.",
    exerciseRecommendationGood: "Anda menunjukkan kemajuan yang baik. Tingkatkan secara beransur-ansur.",
    exerciseRecommendationSlow: "Lakukan perlahan-lahan dan kekal konsisten.",

    //medication
    medicationReminderDesc: "Ubat yang dimasukkan dalam profil akan dipaparkan di sini secara automatik.",
    totalMedications: "Jumlah ubat",
    medicationPageInfo:
    "Halaman ini memaparkan ubat daripada halaman profil dan mengelompokkannya kepada peringatan 12:00 PM dan 10:00 PM.",
    medicationFromProfile: "Ubat daripada Profil",
    medicationFromProfileDesc:
    "Senarai ini diambil secara automatik daripada ubat semasa dalam profil.",
    noMedicationFoundInProfile: "Tiada ubat dijumpai dalam profil lagi.",
    noonReminder: "Peringatan Tengah Hari",
    nightReminder: "Peringatan Malam",
    twelveNoon: "12 tengah hari",
    tenPm: "10 malam",
    nextAppointmentReminder: "Peringatan Temujanji Seterusnya",
    nextAppointmentReminderDesc: "Peringatan akan datang berdasarkan jadual temujanji.",
    noUpcomingAppointmentReminder: "Tiada peringatan temujanji akan datang lagi.",
    reminderSummary: "Ringkasan Peringatan",
    twelvePmMedicines: "Ubat 12:00 PM",
    tenPmMedicines: "Ubat 10:00 PM",
    noMedicationForThisReminderTime: "Tiada ubat untuk waktu peringatan ini.",
    addReminder: "Tambah Peringatan",
    reminderTitle: "Tajuk",
    reminderTitlePlaceholder: "cth. Temujanji Susulan Kardiologi",
    reminderDate: "Tarikh (YYYY-MM-DD)",
    reminderTime: "Masa",
    reminderNotes: "Nota",
    reminderNotesPlaceholder: "Nota pilihan",
    saveReminder: "Simpan Peringatan",
    savingReminder: "Menyimpan...",
    cancel: "Batal",
    updateReminder: "Kemas Kini Peringatan",
    edit: "Edit",
    delete: "Padam",

    //ai chat
    myChatTitle: "Sembang Saya",
    myChatWelcome: "Hai! Saya pembantu AI MyHFGuard anda. Saya boleh membantu menjawab soalan berdasarkan simptom, peringatan, ubat dan data kesihatan anda.\n\n**Penting:** Saya bukan doktor dan tidak boleh membuat diagnosis. Jika anda mengalami sakit dada, kesukaran bernafas yang teruk, atau simptom strok, sila dapatkan bantuan kecemasan segera.\n\nBagaimana saya boleh membantu anda hari ini?",
    patientSummary: "Ringkasan Pesakit",
    patientSummaryDesc: "Data asas yang digunakan untuk menyokong jawapan AI",
    latestVitals: "Vital Terkini",
    chatSummaryNote: "AI menggunakan profil tersimpan dan rekod berkaitan kesihatan anda untuk memberi jawapan yang lebih diperibadikan.",
    chatWithAssistant: "Sembang dengan Pembantu AI",
    chatWithAssistantDesc: "Tanya tentang simptom, peringatan, ubat, vital atau panduan kesihatan umum.",
    chatPromptVitals: "Apakah maksud vital terkini saya?",
    chatPromptBreathless: "Saya rasa sesak nafas, apa yang perlu saya lakukan?",
    chatPromptMedication: "Ubat apa yang perlu saya ambil malam ini?",
    chatPromptDoctor: "Apakah tanda-tanda saya perlu hubungi doktor?",
    suggestedQuestions: "Soalan Cadangan",
    aiAnalyzing: "Sedang menganalisis data kesihatan anda...",
    aiMedicalDisclaimer: "AI memberi maklumat, bukan diagnosis. Sila rujuk doktor untuk nasihat perubatan.",
    chatInputPlaceholder: "Taip soalan anda di sini...",
    aiResponseFailed: "Gagal mendapatkan jawapan. Sila cuba lagi.",
    aiFallbackError: "Maaf, saya menghadapi ralat semasa memproses permintaan anda. Sila cuba lagi atau hubungi penyedia penjagaan kesihatan anda jika anda mempunyai kebimbangan yang mendesak.",
    bloodPressure: "Tekanan Darah",
    noRecordFound: "Tiada rekod ditemui",
    noMedicationFound: "Tiada rekod ubat ditemui",
    noUpcomingReminder: "Tiada peringatan akan datang",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("BI")

  useEffect(() => {
    const saved = localStorage.getItem("appLanguage") as Language | null
    const langFromI18n = i18n.language === "ms" ? "BM" : "BI"
    if (saved === "BI" || saved === "BM") {
      setLanguageState(saved)
    } else {
      setLanguageState(langFromI18n)
    }

    const handleSync = () => {
      setLanguageState(i18n.language === "ms" ? "BM" : "BI")
    }

    window.addEventListener("app-language-sync", handleSync)
    i18n.on("languageChanged", handleSync)
    return () => {
      window.removeEventListener("app-language-sync", handleSync)
      i18n.off("languageChanged", handleSync)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("appLanguage", lang)
    const i18nLang = lang === "BM" ? "ms" : "en"
    localStorage.setItem("lang", i18nLang)
    i18n.changeLanguage(i18nLang)
  }

  const t = (key: string) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider")
  }
  return context
}