const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'locales');

const newKeys = {
  home: {
    voiceAi: { en: "Voice AI", ta: "குரல் AI", hi: "आवाज़ AI", ml: "വോയ്സ് AI" },
    companion: { en: "Companion", ta: "துணை", hi: "साथी", ml: "സഹയാത്രികൻ" },
    wellness: { en: "Wellness", ta: "நல்வாழ்வு", hi: "कल्याण", ml: "ക്ഷേമം" },
    exercises: { en: "Exercises", ta: "பயிற்சிகள்", hi: "व्यायाम", ml: "വ്യായാമങ്ങൾ" },
    moodOverview: { en: "Mood Overview", ta: "மனநிலை மேலோட்டம்", hi: "मनोदशा अवलोकन", ml: "മനസ്സിന്റെ അവലോകനം" },
    details: { en: "Details", ta: "விவரங்கள்", hi: "विवरण", ml: "വിശദാംശങ്ങൾ" }
  },
  dashboard: {
    goodMorning: { en: "Good Morning", ta: "காலை வணக்கம்", hi: "सुप्रभात", ml: "സുപ്രഭാതം" },
    goodAfternoon: { en: "Good Afternoon", ta: "மதிய வணக்கம்", hi: "शुभ दोपहर", ml: "ശുഭ ഉച്ചതിരിഞ്ഞ്" },
    goodEvening: { en: "Good Evening", ta: "மாலை வணக்கம்", hi: "शुभ संध्या", ml: "ശുഭ സായാഹ്നം" },
    dayStreak: { en: "Day Streak", ta: "நாள் தொடர்ச்சி", hi: "दिन की लकीर", ml: "തുടർച്ചയായ ദിവസങ്ങൾ" },
    level: { en: "Level", ta: "நிலை", hi: "स्तर", ml: "ലെവൽ" },
    xp: { en: "XP", ta: "XP", hi: "XP", ml: "XP" },
    dailyWellness: { en: "Daily Wellness", ta: "தினசரி நல்வாழ்வு", hi: "दैनिक कल्याण", ml: "ദൈനംദിന ക്ഷേമം" },
    mood: { en: "Mood", ta: "மனநிலை", hi: "मनोदशा", ml: "മനസ്സ്" },
    mind: { en: "Mind", ta: "மனம்", hi: "मन", ml: "മനസ്സ്" },
    body: { en: "Body", ta: "உடல்", hi: "शरीर", ml: "ശരീരം" },
    recentActivity: { en: "Recent Activity", ta: "சமீபத்திய செயல்பாடு", hi: "हाल की गतिविधि", ml: "സമീപകാല പ്രവർത്തനങ്ങൾ" },
    achievements: { en: "Achievements", ta: "சாதனைகள்", hi: "उपलब्धियां", ml: "നേട്ടങ്ങൾ" },
    viewUnlocked: { en: "View Unlocked", ta: "திறக்கப்பட்டதைக் காண்க", hi: "अनलॉक किए गए देखें", ml: "തുറന്നവ കാണുക" },
    leaderboard: { en: "Leaderboard", ta: "முன்னிலைப்பலகை", hi: "लीडरबोर्ड", ml: "ലീഡർബോർഡ്" },
    globalRank: { en: "Global Rank", ta: "உலகளாவிய தரம்", hi: "वैश्विक रैंक", ml: "ആഗോള റാങ്ക്" },
    heatmap: { en: "Heatmap", ta: "வெப்ப வரைபடம்", hi: "हीटमैप", ml: "ഹീറ്റ്മാപ്പ്" },
    activityLog: { en: "Activity Log", ta: "செயல்பாட்டு பதிவு", hi: "गतिविधि लॉग", ml: "പ്രവർത്തനരേഖ" },
    analytics: { en: "Analytics", ta: "பகுப்பாய்வு", hi: "एनालिटिक्स", ml: "അനലിറ്റിക്സ്" },
    moodReports: { en: "Mood & Reports", ta: "மனநிலை & அறிக்கைகள்", hi: "मनोदशा और रिपोर्ट", ml: "മനസ്സും റിപ്പോർട്ടുകളും" }
  },
  profile: {
    personalizePrompt: { en: "Tap the pencil to personalize your AI.", ta: "உங்கள் AI ஐத் தனிப்பயனாக்க பென்சிலைத் தட்டவும்.", hi: "अपने AI को वैयक्तिकृत करने के लिए पेंसिल पर टैप करें।", ml: "നിങ്ങളുടെ AI വ്യക്തിഗതമാക്കാൻ പെൻസിൽ ടാപ്പുചെയ്യുക." },
    safetyCircle: { en: "💙 Safety Circle", ta: "💙 பாதுகாப்பு வட்டம்", hi: "💙 सुरक्षा चक्र", ml: "💙 സുരക്ഷാ സർക്കിൾ" },
    addTrustedContact: { en: "Add someone you trust", ta: "நீங்கள் நம்பும் ஒருவரைச் சேர்க்கவும்", hi: "किसी ऐसे व्यक्ति को जोड़ें जिस पर आप भरोसा करते हैं", ml: "നിങ്ങൾ വിശ്വസിക്കുന്ന ഒരാളെ ചേർക്കുക" },
    addTrustedContactSubtext: { en: "A contact to reach out to during difficult moments", ta: "கடினமான தருணங்களில் தொடர்பு கொள்ள ஒரு நபர்", hi: "कठिन क्षणों के दौरान संपर्क करने के लिए एक संपर्क", ml: "ബുദ്ധിമുട്ടുള്ള സമയങ്ങളിൽ ബന്ധപ്പെടാനുള്ള ഒരാൾ" },
    languages: { en: "🌐 Languages", ta: "🌐 மொழிகள்", hi: "🌐 भाषाएं", ml: "🌐 ഭാഷകൾ" },
    settings: { en: "⚙️ Settings", ta: "⚙️ அமைப்புகள்", hi: "⚙️ सेटिंग्स", ml: "⚙️ ക്രമീകരണങ്ങൾ" },
    darkMode: { en: "Dark Mode", ta: "இருண்ட பயன்முறை", hi: "डार्क मोड", ml: "ഡാർക്ക് മോഡ്" },
    darkModeSubtitle: { en: "Soothing for nighttime", ta: "இரவு நேரத்திற்கு அமைதியானது", hi: "रात के समय के लिए सुखदायक", ml: "രാത്രിക്ക് അനുയോജ്യമായത്" },
    supportiveReminders: { en: "Supportive Reminders", ta: "ஆதரவான நினைவூட்டல்கள்", hi: "सहायक अनुस्मारक", ml: "പിന്തുണയ്ക്കുന്ന ഓർമ്മപ്പെടുത്തലുകൾ" },
    supportiveRemindersSubtitle: { en: "Daily check-ins & encouragement", ta: "தினசரி செக்-இன்கள் மற்றும் ஊக்கம்", hi: "दैनिक चेक-इन और प्रोत्साहन", ml: "ദൈനംദിന പരിശോധനകളും പ്രോത്സാഹനവും" },
    publicLeaderboard: { en: "Public Leaderboard", ta: "பொது முன்னிலைப்பலகை", hi: "सार्वजनिक लीडरबोर्ड", ml: "പൊതു ലീഡർബോർഡ്" },
    publicLeaderboardSubtitle: { en: "Opt-in to global ranking", ta: "உலகளாவிய தரவரிசையில் சேரவும்", hi: "वैश्विक रैंकिंग में शामिल हों", ml: "ആഗോള റാങ്കിംഗിൽ ചേരുക" },
    accountControls: { en: "Account & Data Controls", ta: "கணக்கு மற்றும் தரவு கட்டுப்பாடுகள்", hi: "खाता और डेटा नियंत्रण", ml: "അക്കൗണ്ടും ഡാറ്റ നിയന്ത്രണങ്ങളും" },
    accountControlsSubtitle: { en: "Privacy, downloads, & deletion", ta: "தனியுரிமை, பதிவிறக்கங்கள் மற்றும் நீக்கம்", hi: "गोपनीयता, डाउनलोड और हटाना", ml: "സ്വകാര്യത, ഡൗൺലോഡുകൾ, മായ്ക്കൽ" },
    logoutBtn: { en: "Logout", ta: "வெளியேறு", hi: "लॉग आउट", ml: "പുറത്തുകടക്കുക" }
  }
};

const languages = ['en', 'ta', 'hi', 'ml'];

languages.forEach(lang => {
  const filePath = path.join(localesPath, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge new keys
    for (const section in newKeys) {
      if (!data[section]) data[section] = {};
      
      for (const key in newKeys[section]) {
        data[section][key] = newKeys[section][key][lang];
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}.json`);
  }
});
