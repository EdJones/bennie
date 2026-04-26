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
      { name: "Into Reading", products: ["Into Reading", "HMH Into Reading 2020"] },
      { name: "Wonders", products: ["Wonders", "Wonders 2020", "Wonders 2023"] },
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
        products: [
          "Core Knowledge Language Arts (CKLA)",
          "CKLA Skills",
          "CKLA Knowledge",
          "Amplify CKLA K-5 Core Comprehensive",
          "Amplify CKLA Skills, 2020",
        ],
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
        products: [
          "UFLI Foundations",
          "UFLI Virtual Teaching Resource Hub",
          "UFLI Foundations: An Explicit and Systematic Phonics Program",
        ],
      },
      {
        name: "Heggerty",
        products: [
          "Phonemic Awareness Curriculum",
          "Bridge to Reading",
          "Heggerty Phonemic Awareness Curriculum",
        ],
      },
      {
        name: "Lexia Core5",
        products: [
          "Core5 Reading",
          "PowerUp Literacy",
          "Lexia LETRS",
          "Lexia Core5 Reading",
          "Lexia PowerUp Literacy",
        ],
      },
      {
        name: "95 Phonics Core Program",
        products: ["95 Phonics Core Program", "95 Phonics Lesson Library", "Phonics Chip Kit"],
      },
      {
        name: "Really Great Reading",
        products: ["Phonics Blitz", "Phonics Boost", "HD Word", "Countdown"],
      },
      { name: "Saxon Phonics", products: ["Saxon Phonics"] },
      {
        name: "Reading Mastery",
        products: ["Reading Mastery", "SRA Early Interventions", "Corrective Reading"],
      },
      {
        name: "Orton-Gillingham",
        products: [
          "Orton-Gillingham Approach",
          "IMSE Orton-Gillingham",
          "Barton Reading & Spelling System",
          "S.P.I.R.E. Reading Program",
          "S.P.I.R.E.",
        ],
      },
      { name: "Benchmark Phonics", products: ["Benchmark Phonics", "Aligned Phonics Curriculum"] },
      { name: "Flyleaf", products: ["Flyleaf Emergent Readers", "Flyleaf Transitional Readers"] },
      {
        name: "Reading Horizons",
        products: ["Reading Horizons Discovery", "Reading Horizons Elevate"],
      },
      { name: "Sonday System", products: ["Sonday System 1", "Sonday System 2"] },
      {
        name: "Lindamood-Bell",
        products: [
          "Seeing Stars",
          "Visualizing and Verbalizing",
          "Lips",
          "LiPS (Lindamood Phoneme Sequencing)",
          "RAVE-O",
        ],
      },
      {
        name: "Read Naturally",
        products: ["Read Naturally Live", "Read Naturally GATE", "Read Naturally ME"],
      },
      { name: "All About Reading", products: ["All About Reading", "All About Spelling"] },
      { name: "Logic of English", products: ["Essentials"] },
      { name: "Read 180 / System 44", products: ["Read 180", "System 44"] },
      {
        name: "Language! Live",
        products: [
          "Language! Live",
          "Language!",
          "Read Well",
          "REWARDS",
          "Six Minute Solutions",
          "Voyager Passport",
        ],
      },
      { name: "Letterland", products: ["Letterland Phonics", "Fix-it Phonics"] },
      { name: "Jolly Phonics", products: ["Jolly Phonics", "Jolly Grammar"] },
      {
        name: "Explode the Code",
        products: ["Explode The Code", "Explode the Code", "Recipe for Reading"],
      },
      { name: "Superkids", products: ["Superkids Reading Program"] },
      {
        name: "Structured Literacy Intervention",
        products: ["Structured Literacy Intervention"],
      },
      {
        name: "i-Ready",
        products: ["i-Ready Instruction", "Phonics for Reading", "Ready Reading"],
      },
      { name: "Words Their Way", products: ["Words Their Way"] },
      { name: "Fast ForWord", products: ["Fast ForWord"] },
      { name: "Reading Recovery", products: ["Reading Recovery"] },
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
