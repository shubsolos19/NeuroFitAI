/**
 * model/exercises.js
 * ──────────────────────────────────────────────────────────────
 * Exercise recommendations keyed by body type.
 * Each exercise has: icon, name, meta description, sets/reps,
 * a tag category, and a display label for the tag.
 *
 * Exports (via window.*):
 *   EXERCISE_DB    — { ecto: [...], meso: [...], endo: [...] }
 *   getExercises(bodyType) → exercise array for given body type
 */

'use strict';

const EXERCISE_POOL = {
  // ── UNDERWEIGHT (Ectomorph focus): Muscle gain, low cardio ─────
  underweight: [
    { icon:"🏋️", name:"Heavy Compound Lifts",  meta:"Squats, Deadlifts, Bench Press",       sets:"4 × 6 reps",    tag:"build",  tagLbl:"Muscle Gain" },
    { icon:"💪",  name:"Barbell Rows",          meta:"Back thickness & postural stability",    sets:"4 × 8 reps",    tag:"build",  tagLbl:"Muscle Gain" },
    { icon:"🦵",  name:"Bulgarian Split Squats",meta:"Intense leg hypertrophy",              sets:"3 × 10 reps",   tag:"build",  tagLbl:"Muscle Gain" },
    { icon:"🤸",  name:"Overhead Press",        meta:"Shoulder & upper body mass",           sets:"4 × 8 reps",    tag:"build",  tagLbl:"Muscle Gain" },
    { icon:"🛶",  name:"Seated Cable Rows",     meta:"Controlled back engagement",            sets:"3 × 12 reps",   tag:"build",  tagLbl:"Focus"       },
    { icon:"💎",  name:"Close-Grip Bench",      meta:"Triceps & chest focus",                sets:"3 × 10 reps",   tag:"build",  tagLbl:"Strength"    },
    { icon:"🏃",  name:"Walking",               meta:"Light activity only",                  sets:"20 min daily",  tag:"cardio", tagLbl:"Cardio"      },
    { icon:"😴",  name:"Extended Recovery",      meta:"9 hours of sleep",                     sets:"Every night",   tag:"flex",   tagLbl:"Recovery"    },
    { icon:"🥛",  name:"Caloric Shake",         meta:"Post-workout mass gainer",             sets:"500+ kcal",     tag:"flex",   tagLbl:"Nutrition"   },
    { icon:"🙌",  name:"Pull-ups/Chin-ups",     meta:"Upper body width",                    sets:"To failure",    tag:"build",  tagLbl:"Bodyweight"  }
  ],
  // ── NORMAL WEIGHT (Mesomorph focus): Definition & Strength ───────────
  normal: [
    { icon:"🏋️", name:"PPL Split Routine",     meta:"Push / Pull / Legs protocol",          sets:"5 × 10 reps",   tag:"build",  tagLbl:"Strength"    },
    { icon:"⚡",  name:"HIIT Cardio",           meta:"Sprints or Boxing rounds",             sets:"4 × 4 min",     tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"🔄",  name:"Antagonistic Supersets",meta:"Efficiency & hypertrophy",              sets:"4 sets",        tag:"build",  tagLbl:"Definition"  },
    { icon:"🤸",  name:"Kettlebell Swings",     meta:"Power & posterior chain",              sets:"4 × 15 reps",   tag:"build",  tagLbl:"Power"       },
    { icon:"🚴",  name:"Mountain Biking",       meta:"Endurance & leg power",                sets:"60 min",        tag:"cardio", tagLbl:"Cardio"      },
    { icon:"🥊",  name:"Jump Rope",             meta:"Agility & coordination",               sets:"10 min",        tag:"cardio", tagLbl:"Agility"     },
    { icon:"🏗️",  name:"Deadlifts",             meta:"Overall body strength",                sets:"3 × 5 reps",    tag:"build",  tagLbl:"Strength"    },
    { icon:"🏊",  name:"Swimming Laps",         meta:"Full-body low-impact cardio",          sets:"30 min",        tag:"cardio", tagLbl:"Endurance"   },
    { icon:"🧗",  name:"Rock Climbing",         meta:"Grip strength & core",                 sets:"Optional",      tag:"build",  tagLbl:"Agility"     },
    { icon:"🧘",  name:"Dynamic Stretching",    meta:"Preparation for intensity",            sets:"10 min",        tag:"flex",   tagLbl:"Flexibility" }
  ],
  // ── OVERWEIGHT & OBESE (Endomorph focus): Calorie burn & health ─
  overweight: [
    { icon:"🚴",  name:"Steady-State Cardio",   meta:"Bike, Power-walking, Swim",            sets:"45 min",        tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"🏋️", name:"Full Body Circuits",    meta:"High reps, low rest",                  sets:"3 rounds",      tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"⚡",  name:"Assault Bike",          meta:"Maximum calorie expenditure",          sets:"10 × 30s",      tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"🚶",  name:"11,000 Steps Daily",    meta:"Constant low-intensity movement",       sets:"Every day",     tag:"cardio", tagLbl:"Cardio"      },
    { icon:"🧘",  name:"Yoga Flow",             meta:"Cortisol management & stress",         sets:"30 min",        tag:"flex",   tagLbl:"Recovery"    },
    { icon:"💪",  name:"Isolation Training",    meta:"Biceps, Triceps, Shoulders",           sets:"3 × 15 reps",   tag:"build",  tagLbl:"Tone"        },
    { icon:"🏸",  name:"Racket Sports",         meta:"Badminton or Tennis",                  sets:"1 hour",        tag:"cardio", tagLbl:"Burn"        },
    { icon:"🚶",  name:"Incline Walking",       meta:"Safe high-calorie burn",               sets:"30 min",        tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"🛶",  name:"Rowing Machine",        meta:"Total body low impact",                sets:"20 min",        tag:"cardio", tagLbl:"Cardio"      },
    { icon:"🧴",  name:"Cold Plunge / Bath",     meta:"Inflammation management",              sets:"3 min",         tag:"flex",   tagLbl:"Recovery"    }
  ],
  obese: [
    { icon:"🚶",  name:"Morning Brisk Walk",    meta:"Low impact cardio",                    sets:"30 min",        tag:"burn",   tagLbl:"Fat Burn"    },
    { icon:"🏊",  name:"Water Aerobics",        meta:"Easy on the joints",                   sets:"45 min",        tag:"burn",   tagLbl:"Healthy"     },
    { icon:"🧘",  name:"Mobility Routine",      meta:"Joint health & range of motion",       sets:"15 min",        tag:"flex",   tagLbl:"Mobility"    },
    { icon:"🚴",  name:"Recumbent Bike",        meta:"Safe cardiovascular work",             sets:"20 min",        tag:"cardio", tagLbl:"Cardio"      },
    { icon:"🏋️", name:"Seated Resistance",     meta:"Building strength safely",              sets:"2 × 15 reps",   tag:"build",  tagLbl:"Growth"      },
    { icon:"🥗",  name:"Anti-Inflammatory",     meta:"Nutrition-centric focus",              sets:"Whole Foods",   tag:"flex",   tagLbl:"Nutrition"   }
  ]
};

/**
 * getExercises(bodyType, age)
 * Returns a randomized, age-appropriate subset of exercises (6 per user).
 * Maps 4-class system directly and adds variety.
 */
function getExercises(bodyType, age = 25) {
  console.log(`👟 [Model] Generating fresh exercise plan for ${bodyType} (Age: ${age})...`);
  
  let pool = EXERCISE_POOL[bodyType] || EXERCISE_POOL.normal;

  // Age-based modifications for users over 50
  if (age > 50) {
    pool = pool.map(ex => {
      let modified = { ...ex };
      if (modified.name.includes("Heavy") || modified.name.includes("Deadlifts")) {
        modified.name = "Moderate " + modified.name.replace("Heavy ", "");
        modified.meta = "Focus on form and joint safety";
        modified.sets = "3 × 12 reps (Lighter weight)";
      }
      return modified;
    });
  }

  // Shuffle and pick 6
  return pool
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);
}

// ── Expose to global scope ────────────────────────────────────
window.getExercises = getExercises;