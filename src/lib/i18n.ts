export type Language = "en" | "bn";

export interface TranslationSchema {
  nav: {
    chat: string;
    pharmacy: string;
    doctors: string;
    about: string;
    contact: string;
    emergency: string;
    register: string;
    profile: string;
    getPremium: string;
    premiumBadge: string;
    menu: string;
    close: string;
  };
  bottomNav: {
    home: string;
    chat: string;
    pharmacy: string;
    doctors: string;
    sos: string;
  };
  footer: {
    tagline: string;
    platform: string;
    company: string;
    getInTouch: string;
    emergencyNum: string;
    languageLabel: string;
    home: string;
    findDoctor: string;
    aiAdvisor: string;
    pharmacy: string;
    premium: string;
    aboutUs: string;
    meetTeam: string;
    contactUs: string;
    disclaimer: string;
  };
  hero: {
    badge: string;
    h1Line1: string;
    h1Line2: string;
    subtext: string;
    drMediLink: string;
    findDoctor: string;
    goPremium: string;
    assurance: string;
    chatCard: {
      title: string;
      subtitle: string;
      sampleUser: string;
      sampleAi: string;
      specialistAction: string;
      specialistCount: string;
    };
  };
  common: {
    loading: string;
    search: string;
    viewDetails: string;
    back: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
  };

  services: {
    badge: string;
    title: string;
    subtitle: string;
    cards: {
      aiDoctor: {
        badge: string;
        secondaryBadge: string;
        title: string;
        description: string;
        features: string[];
        cta: string;
        helper: string;
        scorecard: {
          engine: string;
          status: string;
          accuracy: string;
          response: string;
          queries: string;
          sampleLabel: string;
        };
        chips: string[];
      };
      findDoctor: {
        badge: string;
        title: string;
        description: string;
        searchPlaceholder: string;
        chips: string[];
        footer: string;
        cta: string;
      };
      pharmacy: {
        badge: string;
        title: string;
        description: string;
        footer: string;
        cta: string;
      };
      emergency: {
        badge: string;
        title: string;
        description: string;
        features: string[];
        footer: string;
        cta: string;
      };
      healthRecords: {
        badge: string;
        title: string;
        description: string;
        dataStorage: string;
        exportFormat: string;
        cloudLogging: string;
        footer: string;
        cta: string;
      };
    };
  };

  trust: {
    badge: string;
    title: string;
    subtitle: string;
    stats: {
      patients: string;
      doctors: string;
      accuracy: string;
      support: string;
    };
  };

  reviews: {
    badge: string;
    title: string;
    subtitle: string;
    testimonials: Array<{
      name: string;
      city: string;
      quote: string;
    }>;
  };

  faq: {
    badge: string;
    title: string;
    subtitle: string;
    items: Array<{
      q: string;
      a: string;
      steps: string[];
    }>;
  };

  plans: {
    title: string;
    subtitle: string;
    free: {
      name: string;
      price: string;
      period: string;
      description: string;
      features: string[];
      cta: string;
    };
    premium: {
      name: string;
      price: string;
      period: string;
      description: string;
      badge: string;
      features: string[];
      cta: string;
      manageCta: string;
    };
    note: string;
  };

  finalCta: {
    badge: string;
    title: string;
    subtitle: string;
    features: string[];
    buttons: Array<{
      title: string;
      subtitle: string;
    }>;
  };
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    nav: {
      chat: "Chat",
      pharmacy: "Pharmacy",
      doctors: "Doctors",
      about: "About",
      contact: "Contact",
      emergency: "Emergency",
      register: "Register",
      profile: "Profile",
      getPremium: "Get Premium",
      premiumBadge: "Premium",
      menu: "Menu",
      close: "Close",
    },

    bottomNav: {
      home: "Home",
      chat: "Chat",
      pharmacy: "Pharmacy",
      doctors: "Doctors",
      sos: "SOS",
    },

    footer: {
      tagline: "Your Intelligent Health Partner",
      platform: "Platform",
      company: "Company",
      getInTouch: "Get in Touch",
      emergencyNum: "Emergency: 999",
      languageLabel: "Language / ভাষা:",
      home: "Home",
      findDoctor: "Find a Doctor",
      aiAdvisor: "AI Health Advisor",
      pharmacy: "Pharmacy",
      premium: "Premium",
      aboutUs: "About Us",
      meetTeam: "Meet the Team",
      contactUs: "Contact Us",
      disclaimer:
        "Disclaimer: MediLink AI is an assistive technology, not a substitute for professional medical advice. Always consult a doctor in emergencies. Built with ❤️ by Sylhet Robotics Club. | © 2026 MediLink AI.",
    },

    hero: {
      badge: "AI-Powered Healthcare Network",
      h1Line1: "We connect you to the best",
      h1Line2: "Health Solutions",
      subtext:
        "MediLink AI puts everyday medicines, specialist doctors and emergency help in one place — with a Bangla-first AI assistant that explains what to do next.",
      drMediLink: "Dr MediLink",
      findDoctor: "Find a doctor",
      goPremium: "Go Premium",
      assurance: "No account needed · Bangla & English · Emergency 999",
      chatCard: {
        title: "Dr. MediLink",
        subtitle: "AI health assistant · Bangla & English",
        sampleUser: "Brother, I have had fever and throat pain for 3 days. What should I do now?",
        sampleAi: "Drink plenty of water, keep cool. If symptoms persist for 2 days, please consult our doctors.",
        specialistAction: "Connect to a specialist",
        specialistCount: "6 specialists",
      },
    },

    common: {
      loading: "Loading...",
      search: "Search",
      viewDetails: "View Details",
      back: "Back",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
    },

    services: {
      badge: "ALL SERVICES",
      title: "Healthcare Designed Around Your Life",
      subtitle:
        "One platform connecting you to intelligent triage, specialist doctors, affordable medicines, and rapid emergency dispatch across Bangladesh.",
      cards: {
        aiDoctor: {
          badge: "Dr. MediLink",
          secondaryBadge: "Bangla & English AI",
          title: "AI Doctor & Symptom Assessment",
          description:
            "Discuss health concerns naturally in Bangla or English. Our physician-grade AI provides instant clinical triage, lifestyle advice, and care recommendations.",
          features: [
            "Bangla script & phonetic Banglish comprehension",
            "Instant symptom severity & triage guidance",
            "Clinically structured health summaries",
          ],
          cta: "Start Free Consultation",
          helper: "Instant Response · No Account Needed",
          scorecard: {
            engine: "AI Engine",
            status: "Active (Nemotron Flash)",
            accuracy: "Triage Accuracy",
            response: "Response Time",
            queries: "Daily Free Consults",
            sampleLabel: "Verified Medical Guardrails",
          },
          chips: [
            "Fever & Flu",
            "Gastric Pain",
            "Headache",
            "Child Health",
            "Skin Issues",
          ],
        },
        findDoctor: {
          badge: "VERIFIED SPECIALISTS",
          title: "Find & Book Doctors",
          description:
            "Connect directly with verified specialists across cardiology, pediatrics, dermatology, and general medicine via WhatsApp.",
          searchPlaceholder: "Search cardiologist, medicine specialist...",
          chips: [
            "Cardiology",
            "Pediatrics",
            "Dermatology",
            "Medicine",
            "Neurology",
            "Gynecology",
          ],
          footer: "Direct WhatsApp Booking · Real-time Availability",
          cta: "Browse All Specialists",
        },
        pharmacy: {
          badge: "DOORSTEP DELIVERY",
          title: "Order Medicines Online",
          description:
            "Genuine prescription & OTC medicines delivered within Dhaka in 2–4 hours. 20% discount for MediLink Premium subscribers.",
          footer: "100% Genuine · Express 2-4h Delivery · COD Available",
          cta: "Visit Pharmacy",
        },
        emergency: {
          badge: "24/7 RAPID DISPATCH",
          title: "Emergency SOS & Ambulance",
          description:
            "One-tap emergency call to 999, instant SMS/WhatsApp location sharing, and direct contacts for verified nearby hospitals.",
          features: [
            "One-tap 999 dialing",
            "Real-time GPS coordinate dispatch",
            "Top trauma & tertiary hospitals",
          ],
          footer: "Direct 999 Hotline · GPS Coordinates Broadcast",
          cta: "Emergency Directory",
        },
        healthRecords: {
          badge: "ZERO DATA TRACKING",
          title: "Private Health Records",
          description:
            "Your prescriptions, medical histories, and triage reports are stored strictly inside your browser's local encrypted storage.",
          dataStorage: "Client-side encrypted (localStorage)",
          exportFormat: "Instant PDF summary export",
          cloudLogging: "Zero third-party tracking or cloud profiling",
          footer: "HIPAA-aligned local persistence · Export to PDF anytime",
          cta: "Create Health Profile",
        },
      },
    },

    trust: {
      badge: "WHY BANGLADESH TRUSTS MEDILINK",
      title: "Trusted Healthcare Infrastructure for 170 Million People",
      subtitle:
        "Built with clinical care and modern engineering to provide reliable primary health services across all 64 districts.",
      stats: {
        patients: "Active Patients",
        doctors: "Verified Specialists",
        accuracy: "Clinical Triage Accuracy",
        support: "Emergency Triage Support",
      },
    },

    reviews: {
      badge: "TESTIMONIALS",
      title: "What Bangladeshis Say About MediLink",
      subtitle:
        "Real experiences from patients who got quick care, affordable medicines, and timely doctor appointments.",
      testimonials: [
        {
          name: "Anisur Rahman",
          city: "Dhaka",
          quote:
            "Dr. MediLink helped me understand my father's chest discomfort late at night and told us to rush to the hospital. Truly life-saving.",
        },
        {
          name: "Tania Akter",
          city: "Sylhet",
          quote:
            "I love how naturally it speaks in Sylheti and Bangla! Ordering Napa and ORS during floods was super convenient.",
        },
        {
          name: "Dr. Farhan Tanvir",
          city: "Chittagong",
          quote:
            "As a practicing physician, I am impressed by MediLink's triage precision and accurate doctor referral guidance.",
        },
        {
          name: "Mahmudul Hasan",
          city: "Rajshahi",
          quote:
            "The 20% pharmacy discount with Premium pays for itself every single month. Highly recommended.",
        },
      ],
    },

    faq: {
      badge: "FREQUENTLY ASKED QUESTIONS",
      title: "Got Questions? We Have Answers.",
      subtitle:
        "Everything you need to know about using Dr. MediLink, booking specialists, and prescription safety.",
      items: [
        {
          q: "Is Dr. MediLink a real human doctor?",
          a: "Dr. MediLink is an advanced AI clinical assistant trained on medical triage guidelines. It gives preliminary guidance and symptom assessment, but does not replace licensed doctors for complex diagnoses.",
          steps: [
            "Describe your symptoms",
            "Receive triage assessment",
            "Connect with verified specialist if needed",
          ],
        },
        {
          q: "How does medicine delivery work across Bangladesh?",
          a: "Within Dhaka, deliveries take 2 to 4 hours. Outside Dhaka, express courier delivery reaches all divisional cities within 24 to 48 hours.",
          steps: [
            "Browse catalog & add medicines",
            "Checkout with bKash/Nagad/COD",
            "WhatsApp updates on dispatch",
          ],
        },
        {
          q: "Can I use MediLink without creating an account?",
          a: "Yes! MediLink is built static-first. You can chat with AI, search doctors, and call 999 immediately without any registration.",
          steps: [
            "Instant access on any browser",
            "Data stays in your device",
            "Optional profile for personalized care",
          ],
        },
        {
          q: "Is my personal health data private and secure?",
          a: "Absolutely. All consultation histories, health logs, and profiles live strictly in your device's browser localStorage. We do not store your private conversations on our servers.",
          steps: [
            "Zero server database tracking",
            "Client-side encryption",
            "Export or delete anytime in one click",
          ],
        },
      ],
    },

    plans: {
      title: "Simple, Transparent Healthcare Plans",
      subtitle:
        "Access free primary medical guidance anytime, or upgrade to Premium for unlimited consultations and exclusive healthcare discounts.",
      free: {
        name: "Basic Plan",
        price: "৳0",
        period: "Forever Free",
        description:
          "Essential triage for individuals needing quick medical guidance.",
        features: [
          "2 AI consultations per day",
          "Standard Flash AI model",
          "Doctor directory search",
          "Emergency 999 & Hospital list",
          "Last 3 chat histories saved",
        ],
        cta: "Start Free",
      },
      premium: {
        name: "MediLink Premium",
        price: "৳500",
        period: "/ month",
        description: "Complete healthcare freedom for you and your family.",
        badge: "RECOMMENDED",
        features: [
          "Unlimited AI consultations (999/day)",
          "Pro Reasoning AI Doctor",
          "20% Discount on all medicines",
          "20% Discount on doctor bookings",
          "Unlimited chat history & PDF export",
          "Priority 24/7 care support",
        ],
        cta: "Upgrade to Premium",
        manageCta: "Manage Active Plan",
      },
      note: "Pay securely via bKash, Nagad, or Debit/Credit Card. Cancel anytime with zero fees.",
    },

    finalCta: {
      badge: "GET STARTED TODAY",
      title: "Empowering Bangladesh with Smarter, Faster Healthcare",
      subtitle:
        "Experience clinical-grade AI advice, instant medicine delivery, and verified doctors right in your pocket.",
      features: [
        "No App Download Required",
        "Bangla & English Supported",
        "100% Free to Try",
      ],
      buttons: [
        {
          title: "Talk to Dr. MediLink",
          subtitle: "Instant AI Health Advisor",
        },
        {
          title: "Consult a Doctor",
          subtitle: "Verified Specialist Booking",
        },
        {
          title: "Order Medicines",
          subtitle: "Express Doorstep Delivery",
        },
      ],
    },
  },

  bn: {
    nav: {
      chat: "চ্যাট",
      pharmacy: "ফার্মেসি",
      doctors: "ডাক্তার",
      about: "পরিচিতি",
      contact: "যোগাযোগ",
      emergency: "জরুরি SOS",
      register: "নিবন্ধন",
      profile: "প্রোফাইল",
      getPremium: "প্রিমিয়াম নিন",
      premiumBadge: "প্রিমিয়াম",
      menu: "মেনু",
      close: "বন্ধ করুন",
    },

    bottomNav: {
      home: "হোম",
      chat: "চ্যাট",
      pharmacy: "ফার্মেসি",
      doctors: "ডাক্তার",
      sos: "এসওএস",
    },

    footer: {
      tagline: "আপনার বিশ্বস্ত ডিজিটাল স্বাস্থ্য সহকারী",
      platform: "প্ল্যাটফর্ম",
      company: "প্রতিষ্ঠান",
      getInTouch: "যোগাযোগ করুন",
      emergencyNum: "জরুরি কল: ৯৯৯",
      languageLabel: "Language / ভাষা:",
      home: "হোম",
      findDoctor: "ডাক্তার খুঁজুন",
      aiAdvisor: "এআই স্বাস্থ্য সহকারী",
      pharmacy: "ফার্মেসি",
      premium: "প্রিমিয়াম প্ল্যান",
      aboutUs: "আমাদের সম্পর্কে",
      meetTeam: "টিম মেম্বারস",
      contactUs: "যোগাযোগ করুন",
      disclaimer:
        "সতর্কতা: মেডি-লিংক এআই একটি সহায়তাকারী প্রযুক্তি, পেশাদার চিকিৎসকের বিকল্প নয়। যেকোনো জরুরি পরিস্থিতিতে অবিলম্বে চিকিৎসকের পরামর্শ নিন। সিলেট রোবোটিক্স ক্লাব কর্তৃক ভালোবাসার সাথে নির্মিত। | © ২০২৬ মেডি-লিংক এআই।",
    },

    hero: {
      badge: "এআই-চালিত স্বাস্থ্যসেবা প্ল্যাটফর্ম",
      h1Line1: "আমরা আপনাকে যুক্ত করি",
      h1Line2: "সেরা স্বাস্থ্যসেবায়",
      subtext:
        "মেডি-লিংক এআই প্রতিদিনের ওষুধ, বিশেষজ্ঞ ডাক্তার এবং জরুরি স্বাস্থ্যসেবা নিয়ে এসেছে এক ঠিকানায় — সাথে রয়েছে বুদ্ধিমান বাংলা এআই স্বাস্থ্য সহকারী।",
      drMediLink: "ডাঃ মেডি-লিংক",
      findDoctor: "ডাক্তার খুঁজুন",
      goPremium: "প্রিমিয়াম নিন",
      assurance: "অ্যাকাউন্ট ছাড়াই ব্যবহারযোগ্য · বাংলা ও ইংরেজি · জরুরি ৯৯৯",
      chatCard: {
        title: "ডাঃ মেডি-লিংক",
        subtitle: "এআই স্বাস্থ্য সহকারী · বাংলা ও ইংরেজি",
        sampleUser: "ভাই, তিন দিন ধরে জ্বর আর গলা ব্যথা। এখন কী করব?",
        sampleAi: "বেশি পানি খান, শরীর ঠান্ডা রাখুন। দুই দিনে উন্নতি না হলে আমাদের ডাক্তারের সাথে কথা বলুন।",
        specialistAction: "বিশেষজ্ঞ ডাক্তারের পরামর্শ নিন",
        specialistCount: "৬ জন বিশেষজ্ঞ",
      },
    },

    common: {
      loading: "লোড হচ্ছে...",
      search: "অনুসন্ধান",
      viewDetails: "বিস্তারিত দেখুন",
      back: "ফিরে যান",
      cancel: "বাতিল",
      save: "সংরক্ষণ",
      delete: "মুছুন",
      edit: "সম্পাদনা",
    },

    services: {
      badge: "সকল স্বাস্থ্যসেবা",
      title: "আপনার জীবনের প্রতিটি প্রয়োজনে আধুনিক স্বাস্থ্যসেবা",
      subtitle:
        "বুদ্ধিমান এআই ট্রায়াজ, বিশেষজ্ঞ ডাক্তার, নির্ভরযোগ্য ওষুধ এবং দ্রুত জরুরি অ্যাম্বুলেন্স সেবা — বাংলাদেশের প্রতিটি মানুষের জন্য এক ঠিকানায়।",
      cards: {
        aiDoctor: {
          badge: "ডাঃ মেডি-লিংক",
          secondaryBadge: "বাংলা ও ইংরেজি এআই",
          title: "এআই ডাক্তার ও লক্ষণ মূল্যায়ন",
          description:
            "বাংলা বা ইংরেজিতে আপনার শারীরিক সমস্যার কথা জানান। আমাদের অভিজ্ঞ এআই তাত্ক্ষণিকভাবে ক্লিনিক্যাল পরামর্শ ও সঠিক দিকনির্দেশনা প্রদান করবে।",
          features: [
            "শুদ্ধ বাংলা ও বাংলিশ অনুধাবন ক্ষমতা",
            "লক্ষণ অনুযায়ী তাৎক্ষণিক ট্রায়াজ মূল্যায়ন",
            "সুসংগঠিত ডিজিটাল স্বাস্থ্য সারসংক্ষেপ",
          ],
          cta: "ফ্রি পরামর্শ শুরু করুন",
          helper: "তাৎক্ষণিক সেবা · কোনো অ্যাকাউন্টের প্রয়োজন নেই",
          scorecard: {
            engine: "এআই ইঞ্জিন",
            status: "সক্রিয় (Nemotron Flash)",
            accuracy: "ট্রায়াজ নির্ভুলতা",
            response: "রেসপন্স সময়",
            queries: "দৈনিক ফ্রি পরামর্শ",
            sampleLabel: "যাচাইকৃত মেডিকেল গাইডলাইন",
          },
          chips: [
            "জ্বর ও সর্দি",
            "গ্যাস্ট্রিকের ব্যথা",
            "মাথাব্যথা",
            "শিশু স্বাস্থ্য",
            "চর্মরোগ",
          ],
        },
        findDoctor: {
          badge: "যাচাইকৃত বিশেষজ্ঞ",
          title: "ডাক্তার খুঁজুন ও সিরিয়াল নিন",
          description:
            "কার্ডিওলজি, শিশুরোগ, চর্মরোগ ও মেডিসিন বিশেষজ্ঞ ডাক্তারদের সাথে সরাসরি WhatsApp-এ ভিডিও বা অডিও পরামর্শের সিরিয়াল বুক করুন।",
          searchPlaceholder: "কার্ডিওলজিস্ট, মেডিসিন বিশেষজ্ঞ খুঁজুন...",
          chips: [
            "কার্ডিওলজি",
            "শিশুরোগ",
            "চর্মরোগ",
            "মেডিসিন",
            "নিউরোলজি",
            "গাইনিকোলজি",
          ],
          footer: "সরাসরি WhatsApp বুকিং · তাৎক্ষণিক সময়সূচি",
          cta: "সব ডাক্তার দেখুন",
        },
        pharmacy: {
          badge: "দোরগোড়ায় হোম ডেলিভারি",
          title: "অনলাইনে ওষুধ অর্ডার করুন",
          description:
            "আসল প্রেসক্রিপশন ও OTC ওষুধ ঢাকায় ২–৪ ঘণ্টার মধ্যে পৌঁছে যাবে। MediLink Premium গ্রাহকদের জন্য রয়েছে ২০% ছাড়।",
          footer: "১০০% আসল ওষুধ · দ্রুত ২-৪ ঘণ্টা ডেলিভারি · ক্যাশ অন ডেলিভারি",
          cta: "ফার্মেসিতে যান",
        },
        emergency: {
          badge: "২৪/৭ জরুরি সেবা",
          title: "জরুরি SOS ও অ্যাম্বুলেন্স",
          description:
            "এক ক্লিকে ৯৯৯ কল, তাৎক্ষণিক SMS/WhatsApp লোকেশন শেয়ার এবং নিকটস্থ সরকারি ও বেসরকারি হাসপাতালের জরুরি হটলাইন।",
          features: [
            "এক ক্লিকে ৯৯৯ ডায়াল",
            "রিয়েল-টাইম GPS লোকেশন পাঠানো",
            "শীর্ষ ট্রমা ও মেডিকেল কলেজ হাসপাতাল",
          ],
          footer: "সরাসরি ৯৯৯ হটলাইন · জিপিএস লোকেশন প্রেরণ",
          cta: "জরুরি হাসপাতাল তালিকা",
        },
        healthRecords: {
          badge: "সম্পূর্ণ নিরাপদ ও গোপনীয়",
          title: "ব্যক্তিগত স্বাস্থ্য রেকর্ড",
          description:
            "আপনার প্রেসক্রিপশন, চিকিৎসার ইতিহাস এবং স্বাস্থ্য রিপোর্টগুলো সম্পূর্ণ নিরাপদে আপনার নিজস্ব ব্রাউজারে সংরক্ষিত থাকে।",
          dataStorage: "ডিভাইসে সম্পূর্ণ এনক্রিপ্টেড (localStorage)",
          exportFormat: "মুহূর্তেই PDF প্রেসক্রিপশন ডাউনলোড",
          cloudLogging: "কোনো সার্ভার ট্র্যাকিং বা তথ্য আদান-প্রদান নেই",
          footer: "গোপনীয়তার নিশ্চয়তা · যেকোনো সময় PDF ডাউনলোড করুন",
          cta: "স্বাস্থ্য প্রোফাইল তৈরি করুন",
        },
      },
    },

    trust: {
      badge: "মেডি-লিংক এআই কেন সবার পছন্দের",
      title: "১৭ কোটি মানুষের জন্য নির্ভরযোগ্য ডিজিটাল স্বাস্থ্য পরিকাঠামো",
      subtitle:
        "ক্লিনিক্যাল গাইডলাইন ও আধুনিক প্রযুক্তির সমন্বয়ে ৬৪ জেলার মানুষের কাছে পৌঁছে দেওয়া নির্ভরযোগ্য স্বাস্থ্যসেবা।",
      stats: {
        patients: "সন্তুষ্ট রোগী",
        doctors: "যাচাইকৃত বিশেষজ্ঞ ডাক্তার",
        accuracy: "ক্লিনিক্যাল ট্রায়াজ নির্ভুলতা",
        support: "জরুরি স্বাস্থ্য সহায়তা",
      },
    },

    reviews: {
      badge: "গ্রাহকদের মতামত",
      title: "মেডি-লিংক সম্পর্কে বাংলাদেশিদের অভিজ্ঞতা",
      subtitle:
        "রোগীদের বাস্তব অভিজ্ঞতা — সঠিক সময়ে সঠিক চিকিৎসা, ঘরে বসে ওষুধ এবং ডাক্তারের দ্রুত অ্যাপয়েন্টমেন্ট।",
      testimonials: [
        {
          name: "আনিসুর রহমান",
          city: "ঢাকা",
          quote:
            "মাঝরাতে বাবার হঠাৎ বুকে অস্বস্তি শুরু হলে ডাঃ মেডি-লিংক তাৎক্ষণিকভাবে হাসপাতালে যাওয়ার পরামর্শ দেয়। এটা সত্যিই জীবন বাঁচিয়েছিল।",
        },
        {
          name: "তানিয়া আক্তার",
          city: "সিলেট",
          quote:
            "এআই যেভাবে সুন্দর বাংলায় কথা বলে তা চমৎকার! বন্যার সময় ঘরে বসেই নাপা আর খাবার স্যালাইন অর্ডার করতে পেরেছিলাম।",
        },
        {
          name: "ডাঃ ফারহান তানভীর",
          city: "চট্টগ্রাম",
          quote:
            "একজন চিকিৎসক হিসেবে মেডি-লিংকের ট্রায়াজ নির্ভুলতা ও সঠিক বিশেষজ্ঞের কাছে রেফার করার প্রক্রিয়া আমাকে মুগ্ধ করেছে।",
        },
        {
          name: "মাহমুদুল হাসান",
          city: "রাজশাহী",
          quote:
            "প্রিমিয়াম প্ল্যানের ২০% ওষুধের ছাড়ের কারণেই প্রতি মাসে খরচ অনেক কমে গেছে। সবার জন্য অত্যন্ত প্রয়োজনীয়।",
        },
      ],
    },

    faq: {
      badge: "সাধারণ জিজ্ঞাসা",
      title: "আপনার প্রশ্ন, আমাদের উত্তর",
      subtitle:
        "ডাঃ মেডি-লিংক ব্যবহার, বিশেষজ্ঞ ডাক্তার বুকিং ও প্রেসক্রিপশন নিরাপত্তা সংক্রান্ত সকল তথ্য।",
      items: [
        {
          q: "ডাঃ মেডি-লিংক কি কোনো মানব চিকিৎসক?",
          a: "ডাঃ মেডি-লিংক একটি উন্নত মেডিকেল এআই সহকারী যা চিকিৎসাবিজ্ঞানের প্রমিত ট্রায়াজ নীতি অনুযায়ী প্রশিক্ষণপ্রাপ্ত। এটি প্রাথমিক স্বাস্থ্য পরামর্শ ও উপসর্গ মূল্যায়নে সাহায্য করে, তবে গুরুতর জটিলতায় চিকিৎসকের বিকল্প নয়।",
          steps: [
            "আপনার উপসর্গের কথা লিখুন",
            "প্রাথমিক ট্রায়াজ মূল্যায়ন পান",
            "প্রয়োজনে বিশেষজ্ঞ ডাক্তারের সাথে যোগাযোগ করুন",
          ],
        },
        {
          q: "সারা বাংলাদেশে ওষুধ ডেলিভারি কীভাবে কাজ করে?",
          a: "ঢাকা শহরের মধ্যে ২ থেকে ৪ ঘণ্টার মধ্যে ওষুধ ডেলিভারি করা হয়। ঢাকার বাইরে সকল বিভাগীয় শহরে কুরিয়ারের মাধ্যমে ২৪ থেকে ৪৮ ঘণ্টায় পৌঁছায়।",
          steps: [
            "ওষুধ নির্বাচন করে কার্টে যোগ করুন",
            "bKash, Nagad বা ক্যাশ অন ডেলিভারিতে অর্ডার দিন",
            "WhatsApp-এ ডেলিভারি আপডেট জানুন",
          ],
        },
        {
          q: "অ্যাকাউন্ট না খুলেই কি সেবাগুলো ব্যবহার করা যায়?",
          a: "হ্যাঁ! মেডি-লিংক এআই সম্পূর্ণ উন্মুক্ত। কোনো প্রকার রেজিস্ট্রেশন বা লগইন ছাড়াই আপনি এআই পরামর্শ, ডাক্তার অনুসন্ধান এবং ৯৯৯ জরুরি সেবা নিতে পারবেন।",
          steps: [
            "যেকোনো ব্রাউজার থেকে সরাসরি প্রবেশ",
            "তথ্য সবসময় আপনার ডিভাইসেই থাকে",
            "ইচ্ছা হলে প্রোফাইল তৈরি করার সুবিধা",
          ],
        },
        {
          q: "আমার স্বাস্থ্য তথ্যের গোপনীয়তা কতটা সুরক্ষিত?",
          a: "সম্পূর্ণ সুরক্ষিত। আপনার চ্যাট হিস্ট্রি, প্রেসক্রিপশন ও স্বাস্থ্য সংক্রান্ত সকল তথ্য শুধুমাত্র আপনার ফোনের বা কম্পিউটারের ব্রাউজারে জমা থাকে। কোনো সার্ভারে আপনার গোপন তথ্য জমা রাখা হয় না।",
          steps: [
            "সার্ভার ডাটাবেস ট্র্যাকিং মুক্ত",
            "লোকাল এনক্রিপশন সুরক্ষা",
            "এক ক্লিকেই তথ্য ডিলিট বা এক্সপোর্টের সুযোগ",
          ],
        },
      ],
    },

    plans: {
      title: "সহজ ও স্বচ্ছ স্বাস্থ্যসেবা প্ল্যান",
      subtitle:
        "যেকোনো সময় বিনামূল্যে প্রাথমিক চিকিৎসা পরামর্শ নিন, অথবা সীমাহীন সেবা ও আকর্ষণীয় ছাড়ের জন্য প্রিমিয়ামে আপগ্রেড করুন।",
      free: {
        name: "বেসিক প্ল্যান",
        price: "৳০",
        period: "আজীবন ফ্রি",
        description: "যাঁদের নিয়মিত দ্রুত প্রাথমিক স্বাস্থ্য পরামর্শ প্রয়োজন।",
        features: [
          "দৈনিক ২টি ফ্রি এআই পরামর্শ",
          "স্ট্যান্ডার্ড ফ্ল্যাশ এআই মডেল",
          "ডাক্তার ডিরেক্টরি অনুসন্ধান",
          "জরুরি ৯৯৯ ও হাসপাতাল তালিকা",
          "সর্বশেষ ৩টি চ্যাট হিস্ট্রি সংরক্ষণ",
        ],
        cta: "বিনামূল্যে শুরু করুন",
      },
      premium: {
        name: "মেডি-লিংক প্রিমিয়াম",
        price: "৳৫০০",
        period: "/ মাস",
        description: "আপনার ও আপনার পরিবারের জন্য পূর্ণাঙ্গ ডিজিটাল স্বাস্থ্য নিরাপত্তা।",
        badge: "জনপ্রিয় প্ল্যান",
        features: [
          "সীমাহীন এআই পরামর্শ (৯৯৯/দিন)",
          "প্রো রিজনিং এআই ডক্টর মোড",
          "সকল ওষুধে ২০% ফ্ল্যাট ছাড়",
          "ডাক্তার বুকিং ফিতে ২০% ছাড়",
          "পূর্ণাঙ্গ চ্যাট হিস্ট্রি ও PDF ডাউনলোড",
          "অগ্রাধিকার ভিত্তিতে ২৪/৭ স্বাস্থ্য সহায়তা",
        ],
        cta: "প্রিমিয়ামে আপগ্রেড করুন",
        manageCta: "সক্রিয় প্ল্যান দেখুন",
      },
      note: "bKash, Nagad বা কার্ডের মাধ্যমে সম্পূর্ণ নিরাপদ পেমেন্ট। যেকোনো সময় বাতিলযোগ্য।",
    },

    finalCta: {
      badge: "আজই শুরু করুন",
      title: "বাংলাদেশের মানুষের জন্য দ্রুত ও স্মার্ট স্বাস্থ্যসেবা",
      subtitle:
        "উন্নত এআই পরামর্শ, ঘরে বসে জরুরি ওষুধ ডেলিভারি এবং দেশের সেরা বিশেষজ্ঞ ডাক্তারদের সেবা নিন সহজেই।",
      features: [
        "কোনো অ্যাপ ডাউনলোডের প্রয়োজন নেই",
        "বাংলা ও ইংরেজি উভয় ভাষায় কার্যকর",
        "১০০% বিনামূল্যে ব্যবহারযোগ্য",
      ],
      buttons: [
        {
          title: "ডাঃ মেডি-লিংকের সাথে কথা বলুন",
          subtitle: "স্মার্ট এআই স্বাস্থ্য সহকারী",
        },
        {
          title: "ডাক্তারের পরামর্শ নিন",
          subtitle: "যাচাইকৃত বিশেষজ্ঞ ডাক্তার",
        },
        {
          title: "ওষুধ অর্ডার করুন",
          subtitle: "দ্রুততম হোম ডেলিভারি",
        },
      ],
    },
  },
};
