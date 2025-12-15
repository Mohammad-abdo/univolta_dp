export type University = {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  country: string;
  city: string;
  language: string;
  description?: string;
  about?: string;
  image1?: string;
  image2?: string;
  majors: string[];
};

export const universities: University[] = [
  {
    id: "stanford",
    name: "Stanford University",
    slug: "stanford-university",
    logo: "https://www.figma.com/api/mcp/asset/1e7840d0-4985-4467-b523-1eb6a114cab1",
    country: "United States",
    city: "Stanford, California",
    language: "English",
    description:
      "A leading research university recognized for innovation and an entrepreneurial spirit.",
    about:
      "Founded in 1885, Stanford combines academic excellence with innovation and entrepreneurship, offering students a dynamic and future-ready education.",
    image1: "https://www.figma.com/api/mcp/asset/4526099d-8632-426a-a631-7050b3c966ed",
    image2: "https://www.figma.com/api/mcp/asset/76019b0e-9f25-4d6d-ac86-45f799118d13",
    majors: [
      "Engineering",
      "Computer Science",
      "Business Administration",
      "Medicine",
      "Design",
    ],
  },
  {
    id: "sorbonne",
    name: "Sorbonne University",
    slug: "sorbonne-university",
    logo: "https://www.figma.com/api/mcp/asset/370aa03e-4865-41aa-9051-ffad6124c8a8",
    country: "France",
    city: "Paris",
    language: "French & English",
    description:
      "A historic institution delivering world-leading programs in humanities, sciences, and medicine.",
    about:
      "Sorbonne University stands at the heart of Paris, offering world-leading programs across humanities, sciences, and medicine with a diverse and international community.",
    image1: "https://www.figma.com/api/mcp/asset/76019b0e-9f25-4d6d-ac86-45f799118d13",
    image2: "https://www.figma.com/api/mcp/asset/4526099d-8632-426a-a631-7050b3c966ed",
    majors: [
      "Literature",
      "Law",
      "Economics",
      "Engineering",
      "Medicine",
    ],
  },
];



