export const interventionProviders = [
  {
    name: "Wilson Language Training",
    products: ["Wilson Reading System", "Fundations", "Just Words"],
  },
  {
    name: "Barton Reading & Spelling",
    products: ["Barton Reading & Spelling System"],
  },
  {
    name: "Winsor Learning",
    products: ["Sonday System 1", "Sonday System 2"],
  },
  {
    name: "SIPPS (Collaborative Classroom)",
    products: ["SIPPS Beginning", "SIPPS Extension", "SIPPS Plus", "SIPPS Challenge"],
  },
  {
    name: "Read Naturally",
    products: ["Read Naturally Live", "Read Naturally GATE", "Read Naturally ME"],
  },
  {
    name: "Voyager Sopris Learning",
    products: ["REWARDS", "Six Minute Solutions", "Language! Live", "Read Well"],
  },
  {
    name: "Scholastic",
    products: ["Read 180", "System 44"],
  },
  {
    name: "Lexia Learning",
    products: ["Lexia Core5 Reading", "Lexia PowerUp Literacy"],
  },
  {
    name: "Curriculum Associates",
    products: ["i-Ready Instruction", "Phonics for Reading"],
  },
  {
    name: "Lindamood-Bell",
    products: [
      "LiPS (Lindamood Phoneme Sequencing)",
      "Seeing Stars",
      "Visualizing and Verbalizing",
      "RAVE-O",
    ],
  },
  {
    name: "Fountas & Pinnell",
    products: ["Leveled Literacy Intervention (LLI)"],
  },
  {
    name: "Really Great Reading",
    products: ["Phonics Blitz", "Phonics Boost"],
  },
  {
    name: "S.P.I.R.E. (Specialized Program Individualizing Reading Excellence)",
    products: ["S.P.I.R.E."],
  },
  {
    name: "All About Learning Press",
    products: ["All About Reading"],
  },
  {
    name: "Great Leaps",
    products: ["Great Leaps Reading"],
  },
  {
    name: "Scientific Learning",
    products: ["Fast ForWord"],
  },
  {
    name: "SRA / McGraw Hill",
    products: ["Corrective Reading", "Reading Mastery", "Spelling Mastery"],
  },
  {
    name: "Pearson / Scott Foresman",
    products: ["My Sidewalks on Reading Street"],
  },
  {
    name: "Educators Publishing Service (EPS)",
    products: ["Recipe for Reading", "Preventing Academic Failure (PAF)", "Explode the Code"],
  },
  {
    name: "Houghton Mifflin",
    products: ["Earobics"],
  },
  {
    name: "Learning A-Z",
    products: ["Reading A-Z", "Raz-Kids"],
  },
  {
    name: "Heggerty",
    products: ["Heggerty Phonemic Awareness Curriculum"],
  },
  {
    name: "Pearson",
    products: ["Words Their Way"],
  },
  {
    name: "Vanderbilt University",
    products: ["PALS (Peer-Assisted Learning Strategies)", "K-PALS"],
  },
  {
    name: "Reading Recovery Council of North America",
    products: ["Reading Recovery"],
  },
  {
    name: "University of Minnesota / CAREI",
    products: ["PRESS (Path to Reading Excellence in School Sites)"],
  },
  {
    name: "FCRR (Florida Center for Reading Research)",
    products: ["FCRR Student Center Activities"],
  },
  {
    name: "Other",
    products: [],
  },
];

// Borderline — these appear frequently in district data but are practice/platform
// tools rather than structured intervention programs. Not included above.
//
// - Accelerated Reader (Renaissance) — reading practice & motivation tool
// - IXL — adaptive skills practice platform
// - Study Island (Edmentum) — test prep and practice
// - Reading Eggs (3P Learning) — gamified reading practice, primarily K-2
// - Imagine Learning — adaptive platform; some modules are intervention-like
// - Minnesota Reading Corps — tutoring service delivery model, not a product
// - ADSIS — Minnesota state funding/program category, not a product

export function getInterventionProductNames() {
  return interventionProviders
    .flatMap((p) => p.products)
    .filter(Boolean)
    .sort();
}
