/// <reference types="node" />
import { PrismaClient, UserRole, ApplicationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Real universities data from around the world
const universitiesData = [
  // USA Universities
  {
      name: "Stanford University",
    slug: "stanford-university",
      country: "United States",
      city: "Stanford, California",
      language: "English",
    establishmentYear: 1885,
    worldRanking: 3,
    localRanking: 3,
    studentsNumber: "17,000+",
    description: "Stanford University is a private research university known for academic excellence, innovation, and entrepreneurship.",
    about: "Stanford University, officially Leland Stanford Junior University, is a private research university in Stanford, California. The campus occupies 8,180 acres, among the largest in the United States, and enrolls over 17,000 students. Stanford is ranked among the best universities in the world.",
      website: "https://www.stanford.edu",
    logoUrl: "/uploads/universities/stanford-logo.png",
    bannerUrl: "/uploads/universities/stanford-banner.jpg",
    admissionRequirements: [
      "High school diploma or equivalent",
      "SAT or ACT scores",
      "English proficiency test (TOEFL/IELTS)",
      "Letters of recommendation",
      "Personal statement",
      "Academic transcripts"
    ],
    services: [
      "Student housing",
      "Career counseling",
      "Health services",
      "International student support",
      "Scholarship programs",
      "Research opportunities"
    ],
    tourImages: [
      "/uploads/universities/stanford-tour-1.jpg",
      "/uploads/universities/stanford-tour-2.jpg",
      "/uploads/universities/stanford-tour-3.jpg",
      "/uploads/universities/stanford-tour-4.jpg",
      "/uploads/universities/stanford-tour-5.jpg"
    ]
  },
  {
    name: "Harvard University",
    slug: "harvard-university",
    country: "United States",
    city: "Cambridge, Massachusetts",
    language: "English",
    establishmentYear: 1636,
    worldRanking: 1,
    localRanking: 1,
    studentsNumber: "23,000+",
    description: "Harvard University is America's oldest institution of higher learning, founded in 1636.",
    about: "Harvard University is a private Ivy League research university in Cambridge, Massachusetts. Established in 1636 and named for its first benefactor, clergyman John Harvard, Harvard is the United States' oldest institution of higher learning, and its history, influence, and wealth have made it one of the world's most prestigious universities.",
    website: "https://www.harvard.edu",
    logoUrl: "/uploads/universities/harvard-logo.png",
    bannerUrl: "/uploads/universities/harvard-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "SAT or ACT scores",
      "TOEFL/IELTS for international students",
      "Three letters of recommendation",
      "Personal essay",
      "Academic transcripts"
    ],
    services: [
      "On-campus housing",
      "Career services",
      "Health and wellness center",
      "International office",
      "Financial aid",
      "Library access"
    ],
    tourImages: [
      "/uploads/universities/harvard-tour-1.jpg",
      "/uploads/universities/harvard-tour-2.jpg",
      "/uploads/universities/harvard-tour-3.jpg"
    ]
  },
  {
    name: "Massachusetts Institute of Technology",
    slug: "mit-university",
    country: "United States",
    city: "Cambridge, Massachusetts",
    language: "English",
    establishmentYear: 1861,
    worldRanking: 2,
    localRanking: 2,
    studentsNumber: "11,000+",
    description: "MIT is a world-renowned institution for science, technology, and engineering education.",
    about: "The Massachusetts Institute of Technology is a private land-grant research university in Cambridge, Massachusetts. Established in 1861, MIT has since played a key role in the development of modern technology and science, ranking among the top academic institutions in the world.",
    website: "https://www.mit.edu",
    logoUrl: "/uploads/universities/mit-logo.png",
    bannerUrl: "/uploads/universities/mit-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "SAT/ACT scores",
      "English proficiency",
      "Recommendation letters",
      "Personal statement",
      "Strong math and science background"
    ],
    services: [
      "Research facilities",
      "Student housing",
      "Career development",
      "Health services",
      "International support",
      "Scholarships"
    ],
    tourImages: [
      "/uploads/universities/mit-tour-1.jpg",
      "/uploads/universities/mit-tour-2.jpg"
    ]
  },
  // UK Universities
  {
      name: "University of Oxford",
    slug: "university-of-oxford",
      country: "United Kingdom",
      city: "Oxford",
      language: "English",
    establishmentYear: 1096,
    worldRanking: 4,
    localRanking: 1,
    studentsNumber: "24,000+",
    description: "The University of Oxford is the oldest university in the English-speaking world.",
    about: "The University of Oxford is a collegiate research university in Oxford, England. There is evidence of teaching as early as 1096, making it the oldest university in the English-speaking world and the world's second-oldest university in continuous operation.",
      website: "https://www.ox.ac.uk",
    logoUrl: "/uploads/universities/oxford-logo.png",
    bannerUrl: "/uploads/universities/oxford-banner.jpg",
    admissionRequirements: [
      "A-levels or equivalent",
      "English language proficiency",
      "Personal statement",
      "References",
      "Admissions test (for some courses)",
      "Interview"
    ],
    services: [
      "College accommodation",
      "Career services",
      "Health center",
      "International student support",
      "Bursaries and scholarships",
      "Library system"
    ],
    tourImages: [
      "/uploads/universities/oxford-tour-1.jpg",
      "/uploads/universities/oxford-tour-2.jpg",
      "/uploads/universities/oxford-tour-3.jpg"
    ]
  },
  {
    name: "University of Cambridge",
    slug: "university-of-cambridge",
    country: "United Kingdom",
    city: "Cambridge",
    language: "English",
    establishmentYear: 1209,
    worldRanking: 5,
    localRanking: 2,
    studentsNumber: "23,000+",
    description: "The University of Cambridge is a collegiate research university in Cambridge, England.",
    about: "The University of Cambridge is a collegiate research university in Cambridge, England. Founded in 1209 and granted a royal charter by King Henry III in 1231, Cambridge is the second-oldest university in the English-speaking world and the world's fourth-oldest surviving university.",
    website: "https://www.cam.ac.uk",
    logoUrl: "/uploads/universities/cambridge-logo.png",
    bannerUrl: "/uploads/universities/cambridge-banner.jpg",
    admissionRequirements: [
      "A-levels or equivalent",
      "IELTS/TOEFL",
      "Personal statement",
      "Academic references",
      "Admissions assessment",
      "Interview"
    ],
    services: [
      "College system",
      "Career service",
      "Health and wellbeing",
      "International students office",
      "Financial support",
      "Extensive libraries"
    ],
    tourImages: [
      "/uploads/universities/cambridge-tour-1.jpg",
      "/uploads/universities/cambridge-tour-2.jpg"
    ]
  },
  {
    name: "Imperial College London",
    slug: "imperial-college-london",
    country: "United Kingdom",
    city: "London",
    language: "English",
    establishmentYear: 1907,
    worldRanking: 6,
    localRanking: 3,
    studentsNumber: "19,000+",
    description: "Imperial College London is a public research university specializing in science, engineering, medicine, and business.",
    about: "Imperial College London is a public research university in London, England. Its history began with Prince Albert, consort of Queen Victoria, who developed his vision for a cultural area that included the Royal Albert Hall, the Victoria and Albert Museum, the Natural History Museum and several royal colleges.",
    website: "https://www.imperial.ac.uk",
    logoUrl: "/uploads/universities/imperial-logo.png",
    bannerUrl: "/uploads/universities/imperial-banner.jpg",
    admissionRequirements: [
      "A-levels or IB",
      "English language test",
      "Personal statement",
      "References",
      "Admissions test",
      "Interview"
    ],
    services: [
      "Halls of residence",
      "Career service",
      "Health center",
      "International support",
      "Scholarships",
      "Research opportunities"
    ],
    tourImages: [
      "/uploads/universities/imperial-tour-1.jpg",
      "/uploads/universities/imperial-tour-2.jpg"
    ]
  },
  // Canadian Universities
  {
      name: "University of Toronto",
    slug: "university-of-toronto",
      country: "Canada",
    city: "Toronto, Ontario",
    language: "English",
    establishmentYear: 1827,
    worldRanking: 18,
    localRanking: 1,
    studentsNumber: "95,000+",
    description: "The University of Toronto is Canada's leading institution of learning, discovery and knowledge creation.",
    about: "The University of Toronto is a public research university in Toronto, Ontario, Canada, located on the grounds that surround Queen's Park. It was founded by royal charter in 1827 as King's College, the first institution of higher learning in Upper Canada.",
      website: "https://www.utoronto.ca",
    logoUrl: "/uploads/universities/toronto-logo.png",
    bannerUrl: "/uploads/universities/toronto-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "English proficiency",
      "Academic transcripts",
      "Personal statement",
      "Letters of recommendation"
    ],
    services: [
      "Residence options",
      "Career center",
      "Health services",
      "International student support",
      "Financial aid",
      "Library system"
    ],
    tourImages: [
      "/uploads/universities/toronto-tour-1.jpg",
      "/uploads/universities/toronto-tour-2.jpg",
      "/uploads/universities/toronto-tour-3.jpg"
    ]
  },
  {
    name: "McGill University",
    slug: "mcgill-university",
    country: "Canada",
    city: "Montreal, Quebec",
    language: "English",
    establishmentYear: 1821,
    worldRanking: 31,
    localRanking: 2,
    studentsNumber: "40,000+",
    description: "McGill University is a public research university located in Montreal, Quebec, Canada.",
    about: "McGill University is a public research university located in Montreal, Quebec, Canada. Founded in 1821 by royal charter granted by King George IV, the university bears the name of James McGill, a Scottish merchant whose bequest in 1813 formed the university's precursor, McGill College.",
    website: "https://www.mcgill.ca",
    logoUrl: "/uploads/universities/mcgill-logo.png",
    bannerUrl: "/uploads/universities/mcgill-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "English/French proficiency",
      "Academic records",
      "Personal statement",
      "References"
    ],
    services: [
      "Student housing",
      "Career planning",
      "Health services",
      "International services",
      "Scholarships",
      "Research facilities"
    ],
    tourImages: [
      "/uploads/universities/mcgill-tour-1.jpg",
      "/uploads/universities/mcgill-tour-2.jpg"
    ]
  },
  // German Universities
  {
    name: "Ludwig Maximilian University of Munich",
    slug: "lmu-munich",
    country: "Germany",
    city: "Munich",
    language: "German",
    establishmentYear: 1472,
    worldRanking: 32,
    localRanking: 1,
    studentsNumber: "52,000+",
    description: "LMU Munich is one of Europe's premier academic and research institutions.",
    about: "Ludwig Maximilian University of Munich is a public research university located in Munich, Germany. The university is Germany's sixth-oldest university in continuous operation. Originally established in Ingolstadt in 1472 by Duke Ludwig IX of Bavaria-Landshut, the university was moved in 1800 to Landshut by King Maximilian I of Bavaria when Ingolstadt was threatened by the French, before being relocated to its present-day location in Munich in 1826 by King Ludwig I of Bavaria.",
    website: "https://www.lmu.de",
    logoUrl: "/uploads/universities/lmu-logo.png",
    bannerUrl: "/uploads/universities/lmu-banner.jpg",
    admissionRequirements: [
      "Abitur or equivalent",
      "German language proficiency (DSH/TestDaF)",
      "Academic transcripts",
      "Motivation letter",
      "CV"
    ],
    services: [
      "Student accommodation",
      "Career service",
      "Health insurance support",
      "International office",
      "Scholarships",
      "Language courses"
    ],
    tourImages: [
      "/uploads/universities/lmu-tour-1.jpg",
      "/uploads/universities/lmu-tour-2.jpg"
    ]
  },
  {
    name: "Technical University of Munich",
    slug: "tum-munich",
    country: "Germany",
    city: "Munich",
    language: "German",
    establishmentYear: 1868,
    worldRanking: 37,
    localRanking: 2,
    studentsNumber: "42,000+",
    description: "TUM is one of Europe's top universities, committed to excellence in research and teaching.",
    about: "The Technical University of Munich is a public research university in Munich, Germany. It specializes in engineering, technology, medicine, and applied and natural sciences.",
    website: "https://www.tum.de",
    logoUrl: "/uploads/universities/tum-logo.png",
    bannerUrl: "/uploads/universities/tum-banner.jpg",
    admissionRequirements: [
      "Abitur or equivalent",
      "German/English proficiency",
      "Academic records",
      "Motivation letter",
      "CV",
      "Portfolio (for some programs)"
    ],
    services: [
      "Student housing",
      "Career center",
      "Health services",
      "International office",
      "Scholarships",
      "Research opportunities"
    ],
    tourImages: [
      "/uploads/universities/tum-tour-1.jpg",
      "/uploads/universities/tum-tour-2.jpg"
    ]
  },
  // French Universities
  {
    name: "Sorbonne University",
    slug: "sorbonne-university",
    country: "France",
    city: "Paris",
    language: "French",
    establishmentYear: 1257,
    worldRanking: 43,
    localRanking: 1,
    studentsNumber: "55,000+",
    description: "Sorbonne University is one of the world's oldest universities, located in the heart of Paris.",
    about: "Sorbonne University is a public research university in Paris, France. It was established in 2018 through the merger of Paris-Sorbonne University and Pierre and Marie Curie University, inheriting the legacy of the historic Sorbonne College founded in 1257.",
    website: "https://www.sorbonne-universite.fr",
    logoUrl: "/uploads/universities/sorbonne-logo.png",
    bannerUrl: "/uploads/universities/sorbonne-banner.jpg",
    admissionRequirements: [
      "Baccalauréat or equivalent",
      "French language proficiency (DELF/DALF)",
      "Academic transcripts",
      "Motivation letter",
      "CV"
    ],
    services: [
      "Student housing assistance",
      "Career services",
      "Health services",
      "International relations",
      "Scholarships",
      "Cultural activities"
    ],
    tourImages: [
      "/uploads/universities/sorbonne-tour-1.jpg",
      "/uploads/universities/sorbonne-tour-2.jpg",
      "/uploads/universities/sorbonne-tour-3.jpg"
    ]
  },
  // Australian Universities
  {
    name: "University of Melbourne",
    slug: "university-of-melbourne",
    country: "Australia",
    city: "Melbourne, Victoria",
    language: "English",
    establishmentYear: 1853,
    worldRanking: 14,
    localRanking: 1,
    studentsNumber: "52,000+",
    description: "The University of Melbourne is Australia's leading university, with a tradition of excellence in teaching and research.",
    about: "The University of Melbourne is a public research university located in Melbourne, Australia. Founded in 1853, it is Australia's second oldest university and the oldest in Victoria. Its main campus is located in Parkville, an inner suburb north of Melbourne's central business district.",
    website: "https://www.unimelb.edu.au",
    logoUrl: "/uploads/universities/melbourne-logo.png",
    bannerUrl: "/uploads/universities/melbourne-banner.jpg",
    admissionRequirements: [
      "High school certificate",
      "English proficiency (IELTS/TOEFL)",
      "Academic transcripts",
      "Personal statement",
      "References"
    ],
    services: [
      "Accommodation services",
      "Career services",
      "Health and wellbeing",
      "International student support",
      "Scholarships",
      "Library and IT services"
    ],
    tourImages: [
      "/uploads/universities/melbourne-tour-1.jpg",
      "/uploads/universities/melbourne-tour-2.jpg"
    ]
  },
  {
    name: "University of Sydney",
    slug: "university-of-sydney",
    country: "Australia",
    city: "Sydney, New South Wales",
    language: "English",
    establishmentYear: 1850,
    worldRanking: 19,
    localRanking: 2,
    studentsNumber: "73,000+",
    description: "The University of Sydney is Australia's first university and is consistently ranked among the world's top universities.",
    about: "The University of Sydney is an Australian public research university in Sydney, Australia. Founded in 1850, it is Australia's first university and is regarded as one of the world's leading universities. The university is known as one of Australia's six sandstone universities.",
    website: "https://www.sydney.edu.au",
    logoUrl: "/uploads/universities/sydney-logo.png",
    bannerUrl: "/uploads/universities/sydney-banner.jpg",
    admissionRequirements: [
      "High school certificate",
      "IELTS/TOEFL",
      "Academic records",
      "Personal statement",
      "References"
    ],
    services: [
      "Accommodation",
      "Career center",
      "Health services",
      "International student services",
      "Financial support",
      "Student support services"
    ],
    tourImages: [
      "/uploads/universities/sydney-tour-1.jpg",
      "/uploads/universities/sydney-tour-2.jpg"
    ]
  },
  // Swiss Universities
  {
    name: "ETH Zurich",
    slug: "eth-zurich",
    country: "Switzerland",
    city: "Zurich",
    language: "German",
    establishmentYear: 1855,
    worldRanking: 7,
    localRanking: 1,
    studentsNumber: "22,000+",
    description: "ETH Zurich is one of the world's leading universities in science and technology.",
    about: "ETH Zurich is a public research university in the city of Zurich, Switzerland. Founded by the Swiss Federal Government in 1854 with the stated mission to educate engineers and scientists, the school focuses exclusively on science, technology, engineering and mathematics.",
    website: "https://www.ethz.ch",
    logoUrl: "/uploads/universities/eth-logo.png",
    bannerUrl: "/uploads/universities/eth-banner.jpg",
    admissionRequirements: [
      "Matura or equivalent",
      "German/English proficiency",
      "Academic transcripts",
      "Motivation letter",
      "CV"
    ],
    services: [
      "Student housing",
      "Career services",
      "Health services",
      "International relations",
      "Scholarships",
      "Research facilities"
    ],
    tourImages: [
      "/uploads/universities/eth-tour-1.jpg",
      "/uploads/universities/eth-tour-2.jpg"
    ]
  },
  // Japanese Universities
  {
    name: "University of Tokyo",
    slug: "university-of-tokyo",
    country: "Japan",
    city: "Tokyo",
    language: "Japanese",
    establishmentYear: 1877,
    worldRanking: 23,
    localRanking: 1,
    studentsNumber: "28,000+",
    description: "The University of Tokyo is Japan's most prestigious university and one of Asia's top institutions.",
    about: "The University of Tokyo is a public research university located in Bunkyō, Tokyo, Japan. Established in 1877, it was the first of the imperial universities and is considered one of the most prestigious universities in Japan.",
    website: "https://www.u-tokyo.ac.jp",
    logoUrl: "/uploads/universities/tokyo-logo.png",
    bannerUrl: "/uploads/universities/tokyo-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "Japanese language proficiency (JLPT)",
      "EJU (Examination for Japanese University Admission)",
      "Academic transcripts",
      "Personal statement"
    ],
    services: [
      "Student dormitories",
      "Career support",
      "Health services",
      "International student support",
      "Scholarships",
      "Language support"
    ],
    tourImages: [
      "/uploads/universities/tokyo-tour-1.jpg",
      "/uploads/universities/tokyo-tour-2.jpg"
    ]
  },
  // Singapore Universities
  {
    name: "National University of Singapore",
    slug: "nus-singapore",
    country: "Singapore",
    city: "Singapore",
    language: "English",
    establishmentYear: 1905,
    worldRanking: 8,
    localRanking: 1,
    studentsNumber: "38,000+",
    description: "NUS is Singapore's flagship university, offering a global approach to education and research.",
    about: "The National University of Singapore is a national research university in Singapore. Founded in 1905 as the Straits Settlements and Federated Malay States Government Medical School, NUS is the oldest autonomous university in Singapore.",
    website: "https://www.nus.edu.sg",
    logoUrl: "/uploads/universities/nus-logo.png",
    bannerUrl: "/uploads/universities/nus-banner.jpg",
    admissionRequirements: [
      "High school diploma",
      "English proficiency",
      "Academic transcripts",
      "Personal statement",
      "References",
      "Entrance exam (for some programs)"
    ],
    services: [
      "Student housing",
      "Career services",
      "Health services",
      "International relations",
      "Scholarships",
      "Research opportunities"
    ],
    tourImages: [
      "/uploads/universities/nus-tour-1.jpg",
      "/uploads/universities/nus-tour-2.jpg"
    ]
  }
];

// Programs data for each university
const programsData: Record<string, any[]> = {
  "stanford-university": [
    {
      name: "Computer Science",
      slug: "computer-science-stanford",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$58,416",
      department: "Computer Science",
      about: "The Computer Science program at Stanford provides a strong foundation in computer science fundamentals and offers flexibility to pursue advanced topics.",
      coreSubjects: ["Algorithms", "Data Structures", "Operating Systems", "Database Systems", "Software Engineering", "Machine Learning"],
      studyMethod: "On-campus",
      classSchedule: "Morning",
      startDate: "09/01"
    },
    {
      name: "Electrical Engineering",
      slug: "electrical-engineering-stanford",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$58,416",
      department: "Engineering",
      about: "The Electrical Engineering program prepares students for careers in electronics, power systems, and communications.",
      coreSubjects: ["Circuit Analysis", "Digital Systems", "Signals and Systems", "Electromagnetics", "Control Systems"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    },
    {
      name: "Master of Business Administration",
      slug: "mba-stanford",
      degree: "Master's",
      duration: "2 years",
      language: "English",
      tuition: "$76,950",
      department: "Business",
      about: "Stanford's MBA program is designed to develop leaders who can change the world.",
      coreSubjects: ["Finance", "Marketing", "Strategy", "Operations", "Leadership"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "harvard-university": [
    {
      name: "Economics",
      slug: "economics-harvard",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$54,269",
      department: "Economics",
      about: "Harvard's Economics program is one of the most prestigious in the world, offering rigorous training in economic theory and applications.",
      coreSubjects: ["Microeconomics", "Macroeconomics", "Econometrics", "Economic History", "International Economics"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    },
    {
      name: "Medicine",
      slug: "medicine-harvard",
      degree: "Master's",
      duration: "4 years",
      language: "English",
      tuition: "$66,284",
      department: "Medicine",
      about: "Harvard Medical School offers world-class medical education and research opportunities.",
      coreSubjects: ["Anatomy", "Physiology", "Pathology", "Pharmacology", "Clinical Medicine"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    },
    {
      name: "Law",
      slug: "law-harvard",
      degree: "Master's",
      duration: "3 years",
      language: "English",
      tuition: "$70,430",
      department: "Law",
      about: "Harvard Law School provides comprehensive legal education with a focus on critical thinking and practical skills.",
      coreSubjects: ["Constitutional Law", "Contracts", "Torts", "Criminal Law", "Property Law"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "mit-university": [
    {
      name: "Mechanical Engineering",
      slug: "mechanical-engineering-mit",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$57,986",
      department: "Engineering",
      about: "MIT's Mechanical Engineering program combines rigorous academics with hands-on research opportunities.",
      coreSubjects: ["Thermodynamics", "Fluid Mechanics", "Materials Science", "Design", "Manufacturing"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    },
    {
      name: "Physics",
      slug: "physics-mit",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$57,986",
      department: "Physics",
      about: "The Physics program at MIT emphasizes both theoretical understanding and experimental skills.",
      coreSubjects: ["Classical Mechanics", "Quantum Mechanics", "Electromagnetism", "Thermodynamics", "Statistical Mechanics"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    }
  ],
  "university-of-oxford": [
    {
      name: "Philosophy, Politics and Economics",
      slug: "ppe-oxford",
      degree: "Bachelor's",
      duration: "3 years",
      language: "English",
      tuition: "£27,840",
      department: "Social Sciences",
      about: "Oxford's PPE program is one of the most prestigious undergraduate degrees, combining three disciplines.",
      coreSubjects: ["Political Theory", "Microeconomics", "Moral Philosophy", "Political Economy", "History of Political Thought"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    },
    {
      name: "English Literature",
      slug: "english-literature-oxford",
      degree: "Bachelor's",
      duration: "3 years",
      language: "English",
      tuition: "£27,840",
      department: "Humanities",
      about: "Study English literature from its earliest forms to contemporary works at one of the world's leading universities.",
      coreSubjects: ["Medieval Literature", "Shakespeare", "Romanticism", "Modernism", "Contemporary Literature"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "university-of-cambridge": [
    {
      name: "Mathematics",
      slug: "mathematics-cambridge",
      degree: "Bachelor's",
      duration: "3 years",
      language: "English",
      tuition: "£24,507",
      department: "Mathematics",
      about: "Cambridge's Mathematics program is renowned worldwide for its rigor and depth.",
      coreSubjects: ["Analysis", "Algebra", "Geometry", "Probability", "Statistics"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    },
    {
      name: "Natural Sciences",
      slug: "natural-sciences-cambridge",
      degree: "Bachelor's",
      duration: "3-4 years",
      language: "English",
      tuition: "£37,293",
      department: "Sciences",
      about: "A flexible program allowing students to study multiple scientific disciplines.",
      coreSubjects: ["Biology", "Chemistry", "Physics", "Earth Sciences"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "imperial-college-london": [
    {
      name: "Aeronautical Engineering",
      slug: "aeronautical-engineering-imperial",
      degree: "Bachelor's",
      duration: "3-4 years",
      language: "English",
      tuition: "£37,900",
      department: "Engineering",
      about: "Study aeronautical engineering at one of the world's top engineering schools.",
      coreSubjects: ["Aerodynamics", "Structures", "Propulsion", "Flight Mechanics", "Avionics"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    },
    {
      name: "Biomedical Engineering",
      slug: "biomedical-engineering-imperial",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "£37,900",
      department: "Engineering",
      about: "Combine engineering principles with medical and biological sciences.",
      coreSubjects: ["Biomechanics", "Biomaterials", "Medical Imaging", "Tissue Engineering"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "university-of-toronto": [
    {
      name: "Psychology",
      slug: "psychology-toronto",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$60,510",
      department: "Psychology",
      about: "Explore the human mind and behavior through rigorous scientific study.",
      coreSubjects: ["Cognitive Psychology", "Developmental Psychology", "Social Psychology", "Neuroscience", "Research Methods"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    },
    {
      name: "Computer Science",
      slug: "computer-science-toronto",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "$60,510",
      department: "Computer Science",
      about: "Learn cutting-edge computer science in one of Canada's top programs.",
      coreSubjects: ["Programming", "Data Structures", "Algorithms", "Software Engineering", "AI"],
      studyMethod: "On-campus",
      classSchedule: "Morning"
    }
  ],
  "mcgill-university": [
    {
      name: "Medicine",
      slug: "medicine-mcgill",
      degree: "Master's",
      duration: "4 years",
      language: "English",
      tuition: "$52,500",
      department: "Medicine",
      about: "McGill's Faculty of Medicine is one of Canada's leading medical schools.",
      coreSubjects: ["Anatomy", "Physiology", "Pathology", "Clinical Skills"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "lmu-munich": [
    {
      name: "Business Administration",
      slug: "business-administration-lmu",
      degree: "Bachelor's",
      duration: "3 years",
      language: "German",
      tuition: "Free (EU students)",
      department: "Business",
      about: "Study business administration in the heart of Munich.",
      coreSubjects: ["Management", "Marketing", "Finance", "Accounting", "Economics"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "tum-munich": [
    {
      name: "Computer Science",
      slug: "computer-science-tum",
      degree: "Bachelor's",
      duration: "3 years",
      language: "German",
      tuition: "Free (EU students)",
      department: "Computer Science",
      about: "TUM's Computer Science program combines theory with practical applications.",
      coreSubjects: ["Programming", "Algorithms", "Software Engineering", "Database Systems"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "sorbonne-university": [
    {
      name: "French Literature",
      slug: "french-literature-sorbonne",
      degree: "Bachelor's",
      duration: "3 years",
      language: "French",
      tuition: "€2,770",
      department: "Humanities",
      about: "Study French literature at one of the world's oldest universities.",
      coreSubjects: ["Medieval Literature", "Classical Literature", "Modern Literature", "Literary Theory"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "university-of-melbourne": [
    {
      name: "Commerce",
      slug: "commerce-melbourne",
      degree: "Bachelor's",
      duration: "3 years",
      language: "English",
      tuition: "A$44,756",
      department: "Business",
      about: "Melbourne's Commerce program prepares students for careers in business and finance.",
      coreSubjects: ["Accounting", "Finance", "Marketing", "Management", "Economics"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "university-of-sydney": [
    {
      name: "Engineering",
      slug: "engineering-sydney",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "A$52,000",
      department: "Engineering",
      about: "Comprehensive engineering education with specializations in various fields.",
      coreSubjects: ["Mathematics", "Physics", "Engineering Design", "Materials Science"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "eth-zurich": [
    {
      name: "Computer Science",
      slug: "computer-science-eth",
      degree: "Bachelor's",
      duration: "3 years",
      language: "German",
      tuition: "CHF 730",
      department: "Computer Science",
      about: "ETH Zurich's Computer Science program is world-renowned for its excellence.",
      coreSubjects: ["Algorithms", "Programming", "Software Engineering", "Theoretical Computer Science"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "university-of-tokyo": [
    {
      name: "Engineering",
      slug: "engineering-tokyo",
      degree: "Bachelor's",
      duration: "4 years",
      language: "Japanese",
      tuition: "¥535,800",
      department: "Engineering",
      about: "Study engineering at Japan's most prestigious university.",
      coreSubjects: ["Mathematics", "Physics", "Engineering Fundamentals", "Specialized Engineering"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ],
  "nus-singapore": [
    {
      name: "Business Administration",
      slug: "business-administration-nus",
      degree: "Bachelor's",
      duration: "4 years",
      language: "English",
      tuition: "S$38,200",
      department: "Business",
      about: "NUS Business School offers world-class business education in Asia.",
      coreSubjects: ["Management", "Finance", "Marketing", "Operations", "Strategy"],
      studyMethod: "On-campus",
      classSchedule: "Full-time"
    }
  ]
};

// Common departments across universities
const commonDepartments = [
  { name: "Faculty of Engineering", description: "Engineering and technology programs" },
  { name: "Faculty of Computer Science & IT", description: "Computer science and information technology" },
  { name: "Faculty of Sciences", description: "Natural and physical sciences" },
  { name: "Faculty of Arts & Humanities", description: "Liberal arts and humanities" },
  { name: "Faculty of Medicine & Health Sciences", description: "Medical and health-related programs" },
  { name: "Faculty of Psychology & Education", description: "Psychology and education studies" },
  { name: "Faculty of Business & Economics", description: "Business administration and economics" },
  { name: "Faculty of Law", description: "Legal studies and jurisprudence" },
  { name: "Faculty of Architecture & Design", description: "Architecture and design programs" },
  { name: "Faculty of Social Sciences", description: "Social science disciplines" }
];

// Common degrees
const commonDegrees = [
  { name: "Bachelor's Degree", abbreviation: "BA/BSc", description: "Undergraduate degree program" },
  { name: "Master's Degree", abbreviation: "MA/MSc", description: "Graduate degree program" },
  { name: "PhD", abbreviation: "PhD", description: "Doctor of Philosophy" },
  { name: "Diploma", abbreviation: "Dip", description: "Diploma program" },
  { name: "Certificate", abbreviation: "Cert", description: "Certificate program" }
];

// Common educational years
const commonEducationalYears = [
  { name: "First Year", yearNumber: 1, description: "First year of study" },
  { name: "Second Year", yearNumber: 2, description: "Second year of study" },
  { name: "Third Year", yearNumber: 3, description: "Third year of study" },
  { name: "Fourth Year", yearNumber: 4, description: "Fourth year of study" },
  { name: "Graduate Year 1", yearNumber: 1, description: "First year of graduate studies" },
  { name: "Graduate Year 2", yearNumber: 2, description: "Second year of graduate studies" }
];

// Common semesters
const commonSemesters = [
  { name: "Fall 2024", startDate: "2024-09-01", endDate: "2024-12-20" },
  { name: "Spring 2025", startDate: "2025-01-15", endDate: "2025-05-15" },
  { name: "Fall 2025", startDate: "2025-09-01", endDate: "2025-12-20" },
  { name: "Spring 2026", startDate: "2026-01-15", endDate: "2026-05-15" }
];

// Sample students/applications
const sampleStudents = [
  { fullName: "Ahmed Hassan", email: "ahmed.hassan@example.com", country: "Egypt", phone: "+20 100 123 4567" },
  { fullName: "Sarah Johnson", email: "sarah.johnson@example.com", country: "United States", phone: "+1 555 123 4567" },
  { fullName: "Mohammed Ali", email: "mohammed.ali@example.com", country: "Saudi Arabia", phone: "+966 50 123 4567" },
  { fullName: "Emma Chen", email: "emma.chen@example.com", country: "China", phone: "+86 138 1234 5678" },
  { fullName: "James Wilson", email: "james.wilson@example.com", country: "United Kingdom", phone: "+44 20 1234 5678" },
  { fullName: "Fatima Al-Zahra", email: "fatima.alzahra@example.com", country: "UAE", phone: "+971 50 123 4567" },
  { fullName: "David Kim", email: "david.kim@example.com", country: "South Korea", phone: "+82 10 1234 5678" },
  { fullName: "Maria Garcia", email: "maria.garcia@example.com", country: "Spain", phone: "+34 600 123 456" },
  { fullName: "Yuki Tanaka", email: "yuki.tanaka@example.com", country: "Japan", phone: "+81 90 1234 5678" },
  { fullName: "Lucas Müller", email: "lucas.muller@example.com", country: "Germany", phone: "+49 151 1234 5678" }
];

// Testimonials
const testimonialsData = [
  {
    author: "Ahmed Hassan",
    role: "Computer Science Student",
    title: "Excellent Program",
    content: "The Computer Science program at Stanford exceeded my expectations. The faculty is world-class and the research opportunities are incredible.",
    rating: 5
  },
  {
    author: "Sarah Johnson",
      role: "MBA Graduate",
    title: "Life-Changing Experience",
    content: "Harvard's MBA program transformed my career. The network and education I received here are invaluable.",
    rating: 5
  },
  {
    author: "Mohammed Ali",
    role: "Engineering Student",
    title: "Great Support",
    content: "MIT provides excellent support for international students. The engineering program is challenging but rewarding.",
    rating: 5
  }
];

// FAQs
const faqsData = [
  {
    question: "What are the admission requirements?",
    answer: "Admission requirements vary by university and program. Generally, you'll need a high school diploma, English proficiency test scores (TOEFL/IELTS), academic transcripts, letters of recommendation, and a personal statement. Some programs may require additional tests or interviews.",
    category: "Admissions",
    sortOrder: 1
  },
  {
    question: "How much does tuition cost?",
    answer: "Tuition costs vary significantly by university, country, and program. Public universities in some countries (like Germany) may be free or low-cost for EU students, while private universities in the US can cost $50,000-$70,000 per year. Always check the specific university's website for current tuition fees.",
    category: "Tuition & Fees",
    sortOrder: 2
  },
  {
    question: "Are scholarships available?",
    answer: "Yes, most universities offer various scholarships for international students based on academic merit, financial need, or specific criteria. Some countries also offer government scholarships. Check each university's financial aid office for available opportunities.",
    category: "Financial Aid",
    sortOrder: 3
  },
  {
    question: "What is the application deadline?",
    answer: "Application deadlines vary by university and program. Generally, fall semester applications are due between December and March, while spring semester applications are due between September and November. Always check the specific deadline for your chosen program.",
    category: "Admissions",
    sortOrder: 4
  },
  {
    question: "Do I need a visa to study?",
    answer: "Yes, most international students need a student visa to study abroad. The requirements and process vary by country. Generally, you'll need an acceptance letter from the university, proof of financial support, health insurance, and sometimes a medical examination. Start the visa process early as it can take several months.",
    category: "Visa & Immigration",
    sortOrder: 5
  },
  {
    question: "Can I work while studying?",
    answer: "Many countries allow international students to work part-time (usually 20 hours per week) during the academic year and full-time during breaks. However, regulations vary by country and visa type. Check the specific regulations for your destination country.",
    category: "Student Life",
    sortOrder: 6
  },
  {
    question: "What language tests are accepted?",
    answer: "Most universities accept TOEFL, IELTS, or Cambridge English tests. Some universities also accept Duolingo English Test or their own language assessment. Minimum score requirements vary by university and program. Check your chosen university's requirements.",
    category: "Admissions",
    sortOrder: 7
  },
  {
    question: "Is on-campus housing available?",
    answer: "Most universities offer on-campus housing options, though availability varies. Some universities guarantee housing for first-year students. Off-campus housing is also usually available. Apply for housing early as spaces can be limited.",
    category: "Housing",
    sortOrder: 8
  }
];

async function main() {
  console.log("🌱 Starting comprehensive database seed...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);
  const universityPasswordHash = await bcrypt.hash("university123", 10);

  // ========== SANITY CHECK: MIGRATIONS APPLIED ==========
  // If core tables are missing, seeding can't proceed. Provide a clear, actionable message.
  try {
    await prisma.user.count();
  } catch (error: any) {
    if (error?.code === "P2021") {
      console.error(
        "❌ Database tables are missing (e.g. `User`). You must apply Prisma migrations before running seed.\n" +
          "Run:\n" +
          "  npx prisma migrate deploy\n" +
          "Then:\n" +
          "  npm run seed\n"
      );
      process.exit(1);
    }
    throw error;
  }

  // ========== CLEAR EXISTING DATA ==========
  console.log("Clearing existing data...");
  
  // Delete in order (respecting foreign key constraints)
  // Wrap in try-catch to handle missing tables gracefully
  try {
    await prisma.alert.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error; // P2021 = table doesn't exist
  }
  try {
    await prisma.applicationStatusHistory.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.payment.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.applicationDocument.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.application.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.testimonial.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.faq.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.program.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.department.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.semester.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.educationalYear.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.degree.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.university.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.profile.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.refreshToken.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }
  try {
    await prisma.user.deleteMany();
  } catch (error: any) {
    if (error.code !== 'P2021') throw error;
  }

  // ========== USERS ==========
  console.log("Creating users...");
  
  const adminUser = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@univolta.com",
      phone: "+1 555 0001",
      passwordHash,
      role: UserRole.admin,
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      name: "Content Editor",
      email: "editor@univolta.com",
      phone: "+1 555 0002",
      passwordHash: userPasswordHash,
      role: UserRole.editor,
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  // ========== UNIVERSITIES ==========
  console.log("Creating universities...");
  const createdUniversities: any[] = [];

  for (const uniData of universitiesData) {
    const university = await prisma.university.create({
      data: {
        name: uniData.name,
        slug: uniData.slug,
        country: uniData.country,
        city: uniData.city,
        language: uniData.language,
        description: uniData.description,
        about: uniData.about,
        website: uniData.website,
        logoUrl: uniData.logoUrl,
        bannerUrl: uniData.bannerUrl,
        establishmentYear: uniData.establishmentYear,
        worldRanking: uniData.worldRanking,
        localRanking: uniData.localRanking,
        studentsNumber: uniData.studentsNumber,
        admissionRequirements: uniData.admissionRequirements,
        services: uniData.services,
        tourImages: uniData.tourImages,
        isActive: true,
      },
    });
    createdUniversities.push(university);

    // Create university partner user
    const partnerEmail = `admin@${uniData.slug.replace(/-/g, "")}.univolta.com`;
    await prisma.user.create({
      data: {
        name: `${uniData.name} Administrator`,
        email: partnerEmail,
        phone: `+1 555 ${Math.floor(Math.random() * 9000) + 1000}`,
        passwordHash: universityPasswordHash,
        role: UserRole.university,
        universityId: university.id,
        isActive: true,
      },
    });

    // ========== DEPARTMENTS ==========
    console.log(`Creating departments for ${uniData.name}...`);
    const createdDepartments: any[] = [];
    for (const dept of commonDepartments) {
      const department = await prisma.department.create({
        data: {
          universityId: university.id,
          name: dept.name,
          description: dept.description,
          isActive: true,
        },
      });
      createdDepartments.push(department);
    }

    // ========== DEGREES ==========
    console.log(`Creating degrees for ${uniData.name}...`);
    const createdDegrees: any[] = [];
    for (const degree of commonDegrees) {
      const deg = await prisma.degree.create({
        data: {
          universityId: university.id,
          name: degree.name,
          abbreviation: degree.abbreviation,
          description: degree.description,
          isActive: true,
        },
      });
      createdDegrees.push(deg);
    }

    // ========== EDUCATIONAL YEARS ==========
    console.log(`Creating educational years for ${uniData.name}...`);
    const createdEducationalYears: any[] = [];
    for (const year of commonEducationalYears) {
      const eduYear = await prisma.educationalYear.create({
        data: {
          universityId: university.id,
          name: year.name,
          yearNumber: year.yearNumber,
          description: year.description,
          isActive: true,
        },
      });
      createdEducationalYears.push(eduYear);
    }

    // ========== SEMESTERS ==========
    console.log(`Creating semesters for ${uniData.name}...`);
    for (const semester of commonSemesters) {
      await prisma.semester.create({
        data: {
          universityId: university.id,
          name: semester.name,
          startDate: new Date(semester.startDate),
          endDate: new Date(semester.endDate),
          isActive: true,
        },
      });
    }

    // ========== PROGRAMS ==========
    console.log(`Creating programs for ${uniData.name}...`);
    const universityPrograms = programsData[uniData.slug] || [];
    const createdPrograms: any[] = [];

    for (const progData of universityPrograms) {
      // Find matching department and degree
      const department = createdDepartments.find(d => 
        progData.department?.toLowerCase().includes(d.name.toLowerCase().split(" ")[1]?.toLowerCase() || "")
      ) || createdDepartments[0];

      const degree = createdDegrees.find(d => 
        progData.degree?.toLowerCase().includes(d.name.toLowerCase().split(" ")[0]?.toLowerCase() || "")
      ) || createdDegrees[0];

      const program = await prisma.program.create({
        data: {
          universityId: university.id,
          name: progData.name,
          slug: progData.slug,
          degree: progData.degree,
          degreeId: degree.id,
          duration: progData.duration,
          language: progData.language,
          tuition: progData.tuition,
          department: progData.department,
          departmentId: department.id,
          about: progData.about,
          coreSubjects: progData.coreSubjects || [],
          studyMethod: progData.studyMethod,
          classSchedule: progData.classSchedule,
          startDate: progData.startDate,
          isActive: true,
        },
      });
      createdPrograms.push(program);
    }

    // ========== APPLICATIONS/STUDENTS ==========
    console.log(`Creating student applications for ${uniData.name}...`);
    for (let i = 0; i < Math.min(5, createdPrograms.length); i++) {
      const program = createdPrograms[i];
      const student = sampleStudents[Math.floor(Math.random() * sampleStudents.length)];
      const statuses: ApplicationStatus[] = ["PENDING", "REVIEW", "APPROVED", "REJECTED"];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const application = await prisma.application.create({
        data: {
          fullName: student.fullName,
          email: `${student.email.split("@")[0]}+${uniData.slug}@example.com`,
          phone: student.phone,
          country: student.country,
          universityId: university.id,
          programId: program.id,
          status,
          applicationFee: Math.floor(Math.random() * 200) + 50,
          totalFee: Math.floor(Math.random() * 50000) + 10000,
          isBlocked: Math.random() > 0.9, // 10% chance of being blocked
          blockedReason: Math.random() > 0.9 ? "Non-payment of fees" : null,
        },
      });

      // Create payment for some applications
      if (status === "APPROVED" && Math.random() > 0.3) {
        await prisma.payment.create({
          data: {
            applicationId: application.id,
            amount: application.totalFee || application.applicationFee || 1000,
            currency: "USD",
            paymentMethod: Math.random() > 0.5 ? "credit_card" : "paypal",
            paymentStatus: Math.random() > 0.2 ? "completed" : "pending",
            paidAt: Math.random() > 0.5 ? new Date() : null,
    },
  });
      }
    }

    // ========== TESTIMONIALS ==========
    if (Math.random() > 0.5) {
      const testimonial = testimonialsData[Math.floor(Math.random() * testimonialsData.length)];
      await prisma.testimonial.create({
        data: {
          universityId: university.id,
          author: testimonial.author,
          role: testimonial.role,
          title: testimonial.title,
          content: testimonial.content,
          rating: testimonial.rating,
          isPublished: true,
        },
      });
    }
  }

  // ========== FAQs ==========
  console.log("Creating FAQs...");
  for (const faq of faqsData) {
    await prisma.faq.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        isPublished: true,
        sortOrder: faq.sortOrder,
      },
    });
  }

  console.log("✅ Database seed completed successfully!");
  console.log(`Created ${createdUniversities.length} universities`);
  console.log(`Created ${createdUniversities.length} university partner users`);
  console.log(`Created ${faqsData.length} FAQs`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
