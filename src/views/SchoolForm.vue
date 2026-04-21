<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStates, getDistricts, getSchools } from "../services/nces";
import { getProviderNames, getProductsForProvider } from "../data/providers";
import { useAuth } from "../composables/useAuth";
import { logSchoolCreate, logSchoolEdit } from "../services/activityLog";

const route = useRoute();
const router = useRouter();
const { user } = useAuth();

const form = ref({
  state: "",
  districtId: "",
  districtName: "",
  schoolId: "",
  schoolName: "",
  level: "school",
  elaCurricula: [],
  trainingGeneralEla: null,
  elaImplementationYear: "",
  trainingScienceOfReading: null,
  sorTrainingProgram: "",
  additionalProducts: null,
  additionalProductTypes: [],
  usesProgressMonitoring: null,
  progressMonitoringTools: [],
  progressMonitoringFrequency: "",
  usesDiagnosticAssessments: null,
  diagnosticAssessmentTools: [],
  diagnosticAssessmentFrequency: "",
  additionalInformation: "",
});

const states = ref([]);
const districts = ref([]);
const schools = ref([]);
const providers = getProviderNames();

const gradeRangePresets = [
  "K-6",
  "K-5",
  "K-4",
  "K-3",
  "K-2",
  "K-1",
  "1-6",
  "2-6",
  "3-6",
  "4-6",
  "5-6",
  "Grade K",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

const trainingPrograms = [
  "95% Group",
  "Academic Language Therapy Associates (ALTA)",
  "AIM Institute for Learning and Research",
  "ALLMemphis",
  "Ashlock Consulting, Inc.",
  "Atlanta Speech School: Rollins Center for Language and Literacy",
  "Bowman Educational Services",
  "Brainspring",
  "Chartwell Teaching Institution",
  "Classmates Educational Group, Inc.",
  "Consortium of Reading Excellence (CORE)",
  "DC Reading Clinic",
  "Dyslexia Association of Singapore (DAS) Academy",
  "Dyslexia Training Institute",
  "Edwards Orton-Gillingham, Inc.",
  "Glean Education",
  "Hamilton County Educational Service Center",
  "Institute for Multisensory Education (IMSE)",
  "International Multisensory Structured Language Education Council (IMSLEC)",
  "Jemicy w/ Notre Dame of Maryland University",
  "Keys to Literacy",
  "Landmark Outreach",
  "Learning MATTERS, Ltd.",
  "LETRS",
  "Lexercise / MindInformation Inc.",
  "Lexia",
  "Literacy How",
  "LitLife, Inc.",
  "Maharashtra Dyslexia Association",
  "MaxScholar LLC",
  "May Center for Learning",
  "Mayerson Academy",
  "Memphis Literacy Institute",
  "MGT Impact Solutions",
  "National Institute for Learning Development (NILD)",
  "Neuhaus Education Center",
  "North Carolina Department of Public Instruction",
  "Orton-Gillingham Academy",
  "Orton-Gillingham International – Yoshimoto",
  "Public Consulting Group",
  "R.E.A.D. Redefined",
  "Reading and Language Learning Center",
  "Reed Charitable Foundation",
  "Region 4 Education Service Center",
  "Savannah Dyslexia",
  "The Apple Group for Dyslexia",
  "Valley Speech Language and Learning Center",
  "Wilson Reading System (WRS)",
  "Other",
];

const loading = ref(false);
const loadingStates = ref(false);
const loadingDistricts = ref(false);
const loadingSchools = ref(false);
const isEdit = ref(false);
const saveSuccess = ref(false);
const savedDocId = ref(null);
const initializing = ref(false);
const initialFormData = ref(null);
const isFormSaved = ref(false);
const initialSaveComplete = ref(false);

const additionalProductTypeOptions = [
  "Assessment/screening tools",
  "Intervention programs",
  "Decodable readers",
  "Supplemental phonics materials",
  "Vocabulary programs",
  "Writing programs",
  "Digital/technology tools",
  "Other",
];

const progressMonitoringToolOptions = [
  "AIMSweb",
  "DIBELS",
  "FastBridge",
  "i-Ready",
  "MAP Growth",
  "STAR Reading",
  "Other",
];

const diagnosticAssessmentToolOptions = [
  "Brigance",
  "Comprehensive Test of Phonological Processing (CTOPP)",
  "Diagnostic Assessment of Reading (DAR)",
  "GORT (Gray Oral Reading Test)",
  "PAL-II (Process Assessment of the Learner)",
  "Phonological Awareness Literacy Screening (PALS)",
  "Test of Word Reading Efficiency (TOWRE)",
  "WADE (Wilson Assessment of Decoding and Encoding)",
  "WJ IV (Woodcock-Johnson IV)",
  "Other",
];

const assessmentFrequencyOptions = [
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "Beginning/Middle/End of year",
  "Other",
];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function hasUnsavedChanges() {
  if (isFormSaved.value) return false;
  if (!initialFormData.value) {
    return !!(form.value.state || form.value.districtId || form.value.schoolId);
  }
  return JSON.stringify(form.value) !== JSON.stringify(initialFormData.value);
}

function handleBeforeUnload(event) {
  if (hasUnsavedChanges() && !saveSuccess.value) {
    event.preventDefault();
    event.returnValue = "";
    return "";
  }
}

function migrateOldSchema(data) {
  if (data.elaCurricula || (!data.generalElaProvider && !data.foundationsProvider)) return data;

  const curricula = [];
  if (data.generalElaProvider) {
    curricula.push({
      gradeRange: "K-6",
      provider: data.generalElaProvider,
      product: data.generalElaProduct || "",
      year: data.generalElaYear || "",
    });
  }
  if (data.elaSameCurriculum === false && data.foundationsProvider) {
    curricula.push({
      gradeRange: "K-6",
      provider: data.foundationsProvider,
      product: data.foundationsProduct || "",
      year: data.foundationsYear || "",
    });
  }

  const migrated = { ...data };
  migrated.elaCurricula = curricula;
  migrated.level = data.level || "school";
  delete migrated.elaSameCurriculum;
  delete migrated.foundationsProvider;
  delete migrated.foundationsProduct;
  delete migrated.foundationsYear;
  delete migrated.generalElaProvider;
  delete migrated.generalElaProduct;
  delete migrated.generalElaYear;
  return migrated;
}

onMounted(async () => {
  loadingStates.value = true;
  try {
    states.value = await getStates();
  } catch (error) {
    console.error("Error loading states:", error);
  }
  loadingStates.value = false;

  if (route.params.id) {
    isEdit.value = true;
    initializing.value = true;
    loading.value = true;
    const docRef = doc(db, "schools", route.params.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const raw = docSnap.data();
      const data = migrateOldSchema(raw);

      if (data.state) {
        districts.value = await getDistricts(data.state);
      }
      if (data.districtId) {
        schools.value = await getSchools(data.districtId);
      }

      form.value = {
        ...form.value,
        ...data,
        elaCurricula: data.elaCurricula || [],
      };
      initialFormData.value = deepClone(form.value);
    }
    loading.value = false;
    initializing.value = false;
  } else {
    initialFormData.value = deepClone(form.value);
  }

  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges() && !saveSuccess.value) {
    const answer = window.confirm(
      "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
    );
    if (answer) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});

watch(
  () => form.value.state,
  async (newState) => {
    if (initializing.value) return;
    if (!newState) {
      districts.value = [];
      schools.value = [];
      return;
    }
    form.value.districtId = "";
    form.value.districtName = "";
    form.value.schoolId = "";
    form.value.schoolName = "";
    schools.value = [];
    loadingDistricts.value = true;
    try {
      districts.value = await getDistricts(newState);
    } catch (error) {
      console.error("Error loading districts:", error);
    }
    loadingDistricts.value = false;
  },
);

watch(
  () => form.value.districtId,
  async (newDistrictId) => {
    if (initializing.value) return;
    if (!newDistrictId) {
      schools.value = [];
      return;
    }
    const district = districts.value.find((d) => d.LEAID === newDistrictId);
    form.value.districtName = district?.LEA_NAME || "";
    form.value.schoolId = "";
    form.value.schoolName = "";
    loadingSchools.value = true;
    try {
      schools.value = await getSchools(newDistrictId);
    } catch (error) {
      console.error("Error loading schools:", error);
    }
    loadingSchools.value = false;
  },
);

watch(
  () => form.value.schoolId,
  (newSchoolId) => {
    if (initializing.value) return;
    if (!newSchoolId) return;
    const school = schools.value.find((s) => s.NCESSCH === newSchoolId);
    form.value.schoolName = school?.SCH_NAME || "";
  },
);

watch(
  () => form.value.level,
  (newLevel) => {
    if (initializing.value) return;
    if (newLevel === "district") {
      form.value.schoolId = "";
      form.value.schoolName = "";
    }
  },
);

function addCurriculumEntry() {
  form.value.elaCurricula.push({ gradeRange: "", provider: "", product: "", year: "" });
}

function removeCurriculumEntry(index) {
  form.value.elaCurricula.splice(index, 1);
}

function getAvailableProducts(provider) {
  return getProductsForProvider(provider);
}

function onProviderChange(entry) {
  entry.product = "";
}

async function handleSubmit() {
  loading.value = true;
  try {
    if (!initialSaveComplete.value && !isEdit.value) {
      const dataToSave = {
        state: form.value.state,
        districtId: form.value.districtId,
        districtName: form.value.districtName,
        schoolId: form.value.level === "school" ? form.value.schoolId : null,
        schoolName: form.value.level === "school" ? form.value.schoolName : null,
        level: form.value.level,
        elaCurricula: form.value.elaCurricula,
      };
      const docRef = await addDoc(collection(db, "schools"), dataToSave);
      await logSchoolCreate(user.value, docRef.id, dataToSave);
      savedDocId.value = docRef.id;
      initialSaveComplete.value = true;
      initialFormData.value = deepClone(form.value);
      window.scrollTo(0, 0);
    } else {
      const dataToSave = {
        state: form.value.state,
        districtId: form.value.districtId,
        districtName: form.value.districtName,
        schoolId: form.value.level === "school" ? form.value.schoolId : null,
        schoolName: form.value.level === "school" ? form.value.schoolName : null,
        level: form.value.level,
        elaCurricula: form.value.elaCurricula,
        trainingGeneralEla: form.value.trainingGeneralEla,
        elaImplementationYear: form.value.elaImplementationYear || null,
        trainingScienceOfReading: form.value.trainingScienceOfReading,
        sorTrainingProgram:
          form.value.trainingScienceOfReading === true ? form.value.sorTrainingProgram : null,
        usesProgressMonitoring: form.value.usesProgressMonitoring,
        progressMonitoringTools:
          form.value.usesProgressMonitoring === true ? form.value.progressMonitoringTools : [],
        progressMonitoringFrequency:
          form.value.usesProgressMonitoring === true
            ? form.value.progressMonitoringFrequency
            : null,
        usesDiagnosticAssessments: form.value.usesDiagnosticAssessments,
        diagnosticAssessmentTools:
          form.value.usesDiagnosticAssessments === true ? form.value.diagnosticAssessmentTools : [],
        diagnosticAssessmentFrequency:
          form.value.usesDiagnosticAssessments === true
            ? form.value.diagnosticAssessmentFrequency
            : null,
        additionalProducts: form.value.additionalProducts,
        additionalProductTypes:
          form.value.additionalProducts === true ? form.value.additionalProductTypes : [],
        additionalInformation: form.value.additionalInformation || null,
      };

      if (isEdit.value) {
        const docRef = doc(db, "schools", route.params.id);
        await updateDoc(docRef, dataToSave);
        await logSchoolEdit(user.value, route.params.id, dataToSave);
        isFormSaved.value = true;
        router.push("/");
      } else {
        const docRef = doc(db, "schools", savedDocId.value);
        await updateDoc(docRef, dataToSave);
        isFormSaved.value = true;
        saveSuccess.value = true;
      }
    }
  } catch (error) {
    console.error("Error saving:", error);
    alert("Error saving data");
  }
  loading.value = false;
}

function handleCancel() {
  if (hasUnsavedChanges()) {
    const answer = window.confirm(
      "You have unsaved changes. Are you sure you want to cancel? Your changes will be lost.",
    );
    if (answer) {
      isFormSaved.value = true;
      router.push("/");
    }
  } else {
    router.push("/");
  }
}
</script>

<template>
  <div v-if="!saveSuccess" class="intro-container">
    <p v-if="!initialSaveComplete" class="intro-text">
      Thank you for contributing to this essential work of improving reading instruction for ALL
      kids.
      <br /><br />With this critical information, teachers, leaders, and researchers can better zero
      in on exactly what works best for each child.
    </p>
    <p v-else class="intro-text">
      Tremendous. Teachers and researchers can make even better use of this if they have more info
      on how it's implemented.
    </p>
  </div>

  <div class="form-container">
    <h1 v-if="!saveSuccess">
      {{ isEdit ? "Edit School" : initialSaveComplete ? "Implementation" : "Add School" }}
    </h1>

    <form v-if="!saveSuccess" @submit.prevent="handleSubmit">
      <!-- Step 1: Location, Level, ELA Curriculum -->
      <div v-if="!initialSaveComplete || isEdit">
        <div class="form-group">
          <label for="state">State</label>
          <select id="state" v-model="form.state" required :disabled="loadingStates">
            <option value="">{{ loadingStates ? "Loading states..." : "Select a state" }}</option>
            <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="district">District</label>
          <select
            id="district"
            v-model="form.districtId"
            required
            :disabled="!form.state || loadingDistricts"
          >
            <option value="">
              {{
                loadingDistricts
                  ? "Loading districts..."
                  : form.state
                    ? "Select a district"
                    : "Select a state first"
              }}
            </option>
            <option v-for="district in districts" :key="district.LEAID" :value="district.LEAID">
              {{ district.LEA_NAME }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="question-label"
            >Is this entry for a specific school or the whole district?</label
          >
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="form.level" value="school" name="level" />
              <span>School</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.level" value="district" name="level" />
              <span>District</span>
            </label>
          </div>
        </div>

        <div v-if="form.level === 'school'" class="form-group">
          <label for="school">School</label>
          <select
            id="school"
            v-model="form.schoolId"
            required
            :disabled="!form.districtId || loadingSchools"
          >
            <option value="">
              {{
                loadingSchools
                  ? "Loading schools..."
                  : form.districtId
                    ? "Select a school"
                    : "Select a district first"
              }}
            </option>
            <option v-for="school in schools" :key="school.NCESSCH" :value="school.NCESSCH">
              {{ school.SCH_NAME }}
            </option>
          </select>
        </div>

        <section class="form-section">
          <h2>ELA Curriculum</h2>

          <div v-if="form.elaCurricula.length === 0" class="empty-curricula">
            No programs added yet. Click "+ Add Program" to get started.
          </div>

          <div
            v-for="(entry, index) in form.elaCurricula"
            :key="index"
            class="curriculum-entry subsection"
          >
            <div class="curriculum-entry-header">
              <span class="entry-label">Program {{ index + 1 }}</span>
              <button type="button" class="btn-remove" @click="removeCurriculumEntry(index)">
                Remove
              </button>
            </div>

            <div class="form-group">
              <label>Grade Range</label>
              <select v-model="entry.gradeRange">
                <option value="">Select grade range</option>
                <option v-for="range in gradeRangePresets" :key="range" :value="range">
                  {{ range }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Provider</label>
              <select v-model="entry.provider" @change="onProviderChange(entry)">
                <option value="">Select a provider</option>
                <option v-for="provider in providers" :key="provider" :value="provider">
                  {{ provider }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Product</label>
              <select
                v-model="entry.product"
                :disabled="!entry.provider || getAvailableProducts(entry.provider).length === 0"
              >
                <option value="">
                  {{
                    !entry.provider
                      ? "Select a provider first"
                      : getAvailableProducts(entry.provider).length === 0
                        ? "Enter product below"
                        : "Select a product"
                  }}
                </option>
                <option
                  v-for="product in getAvailableProducts(entry.provider)"
                  :key="product"
                  :value="product"
                >
                  {{ product }}
                </option>
              </select>
              <input
                v-if="
                  entry.provider === 'Other' ||
                  (entry.provider && getAvailableProducts(entry.provider).length === 0)
                "
                v-model="entry.product"
                type="text"
                placeholder="Enter product name"
                class="other-input"
              />
            </div>

            <div class="form-group">
              <label>Publication Year</label>
              <select v-model="entry.year">
                <option value="">Select year</option>
                <option
                  v-for="year in [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]"
                  :key="year"
                  :value="year.toString()"
                >
                  {{ year }}
                </option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button type="button" class="btn-add-program" @click="addCurriculumEntry">
            + Add Program
          </button>
        </section>
      </div>

      <!-- Step 2: Training, Progress Monitoring, Additional Info -->
      <div v-if="initialSaveComplete || isEdit">
        <section class="form-section">
          <h2>Training & Implementation</h2>

          <div class="subsection">
            <div class="form-group">
              <label class="question-label">
                Were most or all building teachers given specific training in implementing the
                general ELA curriculum product?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.trainingGeneralEla"
                    :value="true"
                    name="trainingGeneralEla"
                  />
                  <span>Yes</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.trainingGeneralEla"
                    :value="false"
                    name="trainingGeneralEla"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="elaImplementationYear" class="question-label">
                What year was the current ELA curriculum first implemented?
              </label>
              <select id="elaImplementationYear" v-model="form.elaImplementationYear">
                <option value="">Select year</option>
                <option
                  v-for="year in [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]"
                  :key="year"
                  :value="year.toString()"
                >
                  {{ year }}
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="question-label">
                Did most of the building teachers receive general training in the Science of
                Reading?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.trainingScienceOfReading"
                    :value="true"
                    name="trainingScienceOfReading"
                  />
                  <span>Yes</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.trainingScienceOfReading"
                    :value="false"
                    name="trainingScienceOfReading"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div
              v-if="form.trainingScienceOfReading === true"
              class="form-group conditional-fields"
            >
              <label for="sorTrainingProgram" class="question-label"
                >Which training did most receive?</label
              >
              <select id="sorTrainingProgram" v-model="form.sorTrainingProgram">
                <option value="">Select a program</option>
                <option v-for="program in trainingPrograms" :key="program" :value="program">
                  {{ program }}
                </option>
              </select>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2>Progress Monitoring & Diagnostic Assessments</h2>

          <div class="subsection">
            <h3>Progress Monitoring</h3>

            <div class="form-group">
              <label class="question-label">
                Does your school use progress monitoring tools to track student reading progress?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.usesProgressMonitoring"
                    :value="true"
                    name="usesProgressMonitoring"
                  />
                  <span>Yes</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.usesProgressMonitoring"
                    :value="false"
                    name="usesProgressMonitoring"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div v-if="form.usesProgressMonitoring === true" class="conditional-fields">
              <div class="form-group">
                <label class="question-label"
                  >Which progress monitoring tools are used? (Select all that apply)</label
                >
                <div class="checkbox-group">
                  <label
                    class="checkbox-option"
                    v-for="tool in progressMonitoringToolOptions"
                    :key="tool"
                  >
                    <input type="checkbox" :value="tool" v-model="form.progressMonitoringTools" />
                    <span>{{ tool }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label for="progressMonitoringFrequency" class="question-label">
                  How frequently are progress monitoring assessments administered?
                </label>
                <select id="progressMonitoringFrequency" v-model="form.progressMonitoringFrequency">
                  <option value="">Select frequency</option>
                  <option
                    v-for="frequency in assessmentFrequencyOptions"
                    :key="frequency"
                    :value="frequency"
                  >
                    {{ frequency }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="subsection">
            <h3>Diagnostic Assessments</h3>

            <div class="form-group">
              <label class="question-label">
                Does your school use diagnostic assessments to identify specific reading needs?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.usesDiagnosticAssessments"
                    :value="true"
                    name="usesDiagnosticAssessments"
                  />
                  <span>Yes</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.usesDiagnosticAssessments"
                    :value="false"
                    name="usesDiagnosticAssessments"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div v-if="form.usesDiagnosticAssessments === true" class="conditional-fields">
              <div class="form-group">
                <label class="question-label"
                  >Which diagnostic assessment tools are used? (Select all that apply)</label
                >
                <div class="checkbox-group">
                  <label
                    class="checkbox-option"
                    v-for="tool in diagnosticAssessmentToolOptions"
                    :key="tool"
                  >
                    <input type="checkbox" :value="tool" v-model="form.diagnosticAssessmentTools" />
                    <span>{{ tool }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label for="diagnosticAssessmentFrequency" class="question-label">
                  How frequently are diagnostic assessments administered?
                </label>
                <select
                  id="diagnosticAssessmentFrequency"
                  v-model="form.diagnosticAssessmentFrequency"
                >
                  <option value="">Select frequency</option>
                  <option
                    v-for="frequency in assessmentFrequencyOptions"
                    :key="frequency"
                    :value="frequency"
                  >
                    {{ frequency }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2>Supplemental Materials</h2>
          <div class="subsection">
            <div class="form-group">
              <label class="question-label">
                Does your school use any additional literacy products beyond the core ELA
                curriculum?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.additionalProducts"
                    :value="true"
                    name="additionalProducts"
                  />
                  <span>Yes</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="form.additionalProducts"
                    :value="false"
                    name="additionalProducts"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div v-if="form.additionalProducts === true" class="form-group conditional-fields">
              <label class="question-label"
                >What types of additional products are used? (Select all that apply)</label
              >
              <div class="checkbox-group">
                <label
                  class="checkbox-option"
                  v-for="productType in additionalProductTypeOptions"
                  :key="productType"
                >
                  <input
                    type="checkbox"
                    :value="productType"
                    v-model="form.additionalProductTypes"
                  />
                  <span>{{ productType }}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2>Additional Information</h2>
          <div class="form-group">
            <label for="additionalInformation" class="question-label">
              Is there anything else you'd like to share about your school's reading instruction or
              assessment practices?
            </label>
            <textarea
              id="additionalInformation"
              v-model="form.additionalInformation"
              rows="6"
              placeholder="Enter any additional information..."
              class="textarea-input"
            ></textarea>
          </div>
        </section>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="handleCancel">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "Saving..." : isEdit ? "Update" : "Save" }}
        </button>
      </div>

      <div class="create-issue-section">
        <p class="create-issue-text">Or, create an issue for the team.</p>
        <button type="button" class="btn-secondary" @click="router.push('/issues')">Issues</button>
      </div>
    </form>

    <section v-if="saveSuccess" class="form-section success-section">
      <h2>Thank You!</h2>
      <p class="success-message">
        Your school has been saved. Thank you for contributing to this essential work of improving
        reading instruction for ALL kids.
      </p>
      <div class="form-actions">
        <button type="button" class="btn-primary" @click="router.push('/')">Done</button>
      </div>
      <div class="create-issue-section">
        <p class="create-issue-text">Or, create an issue for the team.</p>
        <button type="button" class="btn-secondary" @click="router.push('/issues')">Issues</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 2rem 0 2rem;
}

.intro-text {
  color: #555;
  line-height: 1.6;
  margin: 0;
  padding: 0.5rem;
  padding-left: 0rem;
  background-color: #f0f7f4;
}

.form-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  background-color: white;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #4a90a4;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3a7a8a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}

.form-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

.form-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.subsection {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.subsection h3 {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 1rem;
  font-weight: 600;
}

.question-label {
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.conditional-fields {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

input[type="text"]:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.other-input {
  margin-top: 0.5rem;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
  min-height: 120px;
}

textarea:focus {
  outline: none;
  border-color: #4a90a4;
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.textarea-input {
  width: 100%;
}

.success-section {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.success-message {
  color: #2e7d32;
  font-size: 1.1rem;
  line-height: 1.6;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.checkbox-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.create-issue-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.create-issue-text {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.empty-curricula {
  color: #888;
  font-size: 0.95rem;
  padding: 0.75rem 0;
}

.curriculum-entry {
  position: relative;
}

.curriculum-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.entry-label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.btn-remove {
  padding: 0.25rem 0.6rem;
  background-color: #fee;
  color: #c44;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-remove:hover {
  background-color: #fdd;
}

.btn-add-program {
  width: 100%;
  padding: 0.75rem;
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px dashed #a5d6a7;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-add-program:hover {
  background-color: #c8e6c9;
}
</style>
