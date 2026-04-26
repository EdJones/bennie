export const curriculumCategories = [
  {
    name: "Balanced Literacy",
    color: "#fce4e4",
    textColor: "#8b2020",
    programs: [
      { name: "Units of Study", products: ["Units of Study"] },
      {
        name: "Fountas & Pinnell Classroom",
        products: ["Leveled Literacy Intervention (LLI)", "Phonics, Spelling, and Word Study"],
      },
    ],
  },
  {
    name: "Basals",
    color: "#fef9e7",
    textColor: "#7a5a00",
    programs: [
      { name: "Into Reading", products: ["Into Reading"] },
      { name: "Wonders", products: ["Wonders"] },
      { name: "Benchmark Workshop", products: ["Benchmark Workshop"] },
      { name: "Benchmark Advance", products: ["Benchmark Advance", "ReadyGEN"] },
      { name: "myView Literacy", products: ["myView Literacy"] },
      { name: "Open Court Reading", products: ["Open Court Reading"] },
    ],
  },
  {
    name: "Book-Centered & Knowledge-Building",
    color: "#e8f3e8",
    textColor: "#1a4a20",
    programs: [
      {
        name: "EL Education",
        products: [
          "EL Education K-8 Language Arts 2nd Ed.",
          "EL Education K-5 Language Arts 2nd Ed.",
          "EL Education K-5 Language Arts",
          "Skills Block",
        ],
      },
      { name: "Wit & Wisdom", products: ["Wit & Wisdom", "Geodes"] },
      {
        name: "Core Knowledge (CKLA)",
        products: ["Core Knowledge Language Arts (CKLA)", "CKLA Skills", "CKLA Knowledge"],
      },
      { name: "ELA Guidebooks", products: ["ELA Guidebooks"] },
      { name: "Bookworms", products: ["Bookworms K-5"] },
    ],
  },
  {
    name: "Foundational / Phonics",
    color: "#ede8f5",
    textColor: "#3a1a6a",
    programs: [
      { name: "Fundations", products: ["Fundations"] },
      { name: "Wilson Reading System", products: ["Wilson Reading System", "Just Words"] },
      {
        name: "SIPPS",
        products: ["SIPPS Beginning", "SIPPS Extension", "SIPPS Plus", "SIPPS Challenge"],
      },
      {
        name: "UFLI Foundations",
        products: ["UFLI Foundations", "UFLI Virtual Teaching Resource Hub"],
      },
      { name: "Heggerty", products: ["Phonemic Awareness Curriculum", "Bridge to Reading"] },
      { name: "Lexia Core5", products: ["Core5 Reading", "PowerUp Literacy", "Lexia LETRS"] },
      {
        name: "95 Phonics Core Program",
        products: ["95 Phonics Core Program", "95 Phonics Lesson Library", "Phonics Chip Kit"],
      },
      {
        name: "Really Great Reading",
        products: ["Phonics Blitz", "Phonics Boost", "HD Word", "Countdown"],
      },
      { name: "Saxon Phonics", products: ["Saxon Phonics"] },
      { name: "Reading Mastery", products: ["Reading Mastery", "SRA Early Interventions"] },
      {
        name: "Orton-Gillingham",
        products: [
          "Orton-Gillingham Approach",
          "IMSE Orton-Gillingham",
          "Barton Reading & Spelling System",
          "S.P.I.R.E. Reading Program",
        ],
      },
      { name: "Benchmark Phonics", products: ["Benchmark Phonics", "Aligned Phonics Curriculum"] },
      { name: "Flyleaf", products: ["Flyleaf Emergent Readers", "Flyleaf Transitional Readers"] },
      {
        name: "Reading Horizons",
        products: ["Reading Horizons Discovery", "Reading Horizons Elevate"],
      },
    ],
  },
];

export const homegrownCategory = {
  name: "Homegrown",
  color: "#fdecea",
  textColor: "#8b2020",
};

export function getProgramForProduct(product) {
  for (const category of curriculumCategories) {
    for (const program of category.programs) {
      if (program.products.includes(product)) {
        return { categoryName: category.name, programName: program.name };
      }
    }
  }
  return null;
}
