import i18n from "i18next"
import { initReactI18next } from "react-i18next"

const resources = {
  en: {
    translation: {
      nav: {
        menu: "Menu",
        quickAccess: "Quick access",
        dashboard: "Dashboard",
        education: "My Learning",
        selfCheck: "My Self-Check",
        waterDiet: "My Water & Diet",
        exercise: "My Exercise",
        medication: "My Medication & Reminder",
        aiAssistant: "My Chat",
        helpSupport: "Help & Support",
        profile: "Profile",
        logout: "Logout"
      },

      common: {
        appName: "MyHFGuard",
        save: "Save",
        submit: "Submit",
        cancel: "Cancel",
        update: "Update",
        delete: "Delete",
        edit: "Edit",
        close: "Close",
        back: "Back",
        next: "Next",
        loading: "Loading...",
        noData: "No data available",
        openMenu: "Open menu",
        today: "Today",
        welcomeToMyHFGuard: "Heart failure self-care management",
        enterValue: "Enter value",
        selectDate: "Select date",
        notes: "Notes",
      },

      dashboard: {
        title: "Dashboard",
        subtitle: "Overview of your heart failure self-care progress",
        welcome: "Welcome back",
        summary: "Here is your latest health summary.",
        recentActivity: "Recent Activity",
        reminders: "Reminders",
        healthOverview: "Health Overview",
      },

      selfCheck: {
        appName: "MyHFGuard",
        title: "Self Check Toolkits",
        description: "Log your daily measurements, symptoms, and blood pressure readings",
        today: "today",
        missing: "Missing",
        completed: "Completed",

        weightTab: "Daily Weight",
        symptomsTab: "Symptoms Rating",
        vitalsTab: "Vitals Tracker",

        dailyWeightTitle: "Daily Weight (kg)",
        weightLabel: "Weight",
        weightHelp: "Use weighing scale or smart detection",
        loadingPatient: "Loading patient info...",
        enterWeight: "Enter Weight to Submit",
        saving: "Saving...",
        logWeight: "Log Weight",
        fetchingPatient: "Fetching patient details...",
        enterWeightHint: "Please enter your weight above to enable submission.",
        weightLoggedMessage: "You have already logged weight for {{date}}.",

        symptomsTitle: "Symptoms Rating",
        symptomsGuide: "Rate each symptom: 0 = No symptom, 1 = Mild, 5 = Severe",
        logSymptoms: "Log Symptoms",
        symptomsLoggedMessage: "You have already logged symptoms for {{date}}.",
        noSymptom: "No symptom",
        mild: "Mild",
        severe: "Severe",

        symptoms: {
          cough: "Cough",
          breathlessness: "Shortness of breath when active",
          swelling: "Swelling of legs",
          weightGain: "Sudden weight gain > 2kg in 3 days",
          abdomen: "Discomfort/swelling in abdomen",
          sleeping: "Breathless when sleeping"
        },

        scanMonitor: "Scan Monitor",
        manualEntry: "Manual Entry",
        uploadImage: "Click to upload image",
        useCamera: "Use Camera",
        capturePhoto: "Capture Photo",
        processImage: "Process Image",
        uploadDifferent: "Upload Different Image",
        annotatedResult: "Annotated Result:",
        verifyEdit: "Verify & Edit Values",
        recordedAt: "Recorded",
        recordingAt: "Recording at",
        saveResult: "Save Result",
        saveReading: "Save Reading",
        systolic: "Systolic (mmHg)",
        diastolic: "Diastolic (mmHg)",
        pulse: "Pulse (bpm)",

        recentReadings: "Recent Readings",
        noReadings: "No readings recorded yet.",

        invalidWeightTitle: "Invalid Weight",
        invalidWeightDesc: "Please enter a valid weight of at least 20kg.",
        confirmWeight: "Are you sure you want to submit this weight reading for {{date}}?",
        confirmSymptoms: "Are you sure you want to submit these symptom ratings for {{date}}?",

        cancel: "Cancel",
        confirm: "Confirm",
        ok: "OK",

        pictureGuideTitle: "How to Take a Good Picture",
        pictureGuideDesc:
          "Please center the blood pressure monitor and ensure it's facing upright, not slanted. This helps our system accurately read the values.",
        correct: "Correct",
        incorrect: "Incorrect",
        correctDesc: "Monitor is straight and clearly visible",
        incorrectDesc: "Monitor is tilted or off-center",
        gotIt: "Got It / Continue",

        toast: {
          weightSaved: "Weight saved",
          weightFailed: "Failed to save weight",
          symptomsSaved: "Symptoms saved",
          symptomsFailed: "Failed to save symptoms",
          identifyUser: "Unable to identify user. Please log in again.",
          scanComplete: "Scan complete! Please verify and save the readings.",
          processImageFailed: "Failed to process image. Please try again with a clearer image.",
          bpSaved: "Blood pressure reading saved successfully!",
          vitalsFailed: "Failed to save vitals",
          cameraUnsupported: "Camera access is not supported in this browser. Please use a modern browser or upload an image instead.",
          cameraDenied: "Camera permission denied. Please allow camera access in your browser settings.",
          cameraNotFound: "No camera found on this device. Please upload an image instead.",
          cameraFailed: "Failed to access camera. Please check permissions or upload an image instead."
        }
      },

      schedule: {
        title: "Schedule",
        subtitle: "Manage your appointments and reminders",
        appointments: "Appointments",
        reminders: "Reminders",
        medicationReminder: "Medication Reminder",
        followUpVisit: "Follow-up Visit",
        addSchedule: "Add Schedule",
        date: "Date",
        time: "Time",
        description: "Description",
        noSchedule: "No schedule available",
      },

      vitals: {
        title: "Vitals Tracker",
        subtitle: "Track your important vital signs",
        heartRate: "Heart Rate",
        bloodPressure: "Blood Pressure",
        oxygenLevel: "Oxygen Level",
        bodyTemperature: "Body Temperature",
        respiratoryRate: "Respiratory Rate",
        recordVitals: "Record Vitals",
        latestReading: "Latest Reading",
        history: "History",
      },

      education: {
        pageTitle: "Educational Resources",
        pageDescription:
          "Learn about heart failure management through structured modules and submodules with in-app reading content.",
        searchPlaceholder: "Search modules or submodules",
        searchAria: "Search educational modules",
        moduleLabel: "Module",
        closeContent: "Close content",
        learningContent: "Learning Content",
        viewSource: "View Source",
        showSubmodules: "Show Submodules",
        hideSubmodules: "Hide Submodules",
        readContent: "Read Content",
        featuresTitle: "Educational Content Features",
        featuresFooter: "Educational content adapted for in-app learning display.",
        features: {
          guides: "Written guides and summarized learning content",
          structured: "Structured modules with submodules",
          warning: "Quick access to warning signs and self-care information"
        },

        modules: {
          A: {
            title: "Understanding Heart Failure",
            description:
              "Learn the basics about heart failure, how it affects your body, and what it means for daily life.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Overview of heart failure and why understanding it matters.",
                content:
                  "Heart failure does not mean that the heart has stopped working. It means the heart is not pumping blood as effectively as it should. This can make it harder for the body to get enough oxygen and nutrients. Understanding heart failure helps patients and caregivers recognize symptoms early, follow treatment plans, and make daily lifestyle adjustments that support better health."
              },
              whatIsHF: {
                title: "What heart failure is",
                description: "What heart failure means and how it can affect everyday life.",
                content:
                  "Heart failure is a long-term condition in which the heart cannot pump enough blood to meet the body’s needs. It may affect breathing, energy levels, physical activity, sleep, and daily routines. Some people experience it gradually, while others may notice sudden worsening of symptoms."
              },
              symptoms: {
                title: "Heart failure symptoms",
                description: "Early signs, symptoms, and what to do next.",
                content:
                  "Common symptoms of heart failure include shortness of breath, tiredness, swollen ankles or legs, rapid weight gain, coughing at night, and difficulty doing normal daily activities. If symptoms get worse suddenly, it is important to contact a healthcare professional as soon as possible."
              },
              normalHeart: {
                title: "How the normal heart works",
                description: "Simple explanation of how the heart pumps blood.",
                content:
                  "The heart is a muscular pump with four chambers. Its job is to move oxygen-rich blood around the body and return oxygen-poor blood to the lungs. When the heart works normally, it contracts and relaxes in a regular rhythm to keep blood flowing efficiently."
              },
              types: {
                title: "Types of heart failure",
                description: "Understand the different forms and classifications of heart failure.",
                content:
                  "Heart failure can be described in different ways, such as left-sided or right-sided heart failure, acute or chronic heart failure, and heart failure with reduced or preserved ejection fraction. These terms help doctors understand how the heart is affected and decide on the most suitable treatment."
              }
            }
          },

          B: {
            title: "Heart Failure Causes & Other Conditions",
            description:
              "Explore common causes of heart failure and other medical conditions that may be related.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Overview of causes and associated medical conditions.",
                content:
                  "Heart failure can develop because of different heart and health problems. In many patients, it is linked to more than one underlying cause. Learning about these causes can help patients better understand their condition and support prevention or early treatment."
              },
              commonHeartConditions: {
                title: "Common heart conditions",
                description: "Heart conditions that may lead to heart failure.",
                content:
                  "Some heart conditions that may lead to heart failure include coronary artery disease, previous heart attack, high blood pressure, heart valve disease, and cardiomyopathy. These conditions can weaken the heart or make it work harder over time."
              },
              otherMedicalConditions: {
                title: "Other common medical conditions",
                description: "Other illnesses and conditions linked with heart failure.",
                content:
                  "Other conditions such as diabetes, kidney disease, obesity, lung disease, thyroid disorders, and anemia may also affect heart failure. Managing these related conditions is an important part of improving overall health and reducing complications."
              }
            }
          },

          C: {
            title: "What You Can Do",
            description:
              "Practical steps and lifestyle changes you can make to manage heart failure effectively.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Overview of self-care and daily management.",
                content:
                  "Managing heart failure involves daily self-care. Patients can improve their quality of life by monitoring symptoms, taking medicines correctly, staying active within safe limits, eating a balanced diet, and attending regular medical reviews."
              },
              bloodPressurePulse: {
                title: "Check blood pressure and pulse",
                description: "How to measure blood pressure and pulse accurately at home.",
                content:
                  "Checking blood pressure and pulse at home helps patients monitor changes in their condition. Measurements should be taken at about the same time each day, in a seated and relaxed position. Keeping a record can help doctors adjust treatment if necessary."
              },
              lifestyleChanges: {
                title: "Lifestyle changes",
                description: "Healthy habits to improve control and wellbeing.",
                content:
                  "Helpful lifestyle changes include reducing salt intake, stopping smoking, limiting alcohol, staying physically active as advised, maintaining a healthy weight, and getting enough rest. Small daily habits can make a big difference in symptom control."
              },
              managingMedicines: {
                title: "Managing medicines",
                description: "Medicine routines, reviews, and side effects.",
                content:
                  "Heart failure medicines should be taken exactly as prescribed. Patients should know the purpose of each medicine, possible side effects, and what to do if a dose is missed. Regular medication reviews are important to make sure treatment remains effective."
              },
              supportGroups: {
                title: "Support groups",
                description: "Find communities and support resources.",
                content:
                  "Support groups can help patients and families feel less isolated. They offer practical advice, emotional support, and shared experiences from others living with similar conditions. Support may be available through hospitals, charities, or community organizations."
              }
            }
          },

          D: {
            title: "Living with Heart Failure",
            description:
              "Tips and strategies for maintaining quality of life while managing heart failure.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Daily life with heart failure and practical coping strategies.",
                content:
                  "Living with heart failure means learning how to manage symptoms while continuing daily life as safely and comfortably as possible. Good planning, family support, and regular follow-up can help patients stay active and independent for longer."
              },
              travel: {
                title: "Travel",
                description: "What to plan before travelling.",
                content:
                  "Before travelling, patients should make sure they have enough medicines, copies of prescriptions, and information about their condition. It is also important to avoid overexertion, stay hydrated as advised, and plan rest breaks during the journey."
              },
              vaccines: {
                title: "Vaccines",
                description: "Recommended vaccines and why they matter.",
                content:
                  "Vaccinations may help reduce the risk of infections that could worsen heart failure. Patients are often advised to discuss flu and pneumonia vaccines with their healthcare providers, especially if they are older or have other health problems."
              },
              workAdjustments: {
                title: "Work and adjustments",
                description: "Returning to work and making suitable adjustments.",
                content:
                  "Some patients are able to continue working with suitable adjustments, such as reduced hours, lighter physical tasks, or more flexible schedules. Employers and healthcare professionals may work together to support safe return-to-work planning."
              },
              emotions: {
                title: "Emotions and relationships",
                description: "Support for emotions, family life, and relationships.",
                content:
                  "Heart failure can affect emotions, confidence, and relationships. Patients may feel worried, frustrated, or low at times. Talking openly with family, friends, or healthcare professionals can help, and emotional support is an important part of care."
              }
            },
            
          },

          E: {
            title: "For Caregivers",
            description:
              "Essential information and support resources for family members and caregivers.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Starting point for families and caregivers.",
                content:
                  "Caregivers play an important role in helping patients manage heart failure. They may assist with medicines, appointments, emotional support, symptom monitoring, and daily routines. Having the right information can help caregivers feel more prepared and confident."
              },
              howToHelp: {
                title: "How you can help",
                description: "Simple checklist of ways caregivers can help.",
                content:
                  "Caregivers can help by encouraging medicine adherence, supporting healthy lifestyle choices, attending appointments, watching for warning signs, and helping the patient keep records of symptoms and weight changes. Good communication is key."
              },
              caringStress: {
                title: "Caring stress",
                description: "Recognising stress and looking after yourself.",
                content:
                  "Providing care can be physically and emotionally demanding. Caregivers should also look after their own wellbeing by getting enough rest, asking for help when needed, and speaking to support services if they feel overwhelmed."
              },
              financialConcerns: {
                title: "Financial concerns",
                description: "Benefits, support, and practical steps.",
                content:
                  "Financial concerns may arise because of healthcare costs, transport needs, changes in work, or caregiving responsibilities. Families may benefit from seeking advice about support schemes, financial planning, and community assistance."
              },
              supportServices: {
                title: "Support services",
                description: "People and services that can help caregivers.",
                content:
                  "Support may come from nurses, doctors, social workers, charities, community groups, and family networks. Caregivers should know that asking for support is part of good care, not a sign of weakness."
              }
            }
          },

          H: {
            title: "Warning Signs",
            description:
              "Learn to recognize important warning signs and when to seek immediate medical attention.",
            submodules: {
              introduction: {
                title: "Introduction",
                description: "Overview of warning signs that should not be ignored.",
                content:
                  "Patients with heart failure should know the warning signs that may suggest their condition is worsening. Early recognition can help prevent serious complications and support faster treatment."
              },
              shortnessOfBreath: {
                title: "Shortness of breath",
                description: "When breathlessness means you should get help.",
                content:
                  "Breathlessness that becomes more severe, happens suddenly, or occurs even at rest may be a sign that heart failure is worsening. If this happens, patients should seek medical advice quickly, especially if symptoms are new or much worse than usual."
              },
              chestPain: {
                title: "Chest pain",
                description: "When chest pain needs urgent medical attention.",
                content:
                  "Chest pain should never be ignored. It may be a sign of a serious heart problem and can require urgent medical attention. Patients should seek emergency help if chest pain is severe, sudden, or associated with other alarming symptoms."
              },
              rapidWeightGain: {
                title: "Rapid weight gain",
                description: "A key sign of fluid retention.",
                content:
                  "Rapid weight gain over a short period may suggest fluid retention. Monitoring daily weight can help detect changes early. Patients should report unusual increases in weight to their healthcare provider."
              },
              swellingLegs: {
                title: "Swelling in legs or ankles",
                description: "Possible sign of fluid build-up.",
                content:
                  "Swelling in the legs, ankles, or feet may be caused by fluid build-up. If swelling becomes worse, appears suddenly, or is associated with other worsening symptoms, medical advice should be sought."
              }
            }
          }
        }
      },

      helpSupport: {
        title: "Help & Support",
        subtitle: "Get support, emergency guidance and help for using MyHFGuard.",

        aboutTitle: "About MyHFGuard",
        aboutBody: "MyHFGuard helps heart failure patients monitor symptoms, manage reminders, record daily health data and learn self-care more easily.",

        contactUs: "Contact Us",
        needHelp: "Choose the most suitable support option below.",

        emergencyContact: "Emergency Contact",
        emergencyBody: "If you have severe shortness of breath, chest pain, fainting or any urgent medical condition, please contact emergency services immediately. Do not rely on this app for urgent treatment.",

        supportTitle: "Email Support",
        supportBody: "For technical issues or general system support, contact the MyHFGuard support team by email.",

        whatsappTitle: "WhatsApp Support",
        whatsappBody: "For quick communication, you may also contact support through WhatsApp.",

        callButton: "Call Emergency (999)",
        emailButton: "Email Support",
        whatsappButton: "Open WhatsApp",

        disclaimer: "This app is for self-management support only and does not replace professional medical advice, diagnosis or treatment."
      },

      medication: {
        title: "Medication",
        subtitle: "Manage your medication schedule",
        medicineName: "Medicine Name",
        dosage: "Dosage",
        frequency: "Frequency",
        reminderTime: "Reminder Time",
        addMedication: "Add Medication",
      },

      aiAssistant: {
        title: "AI Assistant",
        subtitle: "Ask questions about your symptoms and heart failure care",
        placeholder: "Type your message here...",
        send: "Send",
      },

      waterDiet: {
        title: "My Water and Low Salt Diet",
        subtitle: "Please submit daily or at least 3 times per week.",

        toast: {
          unableSession: "Unable to load session",
          loginFirst: "Please log in first",
          fillWater: "Please enter water restriction and choose cups",
          saved: "Water and low salt diet saved successfully",
          failed: "Failed to save record",
        },

        weekly: {
          title: "Weekly Tracking Status",
          entries: "Entries this week",
          target: "Target",
          targetValue: "3 times",
          status: "Status",
          onTrack: "On Track",
          needMore: "Need More Entries",
        },

        waterCard: {
          title: "My Water Intake",
          limitLabel: "Doctor Water Restriction (ml)",
          placeholder: "Example: 800",
          selectLabel: "Select Today Water Intake (8 cups)",
          selectedIntake: "Selected Intake",
          limitText: "Limit",
        },

        waterStatus: {
          green: "Within Range",
          orange: "Slightly Above Range",
          red: "Exceeded Restriction",
        },

        saltCard: {
          title: "My Low Salt Diet",
          dailyScore: "Daily Salt Score",
        },

        saltOptions: {
          natural: "Natural / Low Salt",
          moderate: "Moderate Salt",
          high: "High Salt",
        },

        saltStatus: {
          green: "Low Salt",
          orange: "Moderate Salt",
          red: "High Salt",
        },

        meals: {
          breakfast: "Breakfast",
          lunch: "Lunch",
          dinner: "Dinner",
        },

        buttons: {
          saving: "Saving...",
          save: "Save Today Entry",
        },

        summary: {
          title: "Latest Summary",
          waterRestriction: "Water Restriction",
          todayWater: "Today Water Intake",
          waterStatus: "Water Status",
          saltStatus: "Salt Status",
        },

        charts: {
          waterGraph: "Water Intake Graph",
          saltGraph: "Low Salt Diet Graph",
          waterLine: "Water Intake (ml)",
          limitLine: "Restriction (ml)",
          saltBar: "Salt Score",
        },

        error: {
          loadTitle: "Failed to load water and salt data.",
          loadDesc: "Please make sure the table water_salt_logs exists in Supabase and RLS policies are added.",
        },
      },

    },
  },

  ms: {
    translation: {
      nav: {
        menu: "Menu",
        dashboard: "Papan Pemuka",
        education: "Pembelajaran Saya",
        selfCheck: "Semakan Kendiri Saya",
        waterDiet: "Air & Diet Saya",
        exercise: "Senaman Saya",
        medication: "Ubat & Peringatan Saya",
        aiAssistant: "Sembang Saya",
        helpSupport: "Bantuan & Sokongan",
        profile: "Profil",
        quickAccess: "Akses pantas",
        logout: "Log Keluar"
      },

      common: {
        appName: "MyHFGuard",
        save: "Simpan",
        submit: "Hantar",
        cancel: "Batal",
        update: "Kemas Kini",
        delete: "Padam",
        edit: "Edit",
        close: "Tutup",
        back: "Kembali",
        next: "Seterusnya",
        loading: "Sedang dimuatkan...",
        noData: "Tiada data tersedia",
        openMenu: "Buka menu",
        today: "Hari ini",
        welcomeToMyHFGuard: "Pengurusan penjagaan kendiri kegagalan jantung",
        enterValue: "Masukkan nilai",
        selectDate: "Pilih tarikh",
        notes: "Catatan",
      },

      dashboard: {
        title: "Papan Pemuka",
        subtitle: "Gambaran keseluruhan kemajuan penjagaan kendiri kegagalan jantung anda",
        welcome: "Selamat kembali",
        summary: "Berikut ialah ringkasan kesihatan terkini anda.",
        recentActivity: "Aktiviti Terkini",
        reminders: "Peringatan",
        healthOverview: "Gambaran Kesihatan",
      },

      selfCheck: {
        appName: "MyHFGuard",
        title: "Alat Pemeriksaan Kendiri",
        description: "Catat ukuran harian, simptom, dan bacaan tekanan darah anda",
        today: "hari ini",
        missing: "Belum lengkap",
        completed: "Selesai",

        weightTab: "Berat Harian",
        symptomsTab: "Penilaian Simptom",
        vitalsTab: "Penjejak Vital",

        dailyWeightTitle: "Berat Harian (kg)",
        weightLabel: "Berat",
        weightHelp: "Gunakan penimbang atau pengesanan pintar",
        loadingPatient: "Memuat maklumat pesakit...",
        enterWeight: "Masukkan Berat untuk Hantar",
        saving: "Menyimpan...",
        logWeight: "Catat Berat",
        fetchingPatient: "Mengambil maklumat pesakit...",
        enterWeightHint: "Sila masukkan berat anda di atas untuk membolehkan penghantaran.",
        weightLoggedMessage: "Anda telah mencatat berat untuk {{date}}.",

        symptomsTitle: "Penilaian Simptom",
        symptomsGuide: "Nilai setiap simptom: 0 = Tiada simptom, 1 = Ringan, 5 = Teruk",
        logSymptoms: "Catat Simptom",
        symptomsLoggedMessage: "Anda telah mencatat simptom untuk {{date}}.",
        noSymptom: "Tiada simptom",
        mild: "Ringan",
        severe: "Teruk",

        symptoms: {
          cough: "Batuk",
          breathlessness: "Sesak nafas semasa aktif",
          swelling: "Bengkak kaki",
          weightGain: "Kenaikan berat badan mendadak > 2kg dalam 3 hari",
          abdomen: "Ketidakselesaan/bengkak pada abdomen",
          sleeping: "Sesak nafas ketika tidur"
        },

        scanMonitor: "Imbas Monitor",
        manualEntry: "Masukan Manual",
        uploadImage: "Klik untuk memuat naik gambar",
        useCamera: "Guna Kamera",
        capturePhoto: "Tangkap Gambar",
        processImage: "Proses Gambar",
        uploadDifferent: "Muat Naik Gambar Lain",
        annotatedResult: "Keputusan Beranotasi:",
        verifyEdit: "Semak & Edit Nilai",
        recordedAt: "Direkodkan pada",
        recordingAt: "Merekod pada",
        saveResult: "Simpan Keputusan",
        saveReading: "Simpan Bacaan",
        systolic: "Sistolik (mmHg)",
        diastolic: "Diastolik (mmHg)",
        pulse: "Nadi (bpm)",

        recentReadings: "Bacaan Terkini",
        noReadings: "Belum ada bacaan direkodkan.",

        invalidWeightTitle: "Berat Tidak Sah",
        invalidWeightDesc: "Sila masukkan berat yang sah sekurang-kurangnya 20kg.",
        confirmWeight: "Adakah anda pasti mahu menghantar bacaan berat ini untuk {{date}}?",
        confirmSymptoms: "Adakah anda pasti mahu menghantar penilaian simptom ini untuk {{date}}?",

        cancel: "Batal",
        confirm: "Sahkan",
        ok: "OK",

        pictureGuideTitle: "Cara Mengambil Gambar Yang Baik",
        pictureGuideDesc:
          "Sila pastikan monitor tekanan darah berada di tengah dan tegak, bukan senget. Ini membantu sistem kami membaca nilai dengan tepat.",
        correct: "Betul",
        incorrect: "Salah",
        correctDesc: "Monitor lurus dan jelas kelihatan",
        incorrectDesc: "Monitor senget atau tidak berada di tengah",
        gotIt: "Faham / Teruskan",

        toast: {
          weightSaved: "Berat berjaya disimpan",
          weightFailed: "Gagal menyimpan berat",
          symptomsSaved: "Simptom berjaya disimpan",
          symptomsFailed: "Gagal menyimpan simptom",
          identifyUser: "Tidak dapat mengenal pasti pengguna. Sila log masuk semula.",
          scanComplete: "Imbasan selesai! Sila semak dan simpan bacaan.",
          processImageFailed: "Gagal memproses gambar. Sila cuba lagi dengan gambar yang lebih jelas.",
          bpSaved: "Bacaan tekanan darah berjaya disimpan!",
          vitalsFailed: "Gagal menyimpan bacaan vital",
          cameraUnsupported: "Akses kamera tidak disokong dalam pelayar ini. Sila gunakan pelayar moden atau muat naik gambar.",
          cameraDenied: "Kebenaran kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar anda.",
          cameraNotFound: "Tiada kamera ditemui pada peranti ini. Sila muat naik gambar.",
          cameraFailed: "Gagal mengakses kamera. Sila semak kebenaran atau muat naik gambar."
        }
      },

      schedule: {
        title: "Jadual",
        subtitle: "Urus janji temu dan peringatan anda",
        appointments: "Janji Temu",
        reminders: "Peringatan",
        medicationReminder: "Peringatan Ubat",
        followUpVisit: "Lawatan Susulan",
        addSchedule: "Tambah Jadual",
        date: "Tarikh",
        time: "Masa",
        description: "Penerangan",
        noSchedule: "Tiada jadual tersedia",
      },

      vitals: {
        title: "Penjejak Vital",
        subtitle: "Jejaki tanda vital penting anda",
        heartRate: "Kadar Denyutan Jantung",
        bloodPressure: "Tekanan Darah",
        oxygenLevel: "Tahap Oksigen",
        bodyTemperature: "Suhu Badan",
        respiratoryRate: "Kadar Pernafasan",
        recordVitals: "Rekod Vital",
        latestReading: "Bacaan Terkini",
        history: "Sejarah",
      },

      education: {
        pageTitle: "Sumber Pendidikan",
        pageDescription:
          "Pelajari pengurusan kegagalan jantung melalui modul dan submodul berstruktur dengan kandungan bacaan dalam aplikasi.",
        searchPlaceholder: "Cari modul atau submodul",
        searchAria: "Cari modul pendidikan",
        moduleLabel: "Modul",
        closeContent: "Tutup kandungan",
        learningContent: "Kandungan Pembelajaran",
        viewSource: "Lihat Sumber",
        showSubmodules: "Tunjuk Submodul",
        hideSubmodules: "Sembunyikan Submodul",
        readContent: "Baca Kandungan",
        featuresTitle: "Ciri Kandungan Pendidikan",
        featuresFooter: "Kandungan pendidikan disesuaikan untuk paparan pembelajaran dalam aplikasi.",
        features: {
          guides: "Panduan bertulis dan kandungan pembelajaran yang diringkaskan",
          structured: "Modul berstruktur dengan submodul",
          warning: "Akses pantas kepada tanda amaran dan maklumat penjagaan kendiri"
        },

        modules: {
          A: {
            title: "Memahami Kegagalan Jantung",
            description:
              "Pelajari asas tentang kegagalan jantung, bagaimana ia mempengaruhi badan anda, dan maksudnya dalam kehidupan harian.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Gambaran keseluruhan tentang kegagalan jantung dan mengapa memahaminya penting.",
                content:
                  "Kegagalan jantung tidak bermaksud jantung telah berhenti berfungsi. Ia bermaksud jantung tidak mengepam darah seefektif yang sepatutnya. Ini boleh menyukarkan badan mendapat oksigen dan nutrien yang mencukupi. Memahami kegagalan jantung membantu pesakit dan penjaga mengenali simptom awal, mengikuti pelan rawatan, dan membuat perubahan gaya hidup harian yang menyokong kesihatan yang lebih baik."
              },
              whatIsHF: {
                title: "Apakah itu kegagalan jantung",
                description: "Maksud kegagalan jantung dan bagaimana ia mempengaruhi kehidupan harian.",
                content:
                  "Kegagalan jantung ialah keadaan jangka panjang di mana jantung tidak dapat mengepam darah yang mencukupi untuk memenuhi keperluan badan. Ia boleh menjejaskan pernafasan, tahap tenaga, aktiviti fizikal, tidur, dan rutin harian. Sesetengah orang mengalaminya secara beransur-ansur, manakala yang lain mungkin mengalami simptom yang menjadi semakin teruk secara tiba-tiba."
              },
              symptoms: {
                title: "Simptom kegagalan jantung",
                description: "Tanda awal, simptom, dan apa yang perlu dilakukan seterusnya.",
                content:
                  "Simptom biasa kegagalan jantung termasuk sesak nafas, keletihan, bengkak pada buku lali atau kaki, pertambahan berat badan yang cepat, batuk pada waktu malam, dan kesukaran melakukan aktiviti harian biasa. Jika simptom menjadi lebih teruk secara tiba-tiba, adalah penting untuk menghubungi profesional kesihatan secepat mungkin."
              },
              normalHeart: {
                title: "Bagaimana jantung normal berfungsi",
                description: "Penjelasan ringkas tentang cara jantung mengepam darah.",
                content:
                  "Jantung ialah pam berotot dengan empat ruang. Tugasnya ialah mengedarkan darah kaya oksigen ke seluruh badan dan membawa darah kurang oksigen kembali ke paru-paru. Apabila jantung berfungsi secara normal, ia mengecut dan mengendur dalam ritma yang tetap untuk memastikan aliran darah berjalan dengan cekap."
              },
              types: {
                title: "Jenis kegagalan jantung",
                description: "Fahami bentuk dan klasifikasi kegagalan jantung yang berbeza.",
                content:
                  "Kegagalan jantung boleh diterangkan dalam pelbagai cara, seperti kegagalan jantung sebelah kiri atau kanan, kegagalan jantung akut atau kronik, dan kegagalan jantung dengan pecahan ejeksi berkurang atau terpelihara. Istilah-istilah ini membantu doktor memahami bagaimana jantung terjejas dan menentukan rawatan yang paling sesuai."
              }
            }
          },

          B: {
            title: "Punca Kegagalan Jantung & Keadaan Lain",
            description:
              "Terokai punca biasa kegagalan jantung dan keadaan perubatan lain yang mungkin berkaitan.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Gambaran keseluruhan punca dan keadaan perubatan berkaitan.",
                content:
                  "Kegagalan jantung boleh berlaku disebabkan pelbagai masalah jantung dan kesihatan. Bagi ramai pesakit, ia berkait dengan lebih daripada satu punca asas. Mempelajari punca-punca ini dapat membantu pesakit memahami keadaan mereka dengan lebih baik serta menyokong pencegahan atau rawatan awal."
              },
              commonHeartConditions: {
                title: "Keadaan jantung biasa",
                description: "Keadaan jantung yang boleh menyebabkan kegagalan jantung.",
                content:
                  "Beberapa keadaan jantung yang boleh membawa kepada kegagalan jantung termasuk penyakit arteri koronari, serangan jantung terdahulu, tekanan darah tinggi, penyakit injap jantung, dan kardiomiopati. Keadaan-keadaan ini boleh melemahkan jantung atau memaksanya bekerja lebih keras dari semasa ke semasa."
              },
              otherMedicalConditions: {
                title: "Keadaan perubatan biasa yang lain",
                description: "Penyakit dan keadaan lain yang berkaitan dengan kegagalan jantung.",
                content:
                  "Keadaan lain seperti diabetes, penyakit buah pinggang, obesiti, penyakit paru-paru, gangguan tiroid, dan anemia juga boleh mempengaruhi kegagalan jantung. Mengurus keadaan berkaitan ini ialah bahagian penting untuk meningkatkan kesihatan keseluruhan dan mengurangkan komplikasi."
              }
            }
          },

          C: {
            title: "Apa Yang Anda Boleh Lakukan",
            description:
              "Langkah praktikal dan perubahan gaya hidup yang boleh anda lakukan untuk mengurus kegagalan jantung dengan berkesan.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Gambaran keseluruhan penjagaan kendiri dan pengurusan harian.",
                content:
                  "Mengurus kegagalan jantung melibatkan penjagaan kendiri setiap hari. Pesakit boleh meningkatkan kualiti hidup dengan memantau simptom, mengambil ubat dengan betul, kekal aktif dalam had yang selamat, makan secara seimbang, dan menghadiri pemeriksaan perubatan secara berkala."
              },
              bloodPressurePulse: {
                title: "Periksa tekanan darah dan nadi",
                description: "Cara mengukur tekanan darah dan nadi dengan tepat di rumah.",
                content:
                  "Memeriksa tekanan darah dan nadi di rumah membantu pesakit memantau perubahan dalam keadaan mereka. Bacaan hendaklah diambil pada waktu yang lebih kurang sama setiap hari, dalam keadaan duduk dan santai. Menyimpan rekod boleh membantu doktor menyesuaikan rawatan jika perlu."
              },
              lifestyleChanges: {
                title: "Perubahan gaya hidup",
                description: "Amalan sihat untuk meningkatkan kawalan dan kesejahteraan.",
                content:
                  "Perubahan gaya hidup yang membantu termasuk mengurangkan pengambilan garam, berhenti merokok, mengehadkan alkohol, kekal aktif secara fizikal mengikut nasihat, mengekalkan berat badan sihat, dan mendapatkan rehat yang mencukupi. Amalan kecil setiap hari boleh memberi perubahan besar dalam kawalan simptom."
              },
              managingMedicines: {
                title: "Mengurus ubat",
                description: "Rutin ubat, semakan, dan kesan sampingan.",
                content:
                  "Ubat kegagalan jantung hendaklah diambil tepat seperti yang ditetapkan. Pesakit perlu mengetahui tujuan setiap ubat, kemungkinan kesan sampingan, dan apa yang perlu dilakukan jika terlepas dos. Semakan ubat secara berkala penting untuk memastikan rawatan kekal berkesan."
              },
              supportGroups: {
                title: "Kumpulan sokongan",
                description: "Cari komuniti dan sumber sokongan.",
                content:
                  "Kumpulan sokongan boleh membantu pesakit dan keluarga berasa kurang terasing. Ia menawarkan nasihat praktikal, sokongan emosi, dan pengalaman dikongsi daripada orang lain yang hidup dengan keadaan yang sama. Sokongan mungkin tersedia melalui hospital, badan amal, atau organisasi komuniti."
              }
            }
          },

          D: {
            title: "Hidup dengan Kegagalan Jantung",
            description:
              "Petua dan strategi untuk mengekalkan kualiti hidup semasa mengurus kegagalan jantung.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Kehidupan harian dengan kegagalan jantung dan strategi menangani secara praktikal.",
                content:
                  "Hidup dengan kegagalan jantung bermaksud belajar mengurus simptom sambil meneruskan kehidupan harian dengan selamat dan selesa. Perancangan yang baik, sokongan keluarga, dan susulan berkala boleh membantu pesakit kekal aktif dan berdikari lebih lama."
              },
              travel: {
                title: "Perjalanan",
                description: "Apa yang perlu dirancang sebelum melancong.",
                content:
                  "Sebelum melancong, pesakit perlu memastikan mereka mempunyai ubat yang mencukupi, salinan preskripsi, dan maklumat tentang keadaan mereka. Ia juga penting untuk mengelakkan keletihan berlebihan, kekal terhidrat mengikut nasihat, dan merancang waktu rehat semasa perjalanan."
              },
              vaccines: {
                title: "Vaksin",
                description: "Vaksin yang disyorkan dan mengapa ia penting.",
                content:
                  "Vaksinasi boleh membantu mengurangkan risiko jangkitan yang boleh memburukkan kegagalan jantung. Pesakit sering dinasihatkan untuk berbincang tentang vaksin selesema dan pneumonia dengan penyedia penjagaan kesihatan mereka, terutamanya jika mereka lebih berumur atau mempunyai masalah kesihatan lain."
              },
              workAdjustments: {
                title: "Kerja dan penyesuaian",
                description: "Kembali bekerja dan membuat penyesuaian yang sesuai.",
                content:
                  "Sesetengah pesakit dapat terus bekerja dengan penyesuaian yang sesuai, seperti pengurangan jam kerja, tugas fizikal yang lebih ringan, atau jadual yang lebih fleksibel. Majikan dan profesional kesihatan boleh bekerjasama untuk menyokong perancangan kembali bekerja dengan selamat."
              },
              emotions: {
                title: "Emosi dan hubungan",
                description: "Sokongan untuk emosi, kehidupan keluarga, dan hubungan.",
                content:
                  "Kegagalan jantung boleh menjejaskan emosi, keyakinan diri, dan hubungan. Pesakit mungkin berasa risau, kecewa, atau sedih pada masa-masa tertentu. Bercakap secara terbuka dengan keluarga, rakan, atau profesional kesihatan boleh membantu, dan sokongan emosi ialah bahagian penting dalam penjagaan."
              }
            }
          },

          E: {
            title: "Untuk Penjaga",
            description:
              "Maklumat penting dan sumber sokongan untuk ahli keluarga dan penjaga.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Titik permulaan untuk keluarga dan penjaga.",
                content:
                  "Penjaga memainkan peranan penting dalam membantu pesakit mengurus kegagalan jantung. Mereka boleh membantu dengan ubat-ubatan, janji temu, sokongan emosi, pemantauan simptom, dan rutin harian. Mempunyai maklumat yang betul boleh membantu penjaga berasa lebih bersedia dan yakin."
              },
              howToHelp: {
                title: "Bagaimana anda boleh membantu",
                description: "Senarai ringkas cara penjaga boleh membantu.",
                content:
                  "Penjaga boleh membantu dengan menggalakkan pematuhan ubat, menyokong pilihan gaya hidup sihat, menghadiri janji temu, memerhati tanda amaran, dan membantu pesakit menyimpan rekod simptom serta perubahan berat badan. Komunikasi yang baik amat penting."
              },
              caringStress: {
                title: "Tekanan penjagaan",
                description: "Mengenali tekanan dan menjaga diri sendiri.",
                content:
                  "Memberi penjagaan boleh meletihkan dari segi fizikal dan emosi. Penjaga juga perlu menjaga kesejahteraan diri dengan mendapatkan rehat yang cukup, meminta bantuan apabila diperlukan, dan berbincang dengan perkhidmatan sokongan jika berasa terbeban."
              },
              financialConcerns: {
                title: "Kebimbangan kewangan",
                description: "Faedah, sokongan, dan langkah praktikal.",
                content:
                  "Kebimbangan kewangan mungkin timbul disebabkan kos penjagaan kesihatan, keperluan pengangkutan, perubahan dalam pekerjaan, atau tanggungjawab penjagaan. Keluarga boleh mendapat manfaat dengan mendapatkan nasihat tentang skim sokongan, perancangan kewangan, dan bantuan komuniti."
              },
              supportServices: {
                title: "Perkhidmatan sokongan",
                description: "Orang dan perkhidmatan yang boleh membantu penjaga.",
                content:
                  "Sokongan boleh datang daripada jururawat, doktor, pekerja sosial, badan amal, kumpulan komuniti, dan rangkaian keluarga. Penjaga perlu tahu bahawa meminta sokongan adalah sebahagian daripada penjagaan yang baik, bukan tanda kelemahan."
              }
            }
          },

          H: {
            title: "Tanda Amaran",
            description:
              "Belajar mengenali tanda amaran penting dan bila perlu mendapatkan rawatan perubatan segera.",
            submodules: {
              introduction: {
                title: "Pengenalan",
                description: "Gambaran keseluruhan tanda amaran yang tidak boleh diabaikan.",
                content:
                  "Pesakit dengan kegagalan jantung perlu mengetahui tanda amaran yang mungkin menunjukkan keadaan mereka semakin teruk. Pengesanan awal boleh membantu mencegah komplikasi serius dan menyokong rawatan yang lebih cepat."
              },
              shortnessOfBreath: {
                title: "Sesak nafas",
                description: "Bila sesak nafas bermaksud anda perlu mendapatkan bantuan.",
                content:
                  "Sesak nafas yang menjadi lebih teruk, berlaku secara tiba-tiba, atau berlaku walaupun ketika berehat mungkin merupakan tanda bahawa kegagalan jantung semakin teruk. Jika ini berlaku, pesakit perlu mendapatkan nasihat perubatan dengan cepat, terutamanya jika simptom itu baru atau jauh lebih teruk daripada biasa."
              },
              chestPain: {
                title: "Sakit dada",
                description: "Bila sakit dada memerlukan perhatian perubatan segera.",
                content:
                  "Sakit dada tidak boleh diabaikan. Ia mungkin petanda masalah jantung yang serius dan memerlukan perhatian perubatan segera. Pesakit perlu mendapatkan bantuan kecemasan jika sakit dada teruk, berlaku secara tiba-tiba, atau disertai simptom membimbangkan yang lain."
              },
              rapidWeightGain: {
                title: "Pertambahan berat badan yang cepat",
                description: "Tanda utama pengekalan cecair.",
                content:
                  "Pertambahan berat badan yang cepat dalam tempoh singkat mungkin menunjukkan pengekalan cecair. Pemantauan berat badan harian boleh membantu mengesan perubahan awal. Pesakit perlu melaporkan peningkatan berat badan yang luar biasa kepada penyedia penjagaan kesihatan mereka."
              },
              swellingLegs: {
                title: "Bengkak pada kaki atau buku lali",
                description: "Kemungkinan tanda pengumpulan cecair.",
                content:
                  "Bengkak pada kaki, buku lali, atau tapak kaki mungkin disebabkan oleh pengumpulan cecair. Jika bengkak menjadi lebih teruk, muncul secara tiba-tiba, atau dikaitkan dengan simptom lain yang semakin teruk, nasihat perubatan perlu diperoleh."
              }
            }
          }
        }
      },

      helpSupport: {
        title: "Bantuan & Sokongan",
        subtitle: "Dapatkan bantuan, panduan kecemasan dan sokongan penggunaan MyHFGuard.",

        aboutTitle: "Tentang MyHFGuard",
        aboutBody: "MyHFGuard membantu pesakit kegagalan jantung memantau simptom, mengurus peringatan, merekod data kesihatan harian dan mempelajari penjagaan diri dengan lebih mudah.",

        contactUs: "Hubungi Kami",
        needHelp: "Pilih kaedah bantuan yang sesuai di bawah.",

        emergencyContact: "Hubungan Kecemasan",
        emergencyBody: "Jika anda mengalami sesak nafas teruk, sakit dada, pengsan atau keadaan kecemasan lain, sila hubungi perkhidmatan kecemasan dengan segera. Jangan bergantung pada aplikasi ini untuk rawatan segera.",

        supportTitle: "Sokongan Emel",
        supportBody: "Untuk masalah teknikal atau sokongan sistem, sila hubungi pasukan sokongan MyHFGuard melalui emel.",

        whatsappTitle: "Sokongan WhatsApp",
        whatsappBody: "Untuk komunikasi pantas, anda juga boleh menghubungi sokongan melalui WhatsApp.",

        callButton: "Hubungi Kecemasan (999)",
        emailButton: "Emel Sokongan",
        whatsappButton: "Buka WhatsApp",

        disclaimer: "Aplikasi ini hanya untuk sokongan penjagaan diri dan tidak menggantikan nasihat, diagnosis atau rawatan perubatan profesional."
      },

      medication: {
        title: "Ubat",
        subtitle: "Urus jadual ubat anda",
        medicineName: "Nama Ubat",
        dosage: "Dos",
        frequency: "Kekerapan",
        reminderTime: "Masa Peringatan",
        addMedication: "Tambah Ubat",
      },

      aiAssistant: {
        title: "Pembantu AI",
        subtitle: "Tanya soalan tentang simptom anda dan penjagaan kegagalan jantung",
        placeholder: "Taip mesej anda di sini...",
        send: "Hantar",
      },

      waterDiet: {
          title: "Air & Diet Garam Rendah Saya",
          subtitle: "Sila hantar setiap hari atau sekurang-kurangnya 3 kali seminggu.",

          toast: {
            unableSession: "Tidak dapat memuatkan sesi",
            loginFirst: "Sila log masuk dahulu",
            fillWater: "Sila masukkan had air dan pilih bilangan cawan",
            saved: "Air dan diet garam rendah berjaya disimpan",
            failed: "Gagal menyimpan rekod",
          },

          weekly: {
            title: "Status Penjejakan Mingguan",
            entries: "Entri minggu ini",
            target: "Sasaran",
            targetValue: "3 kali",
            status: "Status",
            onTrack: "Mengikut Jadual",
            needMore: "Perlukan Lebih Entri",
          },

          waterCard: {
            title: "Pengambilan Air Saya",
            limitLabel: "Had Air Doktor (ml)",
            placeholder: "Contoh: 800",
            selectLabel: "Pilih Pengambilan Air Hari Ini (8 cawan)",
            selectedIntake: "Pengambilan Dipilih",
            limitText: "Had",
          },

          waterStatus: {
            green: "Dalam Julat",
            orange: "Sedikit Melebihi Julat",
            red: "Melebihi Had",
          },

          saltCard: {
            title: "Diet Garam Rendah Saya",
            dailyScore: "Skor Garam Harian",
          },

          saltOptions: {
            natural: "Semula Jadi / Garam Rendah",
            moderate: "Garam Sederhana",
            high: "Garam Tinggi",
          },

          saltStatus: {
            green: "Garam Rendah",
            orange: "Garam Sederhana",
            red: "Garam Tinggi",
          },

          meals: {
            breakfast: "Sarapan",
            lunch: "Makan Tengah Hari",
            dinner: "Makan Malam",
          },

          buttons: {
            saving: "Menyimpan...",
            save: "Simpan Entri Hari Ini",
          },

          summary: {
            title: "Ringkasan Terkini",
            waterRestriction: "Had Air",
            todayWater: "Pengambilan Air Hari Ini",
            waterStatus: "Status Air",
            saltStatus: "Status Garam",
          },

          charts: {
            waterGraph: "Graf Pengambilan Air",
            saltGraph: "Graf Diet Garam Rendah",
            waterLine: "Pengambilan Air (ml)",
            limitLine: "Had (ml)",
            saltBar: "Skor Garam",
          },

          error: {
            loadTitle: "Gagal memuatkan data air dan garam.",
            loadDesc: "Sila pastikan jadual water_salt_logs wujud dalam Supabase dan polisi RLS telah ditambah.",
          },
        },
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

export default i18n