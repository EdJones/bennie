export const foundationsProviders = [
  // Major Publishers
  { name: 'Amplify', products: ['CKLA Skills', 'CKLA Knowledge', 'mCLASS'] },
  { name: 'Houghton Mifflin Harcourt (HMH)', products: ['Into Reading', 'Into Literature', 'Saxon Phonics'] },
  { name: 'McGraw Hill', products: ['Wonders', 'Open Court Reading', 'Reading Mastery', 'SRA Early Interventions'] },
  { name: 'Savvas Learning', products: ['myView Literacy', 'ReadyGEN', 'Benchmark Advance'] },
  { name: 'Scholastic', products: ['Read 180', 'System 44', 'Phonics Inventory', 'F.I.R.S.T.'] },
  { name: 'Curriculum Associates', products: ['Ready Reading', 'i-Ready Classroom'] },
  { name: 'Great Minds', products: ['Wit & Wisdom', 'Geodes'] },

  // Phonics-Focused Publishers
  { name: 'Wilson Language Training', products: ['Fundations', 'Wilson Reading System', 'Just Words'] },
  { name: '95 Percent Group', products: ['95 Phonics Core Program', '95 Phonics Lesson Library', 'Phonics Chip Kit'] },
  { name: 'Really Great Reading', products: ['Phonics Blitz', 'Phonics Boost', 'HD Word', 'Countdown'] },
  { name: 'Lexia Learning', products: ['Core5 Reading', 'PowerUp Literacy', 'Lexia LETRS'] },
  { name: 'Voyager Sopris Learning', products: ['LETRS', 'Voyager Passport', 'Language! Live'] },
  { name: 'SIPPS (Collaborative Classroom)', products: ['SIPPS Beginning', 'SIPPS Extension', 'SIPPS Plus', 'SIPPS Challenge'] },
  { name: 'University of Florida Literacy Institute', products: ['UFLI Foundations', 'UFLI Virtual Teaching Resource Hub'] },
  { name: 'Heggerty', products: ['Phonemic Awareness Curriculum', 'Bridge to Reading'] },

  // Orton-Gillingham Based
  { name: 'Orton-Gillingham Academy', products: ['Orton-Gillingham Approach'] },
  { name: 'Institute for Multi-Sensory Education (IMSE)', products: ['IMSE Orton-Gillingham'] },
  { name: 'Barton Reading & Spelling', products: ['Barton Reading & Spelling System'] },
  { name: 'Logic of English', products: ['Foundations', 'Essentials'] },
  { name: 'All About Learning Press', products: ['All About Reading', 'All About Spelling'] },
  { name: 'Spalding Education International', products: ['The Writing Road to Reading'] },
  { name: 'S.P.I.R.E.', products: ['S.P.I.R.E. Reading Program'] },

  // Structured Literacy
  { name: 'Benchmark Education', products: ['Benchmark Phonics', 'Benchmark Workshop'] },
  { name: 'EL Education', products: ['EL Education K-5 Language Arts', 'Skills Block'] },
  { name: 'Core Knowledge Foundation', products: ['Core Knowledge Language Arts (CKLA)'] },
  { name: 'Flyleaf Publishing', products: ['Flyleaf Emergent Readers', 'Flyleaf Transitional Readers'] },
  { name: 'Aligned Phonics', products: ['Aligned Phonics Curriculum'] },

  // Intervention Programs
  { name: 'Reading Horizons', products: ['Reading Horizons Discovery', 'Reading Horizons Elevate'] },
  { name: 'Sonday System', products: ['Sonday System 1', 'Sonday System 2'] },
  { name: 'Equipped for Reading Success', products: ['Equipped for Reading Success Program'] },
  { name: 'Lindamood-Bell', products: ['Seeing Stars', 'Visualizing and Verbalizing', 'Lips'] },
  { name: 'Stern Center', products: ['Structured Literacy Intervention'] },

  // Supplemental Phonics
  { name: 'Letterland', products: ['Letterland Phonics', 'Fix-it Phonics'] },
  { name: 'Jolly Learning', products: ['Jolly Phonics', 'Jolly Grammar'] },
  { name: 'Zoo-Phonics', products: ['Zoo-Phonics Curriculum'] },
  { name: 'Explode The Code', products: ['Explode The Code'] },
  { name: 'Primary Phonics', products: ['Primary Phonics'] },
  { name: 'Secret Stories', products: ['Secret Stories Phonics'] },
  { name: 'Phonics First', products: ['Phonics First Curriculum'] },
  { name: 'Zaner-Bloser', products: ['Superkids Reading Program', 'Handwriting'] },

  // Comprehensive ELA / Balanced Literacy
  { name: 'Collaborative Classroom', products: ['Being a Reader', 'Making Meaning', 'Being a Writer'] },
  { name: 'American Reading Company', products: ['ARC Core', 'IRLA'] },
  { name: 'Fountas & Pinnell', products: ['Leveled Literacy Intervention (LLI)', 'Phonics, Spelling, and Word Study'] },
  { name: 'Teachers College', products: ['Units of Study'] },
  { name: 'Success for All Foundation', products: ['Success for All', 'Reading Roots', 'Reading Wings'] },
  { name: 'Renaissance', products: ['Accelerated Reader', 'myON Reader', 'Star Assessments'] },
  { name: 'Imagine Learning', products: ['Imagine Language & Literacy', 'Imagine Reading'] },

  // State/Open Resources
  { name: 'Louisiana Department of Education', products: ['ELA Guidebooks'] },
  { name: 'Texas Education Agency', products: ['Texas Home Learning'] },
  { name: 'OpenUp Resources', products: ['EL Education Curriculum'] },
  { name: 'Bookworms Reading and Writing', products: ['Bookworms K-5'] },
  { name: 'FCRR (Florida Center for Reading Research)', products: ['FCRR Resources'] },

  // Other
  { name: 'Other', products: [] }
]

export function getProviderNames() {
  return foundationsProviders.map(p => p.name)
}

export function getProductsForProvider(providerName) {
  const provider = foundationsProviders.find(p => p.name === providerName)
  return provider?.products || []
}
