import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Vibration,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  bg: '#080810',
  card: '#252552',
  surface: '#1c1c42',
  deep: '#0d0d20',
  accent: '#e94560',
  text: '#ffffff',
  muted: '#6668a0',
  input: '#20204a',
  success: '#4ade80',
};

function buildPlan(days) { return days; }

const BARBELL_EXERCISES = new Set([
  'Incline Bench Press', 'Flat Bench Press', 'Romanian Deadlift',
  'Shrugs', 'Back Squat',
]);
function isBarbellExercise(name) {
  const clean = cleanExerciseName(name || '');
  return (clean.includes('Barbell') && !clean.includes('EZ Bar')) || BARBELL_EXERCISES.has(clean);
}

const PLATE_COLORS = { 45: '#c0392b', 35: '#2471a3', 25: '#d4ac0d', 10: '#1e8449', 5: '#717d7e', 2.5: '#aab7b8' };
const PLATE_H = { 45: 76, 35: 65, 25: 54, 10: 42, 5: 33, 2.5: 24 };
const PLATE_W = { 45: 15, 35: 13, 25: 11, 10: 9, 5: 7, 2.5: 6 };
const PLATE_OPTIONS = [45, 25, 10, 5, 2.5];

function weightToPlates(totalWeight) {
  const bar = 45;
  if (totalWeight < bar) return [];
  let rem = Math.round(((totalWeight - bar) / 2) * 10) / 10;
  const result = [];
  for (const p of PLATE_OPTIONS) {
    while (rem >= p - 0.01) { result.push(p); rem = Math.round((rem - p) * 10) / 10; }
  }
  return result;
}
function platesToWeight(plates) { return 45 + 2 * plates.reduce((s, p) => s + p, 0); }


const WORKOUT_PLANS = {
  'Building Muscle - Men': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Incline Bench Press 4×6-8', 'Weighted Pull Ups 4×6-8', 'Bent Over Barbell Row 3×8-10', 'Pec Deck 3×10-12', 'Cable Single Arm Lateral Raise 3×12-15', 'Cable Tricep Pushdown 3×10-12', 'EZ Bar Seated Curl 3×10-12'] },
    { day: 'Day 2 – Lower Body', exercises: ['Lying Leg Curl 3×8', 'Barbell Back Squat 4×5-8', 'Romanian Deadlift 3×8-10', 'Leg Press 3×10-12', 'Standing Calf Raise 4×10-15'] },
    { day: 'Day 3 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 4 – Push', exercises: ['Flat Bench Press 4×5-8', 'Machine Shoulder Press 3×10', 'Pec Deck 3×15', 'Cable Single Arm Lateral Raise 4×12-15', 'Overhead Extension 3×8'] },
    { day: 'Day 5 – Pull', exercises: ['Neutral Grip Lat Pulldown 3×10', 'Dumbbell Chest Supported Row 3×8', 'Cable Seated Row 3×15', 'Reverse Cable Flyes 3×15', 'Shrugs 4×15', 'EZ Bar Seated Curl 3×10', 'Machine Preacher Curl 3×15'] },
    { day: 'Day 6 – Legs', exercises: ['Kneeling Leg Curl 3×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 3×10', 'Hip Adduction 3×10', 'Standing Calf Raise 3×10'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
  'Building Muscle - Women': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Lat Pulldown 4×8-12', 'Seated Cable Row 3×10-12', 'Dumbbell Shoulder Press 3×8-10', 'Cable Lateral Raise 3×12-15', 'Rear Delt Machine Fly 3×12-15'] },
    { day: 'Day 2 – Lower Body', exercises: ['Barbell Hip Thrust 4×6-8', 'Romanian Deadlift 4×8-10', 'Lying Leg Curl 3×10-12', 'Bulgarian Split Squat 3×8-10', 'Cable Kickback 3×12-15'] },
    { day: 'Day 3 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 4 – Push', exercises: ['Glute Bridge 4×10-12', 'Step Ups 3×10', 'Cable Glute Kickbacks 3×12-15', 'Hip Abduction Machine 3×15-20', '45° Back Extensions 3×12-15'] },
    { day: 'Day 5 – Pull', exercises: ['Back Squat 4×6-8', 'Leg Press 3×10-12', 'Walking Lunges 3×10', 'Leg Extension 3×12-15', 'Barbell Hip Thrust 3×8-10'] },
    { day: 'Day 6 – Legs', exercises: ['Kneeling Leg Curl 3×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 3×10', 'Hip Adduction 3×10', 'Standing Calf Raise 3×10'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
};


const QUESTIONS = [
  { key: 'goal', label: "What's your goal?", type: 'choice', options: ['Building Muscle - Men', 'Building Muscle - Women', 'Get Your Nutrition Plan'] },
];


const GOAL_META = {
  'Building Muscle - Men':   { icon: 'M', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: 'Track workouts' },
  'Building Muscle - Women': { icon: 'M', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: 'Track workouts' },
  'Get Your Nutrition Plan':    { icon: 'N', iconColor: '#69f0ae', iconGradient: ['#2ecc71', '#0097a7'], subtitle: 'Calculate calories' },
};

const EXERCISE_NOTES = {
  'Incline Bench':          'Keep shoulder blades pinched and depressed. Drive feet into the floor. Lower the bar to upper chest, elbows at ~60°.',
  'Incline Bench Press':    'Keep shoulder blades pinched and depressed. Drive feet into the floor. Lower the bar to upper chest, elbows at ~60°.',
  'Seated Cable Fly':       'Slight bend in elbows throughout. Lead with your elbows, not your hands. Squeeze the chest at the peak contraction.',
  'Weighted Pull Ups':      'Start from a dead hang. Pull elbows down and back toward your hips. Avoid shrugging — keep shoulders packed down.',
  'Cable Side Lateral Raise': 'Slight forward lean. Lead with your elbow, not your wrist. Pause briefly at shoulder height before controlled lowering.',
  'Deficit Pendlay Row':    'Bar starts on the floor each rep. Flat back, horizontal torso. Explosively row to lower chest, focusing on upper back contraction.',
  'Bench Press':            'Arch naturally, feet flat. Bar path slightly diagonal — touch lower chest, press back toward the rack.',
  'Machine Shoulder Press': 'Adjust seat so handles are at shoulder height. Press straight up without shrugging. Lower with control — don\'t let the weight stack drop.',
  'Pec Deck':               'Keep elbows slightly bent and at shoulder height. Lead with your elbows to maximize chest engagement. Squeeze hard at the peak, return slowly for a full stretch.',
  'Cable Lateral Raise':    'Slight forward lean. Lead with your elbow, not your wrist. Raise to shoulder height and lower with control — don\'t let the cable pull you back.',
  'Overhead Extension':     'Keep elbows close together and pointed forward. Lower until you feel a full tricep stretch, then extend fully. Avoid flaring the elbows on the press.',
  'Cable Kickback':         'Hinge forward at the hips, upper arm parallel to the floor. Extend fully at the elbow and squeeze the tricep. Keep upper arm stationary throughout.',
  'Overhead Press':         'Brace core and glutes. Bar travels in a straight line — move your head back as bar passes, then forward again.',
  'Pull-Ups':               'Full dead hang at the bottom. Drive elbows down toward your pockets. Chin clears the bar at the top.',
  'Bicep Curls':            'Keep elbows pinned at your sides. Supinate at the top. Lower slowly for maximum stretch.',
  'Tricep Pushdowns':       'Elbows locked at your sides. Full extension at the bottom, don\'t let elbows flare on the way up.',
  'Back Squat':             'Brace 360°, chest tall. Break at hips and knees simultaneously. Drive knees out over toes throughout.',
  'Barbell Back Squat':     'Brace 360°, chest tall. Break at hips and knees simultaneously. Drive knees out over toes throughout.',
  'Kneeling Leg Curl':      'Kneel on the pad with ankles secured under the roller. Curl heels toward glutes with full contraction at the top. Lower slowly for a complete hamstring stretch — don\'t let the weight stack bounce.',
  'Romanian Deadlift':      'Hinge at the hips, slight knee bend. Feel the hamstring stretch before driving hips forward to stand.',
  'Standing Calf Raise':    'Stand with the balls of your feet on the edge of the platform. Lower into a full stretch, then drive up onto your toes and squeeze hard at the top. Control the descent — don\'t bounce at the bottom.',
  'Seated Calf Raise':      'Sit tall with the pad resting just above your knees. Lower into a full stretch, then drive up onto your toes and squeeze hard at the top. Control the descent — don\'t bounce at the bottom.',
  'Hip Abduction':          'Sit tall with back against the pad. Push knees outward against the pads in a controlled motion. Squeeze the glutes at peak contraction and return slowly — don\'t let the weight slam back.',
  'Hip Adduction':          'Sit tall with back against the pad. Drive knees together in a controlled motion and squeeze the inner thighs at peak contraction. Return slowly — don\'t let the weight pull your knees apart.',
  'Linear Hack Squat':      'Feet shoulder-width, toes slightly out on the platform. Keep chest tall and brace your core. Lower until thighs are parallel, driving knees out over toes. Press through the full foot to stand.',
  'Leg Extension':          'Sit tall with back against the pad. Extend to full lockout and squeeze the quad at the top. Lower slowly — don\'t let the weight drop.',
  'Leg Extensions':         'Sit tall with back against the pad. Extend to full lockout and squeeze the quad at the top. Lower slowly — don\'t let the weight drop.',
  'Leg Press':              'Feet shoulder-width, toes slightly out. Lower until hips start to tuck. Press through the full foot.',
  'Lying Leg Curl':         'Keep hips pressed into the pad throughout. Curl to full contraction, pause briefly, then lower slowly for a full hamstring stretch.',
  'Leg Curls':              'Avoid lifting your hips off the pad. Curl to full contraction and lower with control for a full stretch.',
  'Calf Raises':            'Full range of motion — stretch at the bottom, pause and squeeze hard at the top.',
  'Incline Dumbbell Press': 'Slight incline (30–45°). Keep wrists stacked over elbows. Feel the stretch at the bottom, press and squeeze at the top.',
  'Lateral Raises':         'Slight forward lean. Lead with elbows. Pinky slightly higher than thumb at the top.',
  'Tricep Dips':            'Lean slightly forward for chest emphasis, stay upright for triceps. Lower until elbows hit 90°.',
  'Cable Flys':             'Slight bend in elbows. Focus on the stretch at the start and a full squeeze at the finish.',
  'Deadlift':               'Push the floor away to initiate. Keep bar close to body. Lock out hips and knees simultaneously at the top.',
  'Cable Rows':             'Sit tall, pull to lower sternum. Squeeze shoulder blades together at the end. Don\'t let shoulders roll forward on the return.',
  'Face Pulls':             'Pull to forehead level, elbows flared high. External rotate at the end — thumbs pointing behind you.',
  'Barbell Curls':          'Keep elbows pinned. Supinate at the top for peak contraction. 3-second negative for max tension.',
  'Hammer Curls':           'Neutral grip throughout. Trains brachialis and brachioradialis. Keep elbows tucked, avoid swinging.',
  'Front Squat':            'Elbows high, upright torso. Knees track over toes. Keep core braced to maintain the front rack position.',
  'Nordic Curls':           'Brace and lower as slowly as possible. Use your hands to catch yourself. Pull yourself back with hamstrings on the way up.',
  'Neutral Grip Lat Pulldown':      'Use a neutral (palms-facing) grip. Pull elbows down toward your hips and squeeze the lats at the bottom. Control the return — don\'t let the stack yank you up.',
  'Dumbbell Chest Supported Row':   'Chest flat against the pad to eliminate momentum. Retract shoulder blades first, then row to lower chest. Squeeze at the top and lower with full control.',
  'Cable Seated Row':               'Sit tall, slight knee bend. Pull the handle to your lower sternum, driving elbows back. Squeeze shoulder blades together at the end — don\'t let shoulders roll forward on the return.',
  'Reverse Cable Flyes':    'Slight bend in elbows, hinge forward at the hips. Lead with your elbows and pull outward to shoulder height. Squeeze the rear delts at the top before lowering slowly.',
  'Shrugs':                 'Hold the weight at your sides, stand tall. Shrug straight up toward your ears — no rolling. Hold the contraction briefly at the top, then lower with control.',
  'EZ-Bar Curl':            'Grip the angled part of the bar, elbows pinned at your sides. Curl to full contraction and supinate slightly at the top. Lower slowly for maximum tension.',
  'Machine Preacher Curl':  'Upper arms flat on the pad throughout. Curl to full contraction and squeeze the bicep at the top. Lower slowly until arms are fully extended for a complete stretch.',
  'Barbell Hip Thrust':     'Upper back on bench, bar padded across hips. Drive through your heels and squeeze your glutes hard at the top — hips fully extended. Lower with control and repeat without losing tension.',
  'Bulgarian Split Squat':  'Rear foot elevated on bench, front foot far enough forward to keep shin vertical. Lower until rear knee nearly touches the floor. Drive through the front heel to stand — keep torso upright.',
  'Walking Lunges':         'Step forward into a lunge, lowering the back knee toward the floor. Push off the front foot to step forward into the next rep. Keep torso tall and core braced throughout.',
  'Rear Delt Machine Fly':  'Adjust the handles so arms are at shoulder height. Keep a slight bend in the elbows and pull the handles back in a wide arc. Squeeze the rear delts at the peak — don\'t let the weight snap back.',
  'Lat Pulldown':           'Grip slightly wider than shoulder-width. Lean back slightly and pull the bar to your upper chest, driving elbows down toward your hips. Control the return — don\'t let the bar yank you up.',
  'Seated Cable Row':       'Sit tall with a slight knee bend. Pull the handle to your lower sternum, driving elbows back. Squeeze shoulder blades together at the end and return slowly — don\'t round the lower back.',
  'Dumbbell Shoulder Press':'Sit tall, core braced. Press dumbbells from shoulder height straight up until arms are fully extended. Lower with control to just below ear level — don\'t let the weights drift forward.',
  'Cable Single Arm Lateral Raise': 'Stand beside the cable machine with the pulley set low. Lead with your elbow and raise the arm out to shoulder height — keep a slight bend in the elbow throughout. Pause briefly at the top, then lower slowly with control. Avoid shrugging or using momentum.',
  'Pec Deck':                  'Adjust the seat so handles are at chest height. Keep a slight bend in the elbows and lead with your elbows — not your hands. Squeeze the chest hard at the peak contraction, then return slowly for a full stretch. Don\'t let the weight snap back.',
  'Bent Over Barbell Row':     'Hinge at the hips until torso is roughly parallel to the floor, slight knee bend. Brace your core and keep your back flat throughout. Pull the bar to your lower chest, driving elbows back and squeezing the shoulder blades together at the top. Lower with control — don\'t let your back round on the descent.',
  'Cable Tricep Pushdown':    'Set the cable to a high pulley with a rope or bar attachment. Keep elbows tucked at your sides throughout — they should not move. Push down to full extension and squeeze the triceps hard at the bottom. Return slowly, allowing a full stretch at the top before the next rep.',
  'Flat Bench Press':         'Arch naturally, feet flat on the floor. Grip slightly wider than shoulder-width. Lower the bar to your lower chest with elbows at ~75°. Press in a slight arc back toward the rack. Keep shoulder blades pinched and depressed throughout.',
  'EZ Bar Seated Curl':       'Sit tall with back supported. Grip the angled part of the bar, elbows pinned at your sides. Curl to full contraction and squeeze the bicep at the top. Lower slowly for maximum tension — don\'t let the bar drop.',
  'Glute Bridge':             'Lie on your back with knees bent and feet flat, hip-width apart. Drive through your heels and squeeze your glutes hard at the top — hips fully extended. Hold briefly at the top, then lower with control. Keep core braced throughout.',
  'Step Ups':                 'Stand in front of a bench or box. Step up with one foot, driving through the heel to fully extend the leg. Bring the other foot up to meet it. Step back down with control. Keep torso upright and avoid pushing off the back foot.',
  'Cable Glute Kickbacks':    'Attach an ankle strap to a low cable. Hinge slightly at the hips and brace your core. Kick the leg back and up, squeezing the glute hard at the top. Lower with control — don\'t let momentum take over. Keep the movement isolated to the hip.',
  'Hip Abduction Machine':    'Sit tall with back against the pad and legs against the outer pads. Push knees outward in a controlled motion, squeezing the glutes and outer hips at peak contraction. Return slowly — don\'t let the weight slam back.',
  '45° Back Extensions':      'Position yourself on the 45° back extension bench with hips at the edge of the pad. Hinge forward at the hips with a neutral spine, lowering until you feel a hamstring stretch. Drive hips forward and squeeze glutes to return to the starting position. Avoid hyperextending at the top.',
};

const EXERCISE_WEIGHT_RANGES = {
  'Incline Bench Press':              { min: 20,  max: 315 },
  'Flat Bench Press':                 { min: 45,  max: 405 },
  'Weighted Pull Ups':                { min: 0,   max: 135 },
  'Bent Over Barbell Row':            { min: 45,  max: 315 },
  'Pec Deck':                         { min: 20,  max: 180 },
  'Cable Single Arm Lateral Raise':   { min: 5,   max: 40  },
  'Seated Lateral Raise':             { min: 5,   max: 50  },
  'Cable Tricep Pushdown':            { min: 10,  max: 120 },
  'Overhead Extension':               { min: 10,  max: 100 },
  'EZ Bar Seated Curl':               { min: 20,  max: 120 },
  'Machine Preacher Curl':            { min: 20,  max: 130 },
  'Barbell Back Squat':               { min: 45,  max: 495 },
  'Romanian Deadlift':                { min: 45,  max: 405 },
  'Leg Press':                        { min: 45,  max: 700 },
  'Linear Hack Squat':                { min: 45,  max: 600 },
  'Lying Leg Curl':                   { min: 20,  max: 180 },
  'Kneeling Leg Curl':                { min: 20,  max: 140 },
  'Leg Extension':                    { min: 20,  max: 200 },
  'Hip Adduction':                    { min: 20,  max: 200 },
  'Standing Calf Raise':              { min: 20,  max: 400 },
  'Machine Shoulder Press':           { min: 20,  max: 200 },
  'Neutral Grip Lat Pulldown':        { min: 30,  max: 220 },
  'Dumbbell Chest Supported Row':     { min: 15,  max: 150 },
  'Cable Seated Row':                 { min: 20,  max: 200 },
  'Reverse Cable Flyes':              { min: 5,   max: 50  },
  'Shrugs':                           { min: 45,  max: 495 },
};

const EXERCISE_MUSCLES = {
  'Incline Bench Press':             'Chest',
  'Flat Bench Press':                'Chest',
  'Pec Deck':                        'Chest',
  'Weighted Pull Ups':               'Back',
  'Bent Over Barbell Row':           'Back',
  'Neutral Grip Lat Pulldown':       'Back',
  'Dumbbell Row with Chest Support': 'Back',
  'Cable Seated Row':                'Back',
  'Reverse Cable Flyes':             'Back',
  'Cable Single Arm Lateral Raise':  'Shoulders',
  'Seated Lateral Raise':            'Shoulders',
  'Machine Shoulder Press':          'Shoulders',
  'Cable Tricep Pushdown':           'Triceps',
  'Overhead Extension':              'Triceps',
  'EZ Bar Seated Curl':              'Biceps',
  'Machine Preacher Curl':           'Biceps',
  'Shrugs':                          'Traps',
  'Barbell Back Squat':              'Quads',
  'Leg Press':                       'Quads',
  'Linear Hack Squat':               'Quads',
  'Leg Extension':                   'Quads',
  'Romanian Deadlift':               'Hamstrings',
  'Lying Leg Curl':                  'Hamstrings',
  'Kneeling Leg Curl':               'Hamstrings',
  'Hip Adduction':                   'Adductors',
  'Standing Calf Raise':             'Calves',
};

// Local images — all commented out to use ExerciseDB API instead.
// Uncomment any entry to override the API with your own photo.
const EXERCISE_IMAGES = {
  'Incline Bench Press':     require('./assets/exercises/barbell-incline-bench-press.png'),
  'Weighted Pull Ups':       require('./assets/exercises/weighted-pull-up.png'),
  'Bent Over Barbell Row':   require('./assets/exercises/barbell-bent-over-row.png'),
  'Pec Deck':                require('./assets/exercises/lever-pec-deck-fly.png'),
  'Cable Single Arm Lateral Raise': require('./assets/exercises/cable-single-arm-lateral-raise.png'),
  'Cable Tricep Pushdown':   require('./assets/exercises/cable-triceps-pushdown.png'),
  'EZ Bar Seated Curl':      require('./assets/exercises/ez-barbell-seated-curls.png'),
  'Standing Calf Raise':     require('./assets/exercises/standing-calf-raise.png'),
  'Leg Press':               require('./assets/exercises/lever-angled-leg-press.png'),
  'Romanian Deadlift':       require('./assets/exercises/barbell-romanian-deadlift.png'),
  'Lying Leg Curl':          require('./assets/exercises/lever-lying-leg-curl.png'),
  'Barbell Back Squat':      require('./assets/exercises/barbell-full-squat.png'),
  'Flat Bench Press':        require('./assets/exercises/barbell-pin-bench-press.png'),
  'Machine Shoulder Press':  require('./assets/exercises/lever-seated-shoulder-press.png'),
  'Overhead Extension':      require('./assets/exercises/cable-standing-crossover-overhead-tricep-extension.png'),
  // 'Seated Cable Fly':        require('./assets/exercises/seated-cable-fly.jpg'),
  // 'Weighted Pull Ups':       require('./assets/exercises/weighted-pull-ups.jpg'),
  // 'Cable Lateral Raise':     require('./assets/exercises/cable-lateral-raise.jpg'),
  // 'Deficit Pendlay Row':     require('./assets/exercises/deficit-pendlay-row.jpg'),
  // 'Barbell Hip Thrust':      require('./assets/exercises/barbell-hip-thrusts.jpg'),
  // 'Bulgarian Split Squat':   require('./assets/exercises/bulgarian-split-squat.jpg'),
  // 'Bench Press':             require('./assets/exercises/bench-press.jpg'),
  // 'Machine Shoulder Press':  require('./assets/exercises/shoulder-press.jpg'),
  // 'Pec Deck':                require('./assets/exercises/pec-deck.jpg'),
  // 'Overhead Extension':      require('./assets/exercises/Overhead Extension.jpg'),
  // 'Cable Kickback':          require('./assets/exercises/cable-kickbacks.jpg'),
  'Neutral Grip Lat Pulldown':    require('./assets/exercises/cable-neutral-grip-lat-pulldown.png'),
  'Dumbbell Chest Supported Row': require('./assets/exercises/dumbbell-row-with-chest-supported.png'),
  'Cable Seated Row':             require('./assets/exercises/cable-seated-lats-focused-row.png'),
  'Reverse Cable Flyes':        require('./assets/exercises/cable-45-degrees-reverse-fly.png'),
  // 'EZ-Bar Curl':             require('./assets/exercises/ez-bar-curl.jpg'),
  'Machine Preacher Curl':      require('./assets/exercises/lever-preacher-curl.png'),
  'Shrugs':                     require('./assets/exercises/barbell-power-shrug.png'),
  'Kneeling Leg Curl':          require('./assets/exercises/kneeling-leg-curl.png'),
  'Hip Adduction':              require('./assets/exercises/seated-hip-adduction.png'),
  'Linear Hack Squat':          require('./assets/exercises/linear-hack-squat.png'),
  // 'Back Squat':              require('./assets/exercises/back-squat.jpg'),
  // 'Romanian Deadlift':       require('./assets/exercises/romanian-deadlift.jpg'),
  // 'Leg Press':               require('./assets/exercises/leg-press.jpg'),
  'Leg Extension':              require('./assets/exercises/leg-extension.png'),
  'Leg Extensions':             require('./assets/exercises/leg-extension.png'),
  // 'Hip Abduction':           require('./assets/exercises/hip-abduction.jpg'),
  // 'Standing Calf Raise':     require('./assets/exercises/standing-calf-raise.jpg'),
  // 'Lying Leg Curl':          require('./assets/exercises/lying-leg-curl.jpg'),
  // 'Walking Lunges':          require('./assets/exercises/walking-lunges.jpg'),
  // 'Rear Delt Machine Fly':   require('./assets/exercises/rear-delt-machine-fly.jpg'),
  // 'Lat Pulldown':            require('./assets/exercises/lat-pulldown.jpg'),
  // 'Seated Cable Row':        require('./assets/exercises/seated-cable-row.jpg'),
  // 'Dumbbell Shoulder Press': require('./assets/exercises/dumbell-shoulder-press.jpg'),
};

// Maps app exercise names to their exact DB name + optional image index (default 0)
const EXERCISE_DB_ALIASES = {
  'Pec Deck':                    { name: 'butterfly', index: 1 },
  'Barbell Back Squat':          { name: 'barbell full squat', index: 0 },
  'Lying Leg Curl':              { name: 'lying leg curls', index: 0 },
  'Seated Calf Raise':           { name: 'seated calf raise', index: 0 },
  'Bent Over Barbell Row':       { name: 'bent over barbell row', index: 0 },
  'Cable Tricep Pushdown':       { name: 'reverse grip triceps pushdown', index: 0 },
};

const COMPOUND_KEYWORDS = ['bench', 'squat', 'deadlift', 'row', 'pull', 'press', 'lunge', 'hip thrust', 'dip', 'chin'];
function getRestSuggestion(exerciseName) {
  const n = cleanExerciseName(exerciseName).toLowerCase();
  return COMPOUND_KEYWORDS.some(k => n.includes(k)) ? 180 : 60;
}

function parseDurationToSecs(duration) {
  const eachSide = duration.includes('each side');
  const mins = duration.match(/(\d+)\s*min/);
  const secs = duration.match(/(\d+)\s*sec/);
  let total = 0;
  if (mins) total += parseInt(mins[1]) * 60;
  if (secs) total += parseInt(secs[1]);
  return eachSide ? total * 2 : total;
}

function parseSetsReps(name) {
  const match = name.match(/(\d+)[×xX](\d+(?:-\d+)?)/);
  if (!match) return null;
  return { sets: match[1], reps: match[2] };
}

function cleanExerciseName(name) {
  return name
    .replace(/\s*\d+[×xX]\d+(-\d+)?\s*/g, '')
    .replace(/\s*\d+min\s*/g, '')
    .replace(/\s*\d+s\b/g, '')
    .replace(/^DB\s/i, 'Dumbbell ')
    .replace(/^BB\s/i, 'Barbell ')
    .replace(/\bOHP\b/g, 'Overhead Press')
    .trim();
}

function getExerciseEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg') || n.includes('calf') || n.includes('nordic')) return '🦵';
  if (n.includes('bench') || n.includes('chest') || n.includes('push') || n.includes('dip') || n.includes('fly')) return '💪';
  if (n.includes('deadlift') || n.includes('row') || n.includes('pull') || n.includes('lat')) return '🏋️';
  if (n.includes('shoulder') || n.includes('press') || n.includes('lateral') || n.includes('raise') || n.includes('shrug')) return '🏋️';
  if (n.includes('curl') || n.includes('bicep') || n.includes('tricep') || n.includes('skull') || n.includes('kickback')) return '💪';
  if (n.includes('plank') || n.includes('crunch') || n.includes('ab') || n.includes('core') || n.includes('wheel') || n.includes('dragon')) return '🎯';
  if (n.includes('run') || n.includes('jog') || n.includes('sprint') || n.includes('cardio') || n.includes('jump') || n.includes('rope') || n.includes('burpee') || n.includes('bike') || n.includes('cycling')) return '🏃';
  if (n.includes('stretch') || n.includes('yoga') || n.includes('foam') || n.includes('pigeon') || n.includes('mobility')) return '🧘';
  return '🏋️';
}

const EXERCISE_DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

function ExerciseImage({ exerciseName, exerciseDbImages = {}, size = 120 }) {
  const [enlarged, setEnlarged] = useState(false);
  const [remoteAspectRatio, setRemoteAspectRatio] = useState(4 / 3);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const clean = cleanExerciseName(exerciseName);
  const localSource = EXERCISE_IMAGES[clean] ?? null;

  const dbKey = clean.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  function pickUrl(urls, index = 0) {
    if (!urls) return null;
    if (Array.isArray(urls)) return urls[index] ?? urls[0] ?? null;
    return urls;
  }

  let remoteUri = null;
  if (!localSource && Object.keys(exerciseDbImages).length > 0) {
    // 0. Explicit alias override (e.g. "Pec Deck (Butterfly)" → { name: 'butterfly', index: 1 })
    const alias = EXERCISE_DB_ALIASES[clean];
    if (alias) remoteUri = pickUrl(exerciseDbImages[alias.name], alias.index);
    // 1. Exact or pre-built substring match (e.g. "bench press" in DB)
    if (!remoteUri) remoteUri = pickUrl(exerciseDbImages[dbKey]);
    // 2. Reverse contains: find a DB key that our name contains (e.g. "cable fly" inside "seated cable fly")
    if (!remoteUri) {
      const match = Object.keys(exerciseDbImages).find(k => k.split(' ').length >= 2 && dbKey.includes(k));
      if (match) remoteUri = pickUrl(exerciseDbImages[match]);
    }
  }

  const source = localSource || (remoteUri ? { uri: remoteUri } : null);

  useEffect(() => {
    if (remoteUri) {
      Image.getSize(remoteUri, (w, h) => { if (w && h) setRemoteAspectRatio(w / h); }, () => {});
    }
  }, [remoteUri]);

  const thumbHeight = Math.round(size * (76 / 120));

  if (!source) {
    return (
      <View style={[styles.exImgBox, { width: size, height: thumbHeight }]}>
        <Text style={styles.exImgEmoji}>{getExerciseEmoji(exerciseName)}</Text>
      </View>
    );
  }

  let aspectRatio = remoteUri ? remoteAspectRatio : 4 / 3;
  if (localSource) {
    const info = Image.resolveAssetSource(localSource);
    aspectRatio = info && info.width && info.height ? info.width / info.height : 4 / 3;
  }
  const cardWidth = screenWidth - 40;
  const maxImgHeight = screenHeight * 0.65;
  const imgHeight = Math.min(cardWidth / aspectRatio, maxImgHeight);

  return (
    <>
      <TouchableOpacity onPress={() => setEnlarged(true)}>
        {clean === 'Machine Shoulder Press' || clean === 'Standing Calf Raise' || clean === 'Cable Tricep Pushdown' ? (
          <Image source={source} style={[styles.exImg, { width: size, height: thumbHeight }]} resizeMode="contain" />
        ) : (
          <Image source={source} style={[styles.exImg, { width: size, height: thumbHeight }]} resizeMode="cover" />
        )}
      </TouchableOpacity>
      <Modal visible={enlarged} transparent animationType="fade">
        <TouchableOpacity style={styles.imgModalOverlay} onPress={() => setEnlarged(false)} activeOpacity={1}>
          <View style={styles.imgModalCard}>
            <Image source={source} style={[styles.imgModalFull, { height: imgHeight }]} resizeMode="contain" />
            <View style={styles.imgModalTextBox}>
              <Text style={styles.imgModalTitle}>{clean}</Text>
              {EXERCISE_NOTES[clean] && (
                <Text style={styles.imgModalNotes}>{EXERCISE_NOTES[clean]}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}



function calculateTDEE(age, gender, heightFt, heightIn, weightLbs, activityLevel) {
  const totalInches = parseFloat(heightFt) * 12 + parseFloat(heightIn);
  const heightCm = totalInches * 2.54;
  const weightKg = parseFloat(weightLbs) * 0.453592;
  const a = parseFloat(age);
  const bmr = gender === 'Male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * a + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * a - 161;
  const multipliers = {
    'Sedentary': 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725,
    'Extra Active': 1.9,
  };
  return Math.round(bmr * multipliers[activityLevel]);
}


function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function CircularProgress({ progress, size = 210, strokeWidth = 14 }) {
  const half = size / 2;
  const color = '#4ade80';
  const p = Math.max(0, Math.min(1, progress));
  // borderTopColor+borderRightColor arc spans 315°→135°, not 270°→90°, so offset is -135 not -180
  const rightRotate = `${Math.min(p, 0.5) * 360 - 135}deg`;
  const leftRotate = `${Math.max(p - 0.5, 0) * 360 - 135}deg`;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: strokeWidth, borderColor: '#2a2a2a' }} />
      <View style={{ position: 'absolute', right: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -half, width: size, height: size, borderRadius: half, borderWidth: strokeWidth, borderColor: 'transparent', borderTopColor: color, borderRightColor: color, transform: [{ rotate: rightRotate }] }} />
      </View>
      {p > 0.5 && (
        <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -half, width: size, height: size, borderRadius: half, borderWidth: strokeWidth, borderColor: 'transparent', borderBottomColor: color, borderLeftColor: color, transform: [{ rotate: leftRotate }] }} />
        </View>
      )}
    </View>
  );
}

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Something went wrong</Text>
          <Text style={{ color: COLORS.muted, textAlign: 'center', marginBottom: 28 }}>
            An unexpected error occurred. Your data is safe — please try again.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Shared helpers ────────────────────────────────────────────
function logKeyGlobal(dayTitle, exercise) {
  return `${dayTitle}|${exercise}`;
}

// Wraps any pressable with a spring scale-down on press
function AnimatedPress({ onPress, style, scaleDown = 0.96, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: scaleDown, useNativeDriver: true, speed: 100, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 70, bounciness: 8 }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// Progress bar that animates its fill from 0 → target on mount/change
function AnimatedProgressBar({ progress, color = '#4a90e2', trackColor = '#2a2a4a', height = 8, glowColor, style }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <Animated.View style={{
        height,
        backgroundColor: color,
        borderRadius: height / 2,
        width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        shadowColor: glowColor || color,
        shadowOpacity: 0.5,
        shadowRadius: 4,
      }} />
    </View>
  );
}

// Plan-screen day card with spring scale on press
function DayCard({ item, currentWeek, logs, completedWorkouts, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 120, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }).start();

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = DAY_NAMES[new Date().getDay()];
  const isToday = item.day.startsWith(todayName);

  const isRestDay = item.day.includes('Rest');
  const workoutExs = isRestDay ? [] : item.exercises.filter(e =>
    !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
  );
  const wKey = `${item.day}|${currentWeek}`;
  const hasAnyLog = !isRestDay && workoutExs.some(e =>
    (logs[logKeyGlobal(item.day, e)] || []).some(en => en.programWeek === currentWeek)
  );
  const isCompleted = !!completedWorkouts[wKey] && hasAnyLog;
  const isStarted = !isRestDay && !isCompleted && workoutExs.some(e =>
    (logs[logKeyGlobal(item.day, e)] || []).some(en => en.programWeek === currentWeek)
  );
  const accentColor = isCompleted ? '#4ade80' : isStarted ? '#f59e0b' : '#e94560';

  // Split "Monday – Upper Body" → dayName="Monday", workoutLabel="Upper Body"
  const parts = item.day.split('–').map(s => s.trim());
  const dayName = parts[0];
  const workoutLabel = parts[1] || '';

  // Status badge (right side)
  let badge;
  if (isCompleted) {
    badge = (
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#000', fontSize: 13, fontWeight: '900', lineHeight: 16 }}>✓</Text>
      </View>
    );
  } else if (isStarted) {
    badge = (
      <View style={{ backgroundColor: '#f59e0b18', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#f59e0b44' }}>
        <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>IN PROGRESS</Text>
      </View>
    );
  } else if (isToday && !isRestDay) {
    badge = (
      <View style={{ backgroundColor: '#e9456018', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#e9456055' }}>
        <Text style={{ color: '#e94560', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>🔥 TODAY</Text>
      </View>
    );
  } else if (isRestDay && isToday) {
    badge = <Text style={{ fontSize: 17, opacity: 0.7 }}>💤</Text>;
  } else if (isRestDay) {
    badge = <Text style={{ fontSize: 17, opacity: 0.35 }}>💤</Text>;
  } else {
    badge = <Text style={{ color: COLORS.muted, fontSize: 22, fontWeight: '300', opacity: 0.5 }}>›</Text>;
  }

  const cardBg = isRestDay ? '#0c0c1e' : isToday && !isCompleted ? '#1c1428' : '#1c1c42';
  const cardBorder = isRestDay ? '#ffffff05' : isToday && !isCompleted ? '#e9456030' : '#ffffff08';
  const cardBorderTop = isRestDay ? '#ffffff08' : isToday && !isCompleted ? '#e9456055' : '#ffffff35';
  const shadowCol = isToday && !isCompleted && !isRestDay ? '#e94560' : '#000';
  const shadowOp = isToday && !isCompleted && !isRestDay ? 0.18 : 0.25;

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 14 }}>
      <TouchableOpacity
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: cardBorder,
          borderTopColor: cardBorderTop,
          borderRadius: 16,
          flexDirection: 'row',
          overflow: 'hidden',
          shadowColor: shadowCol,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: shadowOp,
          shadowRadius: 10,
          elevation: 4,
        }}
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        {/* Left accent bar */}
        {!isRestDay && (
          <View style={{ width: 3, backgroundColor: accentColor, borderRadius: 2, marginVertical: 14, marginLeft: 12, opacity: isToday && !isCompleted ? 1 : 0.7 }} />
        )}

        <View style={{ flex: 1, paddingHorizontal: 18, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left: day name + workout type */}
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                <Text style={{ color: isRestDay ? '#4a4a6a' : COLORS.text, fontWeight: '700', fontSize: 16 }}>{dayName}</Text>
                {workoutLabel ? (
                  <Text style={{ color: isRestDay ? '#2a2a4a' : COLORS.muted, fontSize: 13 }}>– {workoutLabel}</Text>
                ) : null}
              </View>
              <Text style={{ color: isRestDay ? '#2a2a3a' : '#4a4a72', fontSize: 12, marginTop: 4 }}>
                {isRestDay ? 'Rest & Recovery' : `${workoutExs.length} exercises`}
              </Text>
            </View>
            {badge}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Workout Complete celebration modal ────────────────────────
const CONFETTI_COLORS = ['#4ade80', '#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
const CONFETTI_COUNT = 30;

function DayCompleteModal({ visible, selectedDay, logs, currentWeek, onSaveExit }) {
  const [displayVol, setDisplayVol] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const particles = useRef(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      x: Math.random() * 360 - 20,
      y: new Animated.Value(-80),
      rot: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      isRect: Math.random() > 0.5,
      w: 5 + Math.random() * 6,
      h: 10 + Math.random() * 9,
    }))
  ).current;
  const barAnims = useRef(Array.from({ length: 4 }, () => new Animated.Value(0))).current;

  const dayExs = (selectedDay?.exercises || []).filter(e =>
    !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
  );
  const dayParts = (selectedDay?.day || '').split('–').map(s => s.trim());
  const dayOfWeek = dayParts[0] || '';
  const dayLabel = dayParts[1] || dayParts[0] || '';
  const estMins = dayExs.length * 8;
  const muscleVols = {};
  let totalVol = 0;
  dayExs.forEach(e => {
    const entryList = logs[logKeyGlobal(selectedDay?.day, e)] || [];
    const weekEntry = entryList.find(en => en.programWeek === currentWeek);
    if (weekEntry?.sets) {
      const vol = weekEntry.sets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
      totalVol += vol;
      const muscle = EXERCISE_MUSCLES[cleanExerciseName(e)] || 'Other';
      muscleVols[muscle] = (muscleVols[muscle] || 0) + vol;
    }
  });
  const maxVol = Math.max(...Object.values(muscleVols), 1);
  const sortedMuscles = Object.entries(muscleVols).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const headline = dayLabel ? `${dayLabel} Crushed 💪` : 'You Showed Up 🔥';

  useEffect(() => {
    if (!visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
      setDisplayVol(0);
      particles.forEach(p => { p.y.setValue(-80); p.opacity.setValue(0); p.rot.setValue(0); });
      barAnims.forEach(b => b.setValue(0));
      return;
    }
    // Card appear
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
    ]).start();
    // Volume count-up with ease-out
    const steps = 50;
    const duration = 1400;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const t = step / steps;
      setDisplayVol(Math.round(totalVol * (1 - Math.pow(1 - t, 3))));
      if (step >= steps) clearInterval(iv);
    }, duration / steps);
    // Animated muscle bars staggered
    Animated.stagger(100, sortedMuscles.map(([, vol], i) =>
      Animated.timing(barAnims[i], { toValue: vol / maxVol, duration: 800, useNativeDriver: false })
    )).start();
    // Confetti burst
    particles.forEach(p => {
      const delay = Math.random() * 400;
      p.y.setValue(-80);
      p.opacity.setValue(1);
      p.rot.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.y, { toValue: 700 + Math.random() * 250, duration: 1800 + Math.random() * 1000, useNativeDriver: true }),
          Animated.timing(p.rot, { toValue: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 8), duration: 2200, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(1400),
            Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });
    return () => clearInterval(iv);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={{ flex: 1, backgroundColor: '#000000ee', justifyContent: 'center', alignItems: 'center', padding: 24, opacity: fadeAnim }}>
        {/* Confetti */}
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: p.x,
              width: p.w,
              height: p.h,
              borderRadius: p.isRect ? 2 : p.w / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateY: p.y },
                { rotate: p.rot.interpolate({ inputRange: [-10, 10], outputRange: ['-360deg', '360deg'] }) },
              ],
            }}
          />
        ))}
        {/* Card */}
        <Animated.View style={{
          backgroundColor: '#12122a',
          borderRadius: 24,
          padding: 28,
          width: '100%',
          borderWidth: 1,
          borderColor: '#4ade8040',
          borderTopColor: '#4ade8080',
          transform: [{ scale: scaleAnim }],
          shadowColor: '#4ade80',
          shadowOpacity: 0.2,
          shadowRadius: 24,
          elevation: 12,
        }}>
          <Text style={{ color: '#4ade80', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }}>{headline}</Text>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
            {dayLabel}{dayOfWeek ? <Text style={{ color: COLORS.muted, fontWeight: '400' }}> — {dayOfWeek}</Text> : null}
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
            ~{estMins} min  •  {dayExs.length} exercises  •  Week {currentWeek}
          </Text>
          <View style={{ height: 1, backgroundColor: '#ffffff12', marginVertical: 20 }} />
          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>VOLUME LIFTED</Text>
          <Text style={{ color: COLORS.text, fontSize: 34, fontWeight: '900', marginBottom: 20, letterSpacing: -1 }}>
            {displayVol.toLocaleString()} <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '400' }}>lbs</Text>
          </Text>
          {sortedMuscles.length > 0 && (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>MUSCLES WORKED</Text>
              {sortedMuscles.map(([muscle, vol], i) => (
                <View key={muscle} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>{muscle}</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>{vol.toLocaleString()} lbs</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#1e1e3a', borderRadius: 3, overflow: 'hidden' }}>
                    <Animated.View style={{
                      height: 6,
                      backgroundColor: '#4ade80',
                      borderRadius: 3,
                      width: barAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      shadowColor: '#4ade80',
                      shadowOpacity: 0.6,
                      shadowRadius: 4,
                    }} />
                  </View>
                </View>
              ))}
            </>
          )}
          <TouchableOpacity
            onPress={onSaveExit}
            style={{ marginTop: 24, backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 16 }}>Save & Exit</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const BF_CATEGORIES = [
  { min: 0,  label: 'Essential Fat',  color: '#60a5fa' },
  { min: 6,  label: 'Athletic',       color: '#4ade80' },
  { min: 14, label: 'Fit',            color: '#34d399' },
  { min: 21, label: 'Average',        color: '#f59e0b' },
  { min: 26, label: 'Above Average',  color: '#f97316' },
  { min: 32, label: 'High',           color: '#ef4444' },
];


function ProcessingScreen({ steps, onComplete, processingStep, setProcessingStep }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const doneScale = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const timers = steps.map((s, i) =>
      setTimeout(() => {
        setProcessingStep(i + 1);
        Animated.spring(itemAnims[i], { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
      }, s.delay)
    );

    const doneTimer = setTimeout(() => {
      Animated.spring(doneScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
      setTimeout(onComplete, 700);
    }, steps[steps.length - 1].delay + 700);

    return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); };
  }, []);

  return (
    <Animated.View style={{ width: '100%', alignItems: 'center', opacity: fadeAnim }}>
      <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>
        Building your{'\n'}personalized plan...
      </Text>
      <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 48, textAlign: 'center' }}>
        Just a moment while we set things up
      </Text>

      <View style={{ width: '100%', gap: 16, marginBottom: 48 }}>
        {steps.map((s, i) => (
          <Animated.View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: itemAnims[i],
              transform: [{ translateY: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: processingStep > i ? '#4ade80' : COLORS.surface,
              borderWidth: 1.5,
              borderColor: processingStep > i ? '#4ade80' : '#ffffff18',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {processingStep > i
                ? <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>✓</Text>
                : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.muted }} />
              }
            </View>
            <Text style={{ color: processingStep > i ? COLORS.text : COLORS.muted, fontSize: 15, fontWeight: processingStep > i ? '700' : '400' }}>
              {s.label}
            </Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={{ transform: [{ scale: doneScale }], opacity: doneScale }}>
        <Text style={{ color: '#4ade80', fontSize: 16, fontWeight: '800' }}>All set! 🎉</Text>
      </Animated.View>
    </Animated.View>
  );
}

function SliderInput({ min, max, step = 1, value, onValueChange, unit = '', categories }) {
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef(null);
  const trackPageX = useRef(0);
  const THUMB = 26;
  const pct = trackW > 0 ? (value - min) / (max - min) : 0;
  const thumbLeft = pct * (trackW - THUMB);
  const category = categories?.find((c, i) => value >= c.min && (categories[i + 1] ? value < categories[i + 1].min : true));
  const color = category?.color || COLORS.accent;
  const handleMove = (e) => {
    if (!trackW) return;
    const x = Math.max(0, Math.min(e.nativeEvent.pageX - trackPageX.current, trackW));
    const raw = min + (x / trackW) * (max - min);
    onValueChange(Math.max(min, Math.min(max, Math.round(raw / step) * step)));
  };
  const remeasure = () => {
    if (trackRef.current) trackRef.current.measure((_fx, _fy, _w, _h, px) => { trackPageX.current = px; });
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        {category && <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{category.label}</Text>}
        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', marginLeft: 'auto' }}>{value}<Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '400' }}>{unit}</Text></Text>
      </View>
      <View
        ref={trackRef}
        onLayout={e => { setTrackW(e.nativeEvent.layout.width); remeasure(); }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={e => { remeasure(); handleMove(e); }}
        onResponderMove={handleMove}
        style={{ height: 48, justifyContent: 'center', marginBottom: 6 }}
      >
        <View style={{ height: 8, backgroundColor: '#1e1e3a', borderRadius: 4 }}>
          <View style={{ height: 8, backgroundColor: color, width: `${pct * 100}%`, borderRadius: 4 }} />
        </View>
        {trackW > 0 && (
          <View style={{ position: 'absolute', left: thumbLeft, top: (48 - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: color, shadowColor: color, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 }} />
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: COLORS.muted, fontSize: 11 }}>{min}{unit}</Text>
        <Text style={{ color: COLORS.muted, fontSize: 11 }}>{max}{unit}</Text>
      </View>
    </View>
  );
}

function Root() {
  const { height: screenHeight } = useWindowDimensions();
  const [textVal, setTextVal] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null);
  const [screen, setScreen] = useState('quiz');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logs, setLogs] = useState({});
  const [completedWorkouts, setCompletedWorkouts] = useState({});

  const [nutritionForm, setNutritionForm] = useState({ age: '', gender: '', heightFt: '', heightIn: '', weight: '', activityLevel: '' });
  const [nutritionResult, setNutritionResult] = useState(null);
  const [stretchImgModal, setStretchImgModal] = useState(null);
  const [user, setUser] = useState(null);
  const [restTimerDuration, setRestTimerDuration] = useState(60);
  const [restTimerRemaining, setRestTimerRemaining] = useState(60);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [restingForExercise, setRestingForExercise] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [sessionSets, setSessionSets] = useState([]);
  const [weightPickerVisible, setWeightPickerVisible] = useState(false);
  const [weightPickerIndex, setWeightPickerIndex] = useState(null);
  const [tempWeightVal, setTempWeightVal] = useState(null);
  const weightListRef = useRef(null);
  const [repsPickerVisible, setRepsPickerVisible] = useState(false);
  const [repsPickerIndex, setRepsPickerIndex] = useState(null);
  const [authForm, setAuthForm] = useState({ name: 'Test Test', email: 'test@test.com', password: 'Unicycle12!' });
  const [authError, setAuthError] = useState('');
  const [profileStep, setProfileStep] = useState(1);
  const [profileForm, setProfileForm] = useState({
    gender: '', age: '', weightLbs: '', heightFt: '', heightIn: '',
    bodyFatPct: '', chest: '', waist: '', hips: '', arms: '', thighs: '',
    primaryGoal: '', trainingDays: '', fitnessLevel: '', activityLevel: '', sleepQuality: '',
  });
  const [processingStep, setProcessingStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [exerciseDbImages, setExerciseDbImages] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const sheetSlide = useRef(new Animated.Value(400)).current;
  const sheetBackdrop = useRef(new Animated.Value(0)).current;
  const [barPlates, setBarPlates] = useState([]);
  const keepPlatesRef = useRef(false);
  const savedDismissRef = useRef({ index: null });
  const [workoutChip, setWorkoutChip] = useState(false);
  const chipFade = useRef(new Animated.Value(0)).current;
  const chipScale = useRef(new Animated.Value(0.7)).current;
  const [currentWeek, setCurrentWeek] = useState(1);
  const TOTAL_WEEKS = 8;
  const [weekDetailFrom, setWeekDetailFrom] = useState('plan');
  const [settingsFrom, setSettingsFrom] = useState('plan');
  const [restTimerEnabled, setRestTimerEnabled] = useState(true);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [showSwitchSides, setShowSwitchSides] = useState(false);
  const [editingEntryIndex, setEditingEntryIndex] = useState(null);
  const [editSets, setEditSets] = useState([]);
  const [stretchEachSide, setStretchEachSide] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(async userVal => {
      if (!userVal) { setScreen('register'); return; }
      const savedUser = JSON.parse(userVal);
      setUser(savedUser);
      setAnswers({ name: savedUser.name });
      try {
        const snap = await getDoc(doc(db, 'users', savedUser.email));
        if (snap.exists()) {
          const data = snap.data();
          const parsedLogs = data.logs || {};
          setLogs(parsedLogs);
          const completedRaw = data.completedWorkouts || {};
          const validated = {};
          for (const key of Object.keys(completedRaw)) {
            const lastPipe = key.lastIndexOf('|');
            const dayTitle = key.slice(0, lastPipe);
            const week = parseInt(key.slice(lastPipe + 1));
            const hasLogs = Object.keys(parsedLogs).some(lk => {
              if (!lk.startsWith(dayTitle + '|')) return false;
              return (parsedLogs[lk] || []).some(en =>
                en.programWeek === week
              );
            });
            if (hasLogs) validated[key] = true;
          }
          setCompletedWorkouts(validated);
          if (data.restTimerEnabled !== undefined) setRestTimerEnabled(data.restTimerEnabled);
          if (data.profile) setProfileForm(f => ({ ...f, ...data.profile }));
        }
      } catch (e) {}
      setScreen('login');
    });
  }, []);


  useEffect(() => {
    if (!restTimerRunning) return;
    if (restTimerRemaining <= 0) { setRestTimerRunning(false); return; }
    const interval = setInterval(() => {
      setRestTimerRemaining(r => {
        if (r <= 1) {
          setRestTimerRunning(false);
          setActiveExerciseIndex(i => i + 1);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerRunning, restTimerRemaining]);

  useEffect(() => {
    setShowCompleteButton(false);
  }, [currentWeek, selectedDay]);

  function playSound(type) {
    if (type === 'switch') {
      Vibration.vibrate([0, 150, 80, 150]);
    } else {
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
    }
  }


  useEffect(() => {
    if (!restTimerRunning || !stretchEachSide || restTimerDuration === 0) return;
    const half = Math.floor(restTimerDuration / 2);
    if (restTimerRemaining === half) {
      setShowSwitchSides(true);
      playSound('switch');
      setTimeout(() => setShowSwitchSides(false), 2500);
    }
  }, [restTimerRemaining, restTimerRunning, stretchEachSide, restTimerDuration]);

  useEffect(() => {
    const isStretchDay = selectedDay?.day?.includes('Rest');
    if (restTimerRemaining === 0 && !restTimerRunning && isStretchDay) {
      playSound('complete');
    }
  }, [restTimerRemaining, restTimerRunning]);


  useEffect(() => {
    if (!weightPickerVisible) return;
    if (keepPlatesRef.current) { keepPlatesRef.current = false; return; }
    if (savedDismissRef.current.index === weightPickerIndex) {
      savedDismissRef.current = { index: null };
      return; // same set reopened after backdrop dismiss — keep plates & tempWeightVal
    }
    savedDismissRef.current = { index: null };
    setTempWeightVal(null);
    const w = weightPickerIndex !== null ? parseFloat(sessionSets[weightPickerIndex]?.weight) || 0 : 0;
    setBarPlates(w >= 45 ? weightToPlates(w) : []);
  }, [weightPickerVisible]);

  useEffect(() => {
    setWorkoutChip(false);
    chipFade.setValue(0);
    chipScale.setValue(0.7);
  }, [selectedDay]);

  useEffect(() => {
    const CACHE_KEY = 'exerciseDbCache';
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    function buildMap(data) {
      const exact = {};
      const entries = [];
      data.forEach(ex => {
        const key = ex.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        if (ex.images && ex.images.length > 0) {
          const urls = ex.images.map(img => EXERCISE_DB_BASE + img);
          exact[key] = urls;
          entries.push({ key, urls });
        }
      });
      const map = { ...exact };
      entries.forEach(({ key, urls }) => {
        const words = key.split(' ');
        words.forEach((_, i) => {
          for (let len = words.length; len >= 2; len--) {
            const sub = words.slice(i, i + len).join(' ');
            if (!map[sub]) map[sub] = urls;
          }
        });
      });
      return map;
    }

    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) {
        const { timestamp, map } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setExerciseDbImages(map);
          return;
        }
      }
      fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json')
        .then(r => r.json())
        .then(data => {
          const map = buildMap(data);
          setExerciseDbImages(map);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), map }));
        })
        .catch(() => {});
    });
  }, []);


  async function deleteTestUsers() {
    const snap = await getDocs(collection(db, 'users'));
    const toDelete = snap.docs.filter(d => (d.data().name || '').toLowerCase().includes('test'));
    if (toDelete.length === 0) { Alert.alert('No test users found'); return; }
    await Promise.all(toDelete.map(d => deleteDoc(doc(db, 'users', d.id))));
    Alert.alert('Deleted', `Removed ${toDelete.length} test user${toDelete.length > 1 ? 's' : ''}`);
  }

  function handleRegister() {
    const { name, email, password } = authForm;
    if (!name || !email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@')) {
      setAuthError('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    const userRef = doc(db, 'users', email);
    getDoc(userRef).then(snap => {
      if (snap.exists()) {
        setAuthError('An account with this email already exists.');
        return;
      }
      const newUser = { name, email, password };
      setDoc(userRef, { ...newUser, restTimerEnabled: true, logs: {}, completedWorkouts: {} });
      AsyncStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      setLogs({});
      setCompletedWorkouts({});
      setPlan(null);
      setSelectedDay(null);
      setSelectedExercise(null);
      setSessionSets([]);
      setCurrentWeek(1);
      setRestTimerEnabled(true);
      setAnswers({ name });
      setAuthError('');
      setProfileStep(1);
      setProfileForm({ gender: '', age: '', weightLbs: '', heightFt: '', heightIn: '', bodyFatPct: '', chest: '', waist: '', hips: '', arms: '', thighs: '', primaryGoal: '', trainingDays: '', fitnessLevel: '', sleepQuality: '', dailyCalories: '' });

      setScreen('profile-setup');
    });
  }

  function handleLogin() {
    const { email, password } = authForm;
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    getDoc(doc(db, 'users', email)).then(snap => {
      if (!snap.exists()) { setAuthError('No account found. Please register.'); return; }
      const found = snap.data();
      if (found.password !== password) { setAuthError('Incorrect email or password.'); return; }
      const userInfo = { name: found.name, email: found.email, password: found.password, gender: found.gender };
      AsyncStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      setPlan(null);
      setSelectedDay(null);
      setSelectedExercise(null);
      setSessionSets([]);
      setCurrentWeek(1);
      setAnswers({ name: found.name });
      setAuthError('');
      if (found.profile) setProfileForm(f => ({ ...f, ...found.profile }));
      const foundLogs = found.logs || {};
      setLogs(foundLogs);
      const completedRaw = found.completedWorkouts || {};
      const validated = {};
      for (const key of Object.keys(completedRaw)) {
        const lastPipe = key.lastIndexOf('|');
        const dayTitle = key.slice(0, lastPipe);
        const week = parseInt(key.slice(lastPipe + 1));
        const hasLogs = Object.keys(foundLogs).some(lk =>
          lk.startsWith(dayTitle + '|') && (foundLogs[lk] || []).some(en => en.programWeek === week)
        );
        if (hasLogs) validated[key] = true;
      }
      setCompletedWorkouts(validated);
      if (found.restTimerEnabled !== undefined) setRestTimerEnabled(found.restTimerEnabled);
      setScreen('quiz');
    });
  }

  function handleLogout() {
    setUser(null);
    setAuthForm({ name: '', email: '', password: '', gender: '' });
    setAuthError('');
    setPlan(null);
    setAnswers({});
    setLogs({});
    setCompletedWorkouts({});
    setSelectedDay(null);
    setSelectedExercise(null);
    setSessionSets([]);
    setCurrentWeek(1);
    setScreen('login');
  }

  function renderDayCompleteModal() {
    return (
      <DayCompleteModal
        visible={showDayComplete}
        selectedDay={selectedDay}
        logs={logs}
        currentWeek={currentWeek}
        onSaveExit={() => { setShowDayComplete(false); setScreen('plan'); }}
      />
    );
  }


  function logKey(dayTitle, exercise) {
    return `${dayTitle}|${exercise}`;
  }

  function handleAnswer(value) {
    const key = QUESTIONS[step].key;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setTextVal('');

    if (key === 'goal' && value === 'Get Your Nutrition Plan') {
      const pf = profileForm;
      const age = pf.age;
      const gender = pf.gender || user?.gender;
      const heightFt = pf.heightFt;
      const heightIn = pf.heightIn || '0';
      const weight = pf.weightLbs;
      const activityLevel = pf.activityLevel || 'Moderately Active';
      if (age && gender && heightFt && weight) {
        const tdee = calculateTDEE(age, gender, heightFt, heightIn, weight, activityLevel);
        const goalAdj = { 'Build Muscle': 300, 'Lose Fat': -500, 'Recomp': 0, 'Get Stronger': 150 };
        const adj = goalAdj[pf.primaryGoal] ?? 0;
        const cut = tdee - 500;
        const bulk = tdee + 300;
        const target = tdee + adj;
        const proteinG = Math.round(parseFloat(weight));
        setNutritionResult({ tdee, cut, bulk, target, proteinG, weight: parseFloat(weight) });
        setScreen('nutritionResults');
      } else {
        setScreen('nutrition');
      }
      return;
    }

    if (key === 'goal' && (value === 'Building Muscle - Men' || value === 'Building Muscle - Women')) {
      setPlan(WORKOUT_PLANS[value]);
      if (user) updateDoc(doc(db, 'users', user.email), { goal: value });
      const isFirstTime = Object.keys(logs).length === 0;
      setScreen(isFirstTime ? 'plan-preview' : 'plan');
      return;
    }
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  }

  function restart() {
    setStep(0);
    setPlan(null);
    setTextVal('');
    setScreen('quiz');
    setSelectedDay(null);
    setSelectedExercise(null);
    setNutritionForm({ age: '', gender: '', heightFt: '', heightIn: '', weight: '', activityLevel: '' });
    setNutritionResult(null);
  }

  function submitNutrition() {
    const { age, gender, heightFt, heightIn, weight, activityLevel } = nutritionForm;
    if (!age || !gender || !heightFt || !weight || !activityLevel) return;
    const tdee = calculateTDEE(age, gender, heightFt, heightIn || '0', weight, activityLevel);
    const cut = tdee - 500;
    const bulk = tdee + 300;
    const proteinG = Math.round(parseFloat(weight));
    setNutritionResult({ tdee, cut, bulk, proteinG, weight: parseFloat(weight) });
    setScreen('nutritionResults');
  }


  const question = QUESTIONS[step];

  function LogoutBtn() {
    const openSheet = () => {
      sheetSlide.setValue(400);
      sheetBackdrop.setValue(0);
      setMenuVisible(true);
      Animated.parallel([
        Animated.spring(sheetSlide, { toValue: 0, useNativeDriver: true, speed: 55, bounciness: 3 }),
        Animated.timing(sheetBackdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    };

    const closeSheet = (cb) => {
      Animated.parallel([
        Animated.spring(sheetSlide, { toValue: 400, useNativeDriver: true, speed: 80, bounciness: 0 }),
        Animated.timing(sheetBackdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => { setMenuVisible(false); cb && cb(); });
    };

    return (
      <>
        <TouchableOpacity onPress={openSheet} style={{ position: 'absolute', top: 24, right: 0, padding: 20, zIndex: 10 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', letterSpacing: 2 }}>⋯</Text>
        </TouchableOpacity>

        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => closeSheet()}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {/* Backdrop */}
            <Animated.View
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: sheetBackdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] }) }}
            >
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View style={{ transform: [{ translateY: sheetSlide }], backgroundColor: COLORS.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: '#ffffff18', paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
                <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: '#ffffff25' }} />
              </View>

              {/* Settings row */}
              <TouchableOpacity
                onPress={() => closeSheet(() => { setSettingsFrom(screen); setScreen('settings'); })}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#ffffff0e' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#ffffff12', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>⚙️</Text>
                </View>
                <View>
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600' }}>Settings</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Preferences & account</Text>
                </View>
              </TouchableOpacity>

              {/* Log Out row */}
              <TouchableOpacity
                onPress={() => closeSheet(handleLogout)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 18 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🚪</Text>
                </View>
                <View>
                  <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '600' }}>Log Out</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Sign out of your account</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </>
    );
  }

  // ── Register Screen ───────────────────────────────────────
  if (screen === 'register') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: '#2a0a10',
              borderWidth: 2, borderColor: COLORS.accent,
              justifyContent: 'center', alignItems: 'center',
              shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20,
              elevation: 12,
            }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.accent }}>GB</Text>
            </View>
          </View>

          <Text style={{ color: COLORS.text, fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Create Account</Text>
          <Text style={{ color: COLORS.muted, fontSize: 15, textAlign: 'center', marginBottom: 40 }}>Start tracking your workouts</Text>

          {/* Full Name */}
          <View style={styles.authField}>
            <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>👤</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Full Name"
              placeholderTextColor={COLORS.muted}
              value={authForm.name}
              onChangeText={v => setAuthForm(f => ({ ...f, name: v }))}
            />
          </View>

          {/* Email */}
          <View style={styles.authField}>
            <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>✉</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Email"
              placeholderTextColor={COLORS.muted}
              value={authForm.email}
              onChangeText={v => setAuthForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.authField}>
            <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>🔒</Text>
            <TextInput
              style={[styles.authInput, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              value={authForm.password}
              onChangeText={v => setAuthForm(f => ({ ...f, password: v }))}
              secureTextEntry={!showPassword}
            />
            <AnimatedPress
              style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}
              onPress={() => setShowPassword(s => !s)}
              scaleDown={0.88}
            >
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </AnimatedPress>
          </View>

          {authError ? <Text style={[styles.authError, { marginBottom: 12 }]}>{authError}</Text> : null}

          {/* Create Account button */}
          <AnimatedPress
            style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 20 }}
            onPress={handleRegister}
            scaleDown={0.95}
          >
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: 'bold' }}>Create Account</Text>
          </AnimatedPress>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#2a2a4a', marginBottom: 20 }} />

          {/* Log in link */}
          <TouchableOpacity onPress={() => { setAuthError(''); setScreen('login'); }} style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>
              Already have an account?{'  '}<Text style={{ color: COLORS.accent, fontWeight: '600' }}>Log in</Text>
            </Text>
          </TouchableOpacity>

          {/* Dev tool */}
          <TouchableOpacity onPress={deleteTestUsers} style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#3a3a5a', fontSize: 11 }}>🗑 Delete test users</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Login Screen ──────────────────────────────────────────
  if (screen === 'login') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#2a0a10',
              borderWidth: 1.5, borderColor: COLORS.accent,
              justifyContent: 'center', alignItems: 'center',
              opacity: 0.85,
            }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.accent }}>GB</Text>
            </View>
          </View>

          <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>Welcome Back</Text>
          <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', marginBottom: 40 }}>Log in to continue</Text>

          {/* Email field */}
          <View style={styles.authField}>
            <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', marginRight: 12 }}>Email</Text>
            <TextInput
              style={[styles.authInput, Platform.OS === 'ios' && { textAlign: 'left', paddingLeft: 0 }]}
              placeholder="Email"
              placeholderTextColor={COLORS.muted}
              value={authForm.email}
              onChangeText={v => setAuthForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password field */}
          <View style={styles.authField}>
            <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', marginRight: 12 }}>Password</Text>
            <TextInput
              style={[styles.authInput, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              value={authForm.password}
              onChangeText={v => setAuthForm(f => ({ ...f, password: v }))}
              secureTextEntry={!showPassword}
            />
            <AnimatedPress
              style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}
              onPress={() => setShowPassword(s => !s)}
              scaleDown={0.88}
            >
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </AnimatedPress>
          </View>

          {authError ? <Text style={[styles.authError, { marginBottom: 12 }]}>{authError}</Text> : null}

          {/* Log In button */}
          <AnimatedPress
            style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 20, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 }}
            onPress={handleLogin}
            scaleDown={0.95}
          >
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>Log In</Text>
          </AnimatedPress>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#2a2a4a', marginBottom: 20 }} />

          {/* Sign up link */}
          <TouchableOpacity onPress={() => { setAuthError(''); setScreen('register'); }} style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>
              Don't have an account?{'  '}<Text style={{ color: COLORS.accent, fontWeight: '600' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Week Tracker Card (shared) ───────────────────────────
  function WeekTrackerCard({ fromScreen }) {
    const workoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
    const completedDays = workoutDays.filter(d =>
      d.exercises.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek))
    ).length;
    const progress = workoutDays.length > 0 ? completedDays / workoutDays.length : 0;
    const programProgress = Math.round(((currentWeek - 1) / TOTAL_WEEKS + progress / TOTAL_WEEKS) * 100);
    const weekComplete = completedDays === workoutDays.length && workoutDays.length > 0 &&
      workoutDays.every(d => {
        const wk = `${d.day}|${currentWeek}`;
        const dayExs = d.exercises.filter(e =>
          !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
        );
        const hasLog = dayExs.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek));
        return !!completedWorkouts[wk] && hasLog;
      });
    const momentum = weekComplete
      ? { label: '🏆 Week complete!', color: '#4ade80' }
      : progress >= 0.5
      ? { label: '🔥 You\'re on track', color: '#f97316' }
      : completedDays > 0
      ? { label: '💪 Keep the momentum', color: COLORS.muted }
      : { label: 'Start your first session', color: COLORS.muted };
    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => { setWeekDetailFrom(fromScreen || 'plan'); setScreen('weekDetail'); }}
          style={{ borderRadius: 20, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 }}>
          <LinearGradient
            colors={['#1e1040', '#0e1630', '#0a0a1a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#e9456028', borderTopColor: '#e9456055' }}
          >
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Current Week</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ color: COLORS.text, fontWeight: '900', fontSize: 36, letterSpacing: -1 }}>{currentWeek}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 16 }}>/ {TOTAL_WEEKS}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => setCurrentWeek(w => Math.max(1, w - 1))} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek > 1 ? 1 : 0.3 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrentWeek(w => Math.min(TOTAL_WEEKS, w + 1))} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek < TOTAL_WEEKS ? 1 : 0.3 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>›</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: momentum.color, fontSize: 13, fontWeight: '700' }}>{momentum.label}</Text>
            </View>
          </View>
          {/* Progress bar */}
          <AnimatedProgressBar progress={programProgress / 100} height={8} color={COLORS.accent} trackColor="#2a2a4a" glowColor={COLORS.accent} style={{ marginBottom: 14 }} />
          {/* Stats row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Sessions</Text>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{completedDays} <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '400' }}>/ {workoutDays.length}</Text></Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Program</Text>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{programProgress}<Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '400' }}>%</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Remaining</Text>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{workoutDays.length - completedDays} <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '400' }}>sessions</Text></Text>
            </View>
          </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Week complete card */}
        {weekComplete && (
          <View style={{ marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#4ade8040', borderTopColor: '#4ade8070', backgroundColor: '#4ade8010', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <View>
                <Text style={{ color: '#4ade80', fontSize: 15, fontWeight: '800' }}>Week complete!</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>You crushed all {workoutDays.length} sessions.</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => { setWeekDetailFrom(fromScreen || 'plan'); setScreen('weekDetail'); }}
              style={{ backgroundColor: '#4ade8025', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#4ade8060' }}
            >
              <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700' }}>View Progress</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Next Action Card ─────────────────────────────────────
  function NextActionCard() {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = DAY_NAMES[new Date().getDay()];
    const todayDay = (plan || []).find(d => d.day.startsWith(todayName));
    const todayIsRest = todayDay?.day.includes('Rest');

    const allWorkoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
    const weekComplete = allWorkoutDays.length > 0 && allWorkoutDays.every(d => {
      const wk = `${d.day}|${currentWeek}`;
      const dayExs = d.exercises.filter(e =>
        !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
      );
      const hasLog = dayExs.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek));
      return !!completedWorkouts[wk] && hasLog;
    });

    const workoutExs = todayDay && !todayIsRest
      ? todayDay.exercises.filter(e =>
          !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
        )
      : [];
    const todayLoggedCount = workoutExs.filter(e =>
      (logs[logKey(todayDay?.day, e)] || []).some(en => en.programWeek === currentWeek)
    ).length;
    const todayCompleted = !!(completedWorkouts[`${todayDay?.day}|${currentWeek}`]) && todayLoggedCount > 0;
    const todayStarted = !todayCompleted && todayLoggedCount > 0;

    const nextWorkoutDay = (!todayIsRest && todayCompleted) || todayIsRest
      ? allWorkoutDays.find(d => !completedWorkouts[`${d.day}|${currentWeek}`])
      : null;

    if (weekComplete) return null;

    let config;
    if (!todayDay) {
      return null;
    } else if (todayIsRest) {
      const nextLabel = nextWorkoutDay ? nextWorkoutDay.day.split('–').map(s => s.trim())[1] || nextWorkoutDay.day : null;
      config = {
        emoji: '💤', title: 'Rest Day',
        subtitle: nextLabel ? `Up next: ${nextLabel}` : 'Enjoy the recovery.',
        cta: null, accent: '#4a5580', solid: false,
      };
    } else if (todayCompleted) {
      const nextLabel = nextWorkoutDay ? nextWorkoutDay.day.split('–').map(s => s.trim())[1] || nextWorkoutDay.day : null;
      config = {
        emoji: '✅', title: "Today's done!",
        subtitle: nextLabel ? `Up next: ${nextLabel}` : 'Full week complete!',
        cta: null, accent: '#4ade80', solid: false,
      };
    } else if (todayStarted) {
      const label = todayDay.day.split('–').map(s => s.trim())[1] || todayDay.day;
      config = {
        emoji: '💪', title: `Continue ${label}`,
        subtitle: `${todayLoggedCount} of ${workoutExs.length} exercises logged`,
        cta: 'Continue Workout', ctaDay: todayDay,
        accent: '#f59e0b', solid: true,
      };
    } else {
      const label = todayDay.day.split('–').map(s => s.trim())[1] || todayDay.day;
      config = {
        emoji: '🔥', title: `Start ${label}`,
        subtitle: `${workoutExs.length} exercises  •  ~${workoutExs.length * 8} min`,
        cta: "Let's Go", ctaDay: todayDay,
        accent: COLORS.accent, solid: true,
      };
    }

    const handleCta = () => {
      if (config.ctaDay) {
        setSelectedDay(config.ctaDay);
        setActiveExerciseIndex(0);
        setRestTimerRunning(false);
        setRestingForExercise(null);
        setScreen('day');
      } else if (config.ctaScreen) {
        setWeekDetailFrom('plan');
        setScreen(config.ctaScreen);
      }
    };

    return (
      <LinearGradient
        colors={[config.accent + '28', config.accent + '0a', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: config.accent + '40', borderTopColor: config.accent + '70' }}
      >
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: config.cta ? 16 : 0 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: config.accent + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: config.accent + '40' }}>
              <Text style={{ fontSize: 24 }}>{config.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>{config.title}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>{config.subtitle}</Text>
            </View>
          </View>
          {config.cta ? (
            <AnimatedPress
              onPress={handleCta}
              style={{
                backgroundColor: config.solid ? config.accent : config.accent + '25',
                borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                borderWidth: config.solid ? 0 : 1, borderColor: config.accent + '60',
              }}
              scaleDown={0.97}
            >
              <Text style={{ color: config.solid ? '#fff' : config.accent, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 }}>
                {config.cta}
              </Text>
            </AnimatedPress>
          ) : null}
        </View>
      </LinearGradient>
    );
  }

  // ── Profile Setup Screen ─────────────────────────────────
  if (screen === 'profile-setup') {
    const pf = profileForm;
    const setPF = (key, val) => setProfileForm(f => ({ ...f, [key]: val }));
    const heightIn = pf.heightFt ? parseInt(pf.heightFt) * 12 + (parseInt(pf.heightIn) || 0) : 0;
    const bmi = (heightIn > 0 && pf.weightLbs) ? ((parseFloat(pf.weightLbs) / (heightIn * heightIn)) * 703).toFixed(1) : null;
    const TOTAL_STEPS = 3;
    const STEP_HEADLINES = [
      { eyebrow: "Let's build your plan", title: 'Tell us about you' },
      { eyebrow: 'Almost there', title: 'How does your body feel?' },
      { eyebrow: 'Last step', title: 'Your lifestyle matters' },
    ];

    function saveProfileAndContinue() {
      const profile = { ...pf, bmi: bmi ? parseFloat(bmi) : null };
      if (user) updateDoc(doc(db, 'users', user.email), { profile, gender: pf.gender });
      AsyncStorage.getItem('user').then(val => {
        if (val) {
          const u = { ...JSON.parse(val), gender: pf.gender };
          AsyncStorage.setItem('user', JSON.stringify(u));
          setUser(u);
        }
      });
      setAnswers(a => ({ ...a, goal: pf.gender === 'Female' ? undefined : undefined }));
      setProcessingStep(0);
      setScreen('processing');
    }

    const inputStyle = { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: '#ffffff10', marginBottom: 12 };
    const labelStyle = { color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 4 };
    const chipActive = { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.accent };
    const chipInactive = { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff10' };

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {profileStep > 1 && (
              <TouchableOpacity onPress={() => setProfileStep(s => s - 1)}>
                <Text style={{ color: COLORS.muted, fontSize: 22 }}>‹</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>{STEP_HEADLINES[profileStep - 1].eyebrow}</Text>
              <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '900', marginTop: 2 }}>{STEP_HEADLINES[profileStep - 1].title}</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={{ height: 4, backgroundColor: '#1e1e3a', borderRadius: 2, marginTop: 8 }}>
            <View style={{ height: 4, backgroundColor: COLORS.accent, borderRadius: 2, width: `${(profileStep / TOTAL_STEPS) * 100}%` }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>

          {/* ── Step 1: Personal Info ── */}
          {profileStep === 1 && (
            <>
              <Text style={labelStyle}>GENDER</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {['Male', 'Female'].map(g => (
                  <TouchableOpacity key={g} style={[pf.gender === g ? chipActive : chipInactive, { flex: 1, alignItems: 'center' }]} onPress={() => setPF('gender', g)}>
                    <Text style={{ color: pf.gender === g ? '#000' : COLORS.muted, fontWeight: '700' }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>AGE</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 28"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                value={pf.age}
                onChangeText={v => setPF('age', v.replace(/[^0-9]/g, ''))}
              />

              <Text style={labelStyle}>WEIGHT (LBS)</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 185"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                value={pf.weightLbs}
                onChangeText={v => setPF('weightLbs', v.replace(/[^0-9]/g, ''))}
              />

              <Text style={labelStyle}>HEIGHT</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TextInput
                  style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                  placeholder="ft"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  maxLength={1}
                  value={pf.heightFt}
                  onChangeText={v => setPF('heightFt', v.replace(/[^0-9]/g, ''))}
                />
                <TextInput
                  style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                  placeholder="in"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  maxLength={2}
                  value={pf.heightIn}
                  onChangeText={v => setPF('heightIn', v.replace(/[^0-9]/g, ''))}
                />
              </View>

              {bmi && (() => {
                const b = parseFloat(bmi);
                const { label, color } = b < 18.5 ? { label: 'Underweight', color: '#60a5fa' }
                  : b < 25 ? { label: 'Healthy',        color: '#4ade80' }
                  : b < 30 ? { label: 'Above Average',  color: '#f59e0b' }
                  :          { label: 'High',            color: '#ef4444' };
                return (
                  <View style={{ backgroundColor: '#1e1e3a', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: color + '30' }}>
                    <View>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 }}>BMI</Text>
                      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{label}</Text>
                    </View>
                    <Text style={{ color, fontSize: 28, fontWeight: '900' }}>{bmi}</Text>
                  </View>
                );
              })()}
            </>
          )}

          {/* ── Step 2: Body Composition ── */}
          {profileStep === 2 && (() => {
            function estimateBodyFat() {
              const heightInches = pf.heightFt ? parseInt(pf.heightFt) * 12 + (parseInt(pf.heightIn) || 0) : 0;
              const bmiVal = heightInches > 0 && pf.weightLbs
                ? (parseFloat(pf.weightLbs) / (heightInches * heightInches)) * 703
                : null;
              const age = pf.age ? parseInt(pf.age) : null;
              if (!bmiVal || !age) return null;
              const isMale = pf.gender !== 'Female';
              let bf = (1.20 * bmiVal) + (0.23 * age) - (isMale ? 16.2 : 5.4);
              if (pf.fitnessLevel === 'Advanced') bf -= 2;
              if (pf.fitnessLevel === 'Beginner') bf += 2;
              return Math.max(2, Math.min(50, Math.round(bf)));
            }
            const estimate = estimateBodyFat();
            const canEstimate = estimate !== null;

            return (
              <>
                <Text style={labelStyle}>BODY FAT %</Text>
                <View style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <SliderInput
                    min={2} max={50} step={1}
                    value={parseInt(pf.bodyFatPct) || 18}
                    onValueChange={v => setPF('bodyFatPct', String(v))}
                    unit="%"
                    categories={BF_CATEGORIES}
                  />
                </View>

                {/* BF% reference guide */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {BF_CATEGORIES.map((cat, i) => {
                    const nextMin = BF_CATEGORIES[i + 1]?.min;
                    const range = nextMin ? `${cat.min}–${nextMin - 1}%` : `${cat.min}%+`;
                    const currentBf = parseInt(pf.bodyFatPct) || 18;
                    const isActive = currentBf >= cat.min && (nextMin ? currentBf < nextMin : true);
                    return (
                      <TouchableOpacity
                        key={cat.label}
                        onPress={() => setPF('bodyFatPct', String(cat.min + (nextMin ? Math.floor((nextMin - cat.min) / 2) : 3)))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isActive ? cat.color + '22' : COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: isActive ? cat.color + '80' : '#ffffff10' }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                        <Text style={{ color: isActive ? cat.color : COLORS.muted, fontSize: 12, fontWeight: isActive ? '700' : '400' }}>
                          {cat.label} <Text style={{ fontWeight: '400', opacity: 0.7 }}>({range})</Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ backgroundColor: '#1a1a3a', borderRadius: 12, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 2 }}>Don't know your body fat?</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 17 }}>
                      {canEstimate ? `We'll estimate using your height, weight & age.` : 'Enter your height, weight & age on the previous step first.'}
                    </Text>
                  </View>
                  {canEstimate && (
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
                      onPress={() => setPF('bodyFatPct', String(estimate))}
                    >
                      <Text style={{ color: '#000', fontWeight: '900', fontSize: 13 }}>Estimate</Text>
                    </TouchableOpacity>
                  )}
                </View>

              <Text style={labelStyle}>MEASUREMENTS (INCHES) — OPTIONAL</Text>
              {(() => {
                const h = pf.heightFt ? parseInt(pf.heightFt) * 12 + (parseInt(pf.heightIn) || 0) : 0;
                const w = parseFloat(pf.weightLbs) || 0;
                const isFemale = pf.gender === 'Female';
                // Devine formula for typical weight (lbs)
                const typicalW = isFemale ? (100 + 5 * (h - 60)) : (106 + 6 * (h - 60));
                const wAdj = w && typicalW > 0 ? (w - typicalW) / typicalW : 0;
                const est = (base) => h && w ? Math.round(base * (1 + Math.max(-0.3, Math.min(0.3, wAdj * 0.4)) )) : null;
                const estimates = isFemale
                  ? { chest: est(h * 0.535), waist: est(h * 0.415), hips: est(h * 0.575), arms: est(h * 0.175), thighs: est(h * 0.335) }
                  : { chest: est(h * 0.570), waist: est(h * 0.455), hips: est(h * 0.535), arms: est(h * 0.195), thighs: est(h * 0.315) };
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                    {[['Chest', 'chest'], ['Waist', 'waist'], ['Hips', 'hips'], ['Arms', 'arms'], ['Thighs', 'thighs']].map(([label, key]) => (
                      <View key={key} style={{ width: '47%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ffffff08' }}>
                        <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>{label.toUpperCase()}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={{ flex: 1, color: COLORS.text, fontSize: 20, fontWeight: '700' }}
                            value={pf[key]}
                            placeholder="—"
                            placeholderTextColor={COLORS.muted}
                            keyboardType="decimal-pad"
                            onChangeText={v => setPF(key, v.replace(/[^0-9.]/g, ''))}
                          />
                          {!pf[key] && estimates[key] && (
                            <Text style={{ color: COLORS.muted, fontSize: 12 }}>~{estimates[key]}"</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </>
            );
          })()}

          {/* ── Step 3: Lifestyle ── */}
          {profileStep === 3 && (
            <>
              <Text style={labelStyle}>PRIMARY GOAL</Text>
              <View style={{ gap: 10, marginBottom: 20 }}>
                {[
                  { key: 'Build Muscle',  icon: '💪', desc: 'Gain size and strength' },
                  { key: 'Lose Fat',      icon: '🔥', desc: 'Burn fat, get leaner' },
                  { key: 'Recomp',        icon: '⚖️',  desc: 'Build muscle & lose fat simultaneously' },
                  { key: 'Get Stronger',  icon: '🏋️', desc: 'Increase your lifts and raw power' },
                ].map(({ key, icon, desc }) => {
                  const active = pf.primaryGoal === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setPF('primaryGoal', key)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: active ? COLORS.accent + '18' : COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: active ? COLORS.accent : '#ffffff10' }}
                    >
                      <Text style={{ fontSize: 24 }}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: active ? COLORS.accent : COLORS.text, fontWeight: '800', fontSize: 15 }}>{key}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
                      </View>
                      {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={labelStyle}>DAYS PER WEEK YOU CAN TRAIN</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {[
                  { val: '3', label: '3 days', sub: 'Consistent' },
                  { val: '5', label: '5 days', sub: 'Committed' },
                ].map(({ val, label, sub }) => {
                  const active = pf.trainingDays === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setPF('trainingDays', val)}
                      style={{ flex: 1, alignItems: 'center', backgroundColor: active ? COLORS.accent + '18' : COLORS.surface, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: active ? COLORS.accent : '#ffffff10' }}
                    >
                      <Text style={{ color: active ? COLORS.accent : COLORS.text, fontSize: 16, fontWeight: '900' }}>{label}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 3 }}>{sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={labelStyle}>CURRENT FITNESS LEVEL</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                  <TouchableOpacity key={l} style={pf.fitnessLevel === l ? chipActive : chipInactive} onPress={() => setPF('fitnessLevel', l)}>
                    <Text style={{ color: pf.fitnessLevel === l ? '#000' : COLORS.muted, fontWeight: '700', fontSize: 13 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>ACTIVITY LEVEL</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {[
                  { val: 'Sedentary', sub: 'Little to no exercise' },
                  { val: 'Lightly Active', sub: 'Light exercise 1–3 days/week' },
                  { val: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week' },
                  { val: 'Very Active', sub: 'Hard exercise 6–7 days/week' },
                ].map(({ val, sub }) => (
                  <TouchableOpacity key={val} onPress={() => setPF('activityLevel', val)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: pf.activityLevel === val ? COLORS.accent : '#ffffff15', backgroundColor: pf.activityLevel === val ? COLORS.accent + '20' : '#ffffff08' }}>
                    <View>
                      <Text style={{ color: pf.activityLevel === val ? COLORS.accent : COLORS.text, fontWeight: '700', fontSize: 14 }}>{val}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
                    </View>
                    {pf.activityLevel === val && <Text style={{ color: COLORS.accent, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>SLEEP QUALITY</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['Poor', 'Fair', 'Good', 'Excellent'].map(s => (
                  <TouchableOpacity key={s} style={pf.sleepQuality === s ? chipActive : chipInactive} onPress={() => setPF('sleepQuality', s)}>
                    <Text style={{ color: pf.sleepQuality === s ? '#000' : COLORS.muted, fontWeight: '700', fontSize: 13 }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

        </ScrollView>

        {/* Bottom nav */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: '#ffffff08' }}>
          {profileStep < TOTAL_STEPS ? (
            <AnimatedPress
              style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              onPress={() => setProfileStep(s => s + 1)}
              scaleDown={0.96}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Continue</Text>
            </AnimatedPress>
          ) : (
            <AnimatedPress
              style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              onPress={saveProfileAndContinue}
              scaleDown={0.96}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Complete Setup</Text>
            </AnimatedPress>
          )}
        </View>

      </KeyboardAvoidingView>
    );
  }

  // ── Processing Screen ─────────────────────────────────────
  if (screen === 'processing') {
    const STEPS = [
      { label: 'Analyzing your body composition',  delay: 600  },
      { label: 'Setting your calorie target',       delay: 1400 },
      { label: 'Designing your workouts',           delay: 2200 },
      { label: 'Personalizing your program',        delay: 3000 },
    ];
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 }]}>
        <ProcessingScreen
          steps={STEPS}
          onComplete={() => setScreen('plan-summary')}
          processingStep={processingStep}
          setProcessingStep={setProcessingStep}
        />
      </View>
    );
  }

  // ── Plan Summary Screen ───────────────────────────────────
  if (screen === 'plan-summary') {
    const pf = profileForm;

    // Calorie calculation — Mifflin-St Jeor
    const weightKg = parseFloat(pf.weightLbs) / 2.205 || 0;
    const heightCm = pf.heightFt ? (parseInt(pf.heightFt) * 12 + (parseInt(pf.heightIn) || 0)) * 2.54 : 0;
    const age = parseInt(pf.age) || 25;
    const isFemale = pf.gender === 'Female';
    const bmr = isFemale
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const activityMult = pf.trainingDays === '5' ? 1.725 : 1.55;
    const tdee = Math.round(bmr * activityMult);
    const goalCalAdj = { 'Build Muscle': 250, 'Lose Fat': -450, 'Recomp': 0, 'Get Stronger': 150 };
    const calories = tdee + (goalCalAdj[pf.primaryGoal] || 0);
    const proteinPerLb = { 'Build Muscle': 0.85, 'Lose Fat': 1.1, 'Recomp': 1.0, 'Get Stronger': 0.8 };
    const protein = Math.round((parseFloat(pf.weightLbs) || 160) * (proteinPerLb[pf.primaryGoal] || 0.85));

    // Split based on training days
    const split = pf.trainingDays === '5' ? 'Push / Pull / Legs' : 'Upper / Lower';
    const splitDays = pf.trainingDays === '5' ? '5x / week' : '3x / week';

    // Progression style based on fitness level
    const progression = pf.fitnessLevel === 'Advanced' ? 'Conservative progression'
      : pf.fitnessLevel === 'Intermediate' ? 'Moderate progression'
      : 'Aggressive progression';

    const rows = [
      { icon: '🏋️', label: 'Goal',        value: pf.primaryGoal || 'Build Muscle' },
      { icon: '📅', label: 'Split',       value: `${split} (${splitDays})` },
      { icon: '🔥', label: 'Calories',    value: calories > 0 ? `${calories.toLocaleString()} kcal / day` : 'Set after quiz' },
      { icon: '💪', label: 'Protein',     value: calories > 0 ? `${protein}g / day` : 'Set after quiz' },
      { icon: '⚖️',  label: 'Progression', value: progression },
    ];

    const fadeAnim = new Animated.Value(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    return (
      <View style={[styles.container, { paddingTop: 70, paddingHorizontal: 24 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>YOUR PLAN</Text>
          <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 }}>
            Here's what we{'\n'}built for you 👇
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 28 }}>
            Based on your goals, body, and schedule
          </Text>

          {/* Plan card */}
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#ffffff10', marginBottom: 20 }}>
            {rows.map(({ icon, label, value }, i) => (
              <View key={label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 }}>
                  <Text style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', width: 90 }}>{label}</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' }}>{value}</Text>
                </View>
                {i < rows.length - 1 && <View style={{ height: 1, backgroundColor: '#ffffff08' }} />}
              </View>
            ))}
          </View>

          {/* Calorie breakdown */}
          {calories > 0 && (
            <View style={{ backgroundColor: '#1a1a3a', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#ffffff08' }}>
              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 14 }}>MACRO SPLIT</Text>
              {[
                { label: 'Protein', grams: protein, cal: protein * 4, color: '#60a5fa' },
                { label: 'Carbs',   grams: Math.round((calories - protein * 4 - Math.round(parseFloat(pf.weightLbs || 160) * 0.35) * 9) / 4), cal: calories - protein * 4 - Math.round(parseFloat(pf.weightLbs || 160) * 0.35) * 9, color: '#4ade80' },
                { label: 'Fat',     grams: Math.round(parseFloat(pf.weightLbs || 160) * 0.35), cal: Math.round(parseFloat(pf.weightLbs || 160) * 0.35) * 9, color: '#f59e0b' },
              ].map(({ label, grams, cal, color }) => {
                const pct = Math.round((cal / calories) * 100);
                return (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12 }}>{grams}g · {pct}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#1e1e3a', borderRadius: 3 }}>
                      <View style={{ height: 6, backgroundColor: color, borderRadius: 3, width: `${pct}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 }}>
            These are starting estimates. Your plan adapts as you log workouts and progress over time.
          </Text>
        </ScrollView>

        {/* CTA */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: '#ffffff08' }}>
          <AnimatedPress
            style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            onPress={() => setScreen('quiz')}
            scaleDown={0.96}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Let's Start Training 🚀</Text>
          </AnimatedPress>
        </View>
      </View>
    );
  }

  // ── Quiz Screen ──────────────────────────────────────────
  if (screen === 'quiz') {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: 70 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          ) : <View />}
        </View>
        <LogoutBtn />
        <Text style={styles.title}>Workout Tracker</Text>
        <View style={styles.progress}>
          {QUESTIONS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
          ))}
        </View>
        <Text style={styles.questionText}>{question.label}</Text>
        {question.type === 'text' && (
          <View style={styles.questionCard}>
            <TextInput
              style={styles.input}
              placeholder={question.placeholder}
              placeholderTextColor={COLORS.muted}
              value={textVal}
              onChangeText={setTextVal}
              returnKeyType="next"
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={() => { if (textVal.trim()) handleAnswer(textVal.trim()); }}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
        {question.type === 'choice' && (
          <View style={styles.choices}>
            {question.options.filter(opt => {
              if (opt === 'Building Muscle - Men' && user?.gender === 'Female') return false;
              if (opt === 'Building Muscle - Women' && user?.gender === 'Male') return false;
              return true;
            }).map(opt => {
              const meta = GOAL_META[opt];
              const label = opt === 'Building Muscle - Men' ? "Men's Muscle Building Program\n8 Weeks - 5 Days per Week" : opt === 'Building Muscle - Women' ? "Women's Muscle Building Program\n8 Weeks - 5 Days per Week" : opt;
              const isRecommended = opt.startsWith('Building Muscle');
              return (
                <AnimatedPress key={opt} style={[styles.goalCard, isRecommended && { borderColor: COLORS.accent + '55', shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }, !isRecommended && { opacity: 0.6 }]} onPress={() => handleAnswer(opt)} scaleDown={0.97}>
                  {isRecommended && (
                    <View style={{ position: 'absolute', top: -1, right: 14, backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, zIndex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>RECOMMENDED</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={meta?.iconGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{
                      width: 54, height: 54, borderRadius: 16,
                      justifyContent: 'center', alignItems: 'center',
                      marginRight: 14,
                      shadowColor: meta?.iconColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.7, shadowRadius: 10,
                    }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>{meta?.icon}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{label}</Text>
                    <Text style={styles.goalSubtitle}>{meta?.subtitle}</Text>
                  </View>
                  <Text style={styles.goalChevron}>›</Text>
                </AnimatedPress>
              );
            })}
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ── Nutrition Input Screen ────────────────────────────────
  if (screen === 'nutrition') {
    const activityOptions = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'];
    const allFilled = nutritionForm.age && nutritionForm.gender && nutritionForm.heightFt && nutritionForm.weight && nutritionForm.activityLevel;
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LogoutBtn />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => { setStep(0); setScreen('quiz'); }} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Nutrition Plan</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>

          <View style={styles.questionCard}>
            <Text style={[styles.sectionLabel, { textAlign: 'center', marginBottom: 16 }]}>TDEE Calculator</Text>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput style={styles.input} placeholder="e.g. 25" placeholderTextColor={COLORS.muted}
              keyboardType="number-pad" value={nutritionForm.age}
              onChangeText={v => setNutritionForm(f => ({ ...f, age: v }))} />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.choices}>
              {['Male', 'Female'].map(g => (
                <TouchableOpacity key={g} style={[styles.choiceBtn, nutritionForm.gender === g && styles.choiceBtnActive]}
                  onPress={() => setNutritionForm(f => ({ ...f, gender: g }))}>
                  <Text style={styles.choiceText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Height</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="ft" placeholderTextColor={COLORS.muted}
                keyboardType="number-pad" value={nutritionForm.heightFt}
                onChangeText={v => setNutritionForm(f => ({ ...f, heightFt: v }))} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="in" placeholderTextColor={COLORS.muted}
                keyboardType="number-pad" value={nutritionForm.heightIn}
                onChangeText={v => setNutritionForm(f => ({ ...f, heightIn: v }))} />
            </View>

            <Text style={styles.fieldLabel}>Body Weight (lbs)</Text>
            <TextInput style={styles.input} placeholder="e.g. 180" placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad" value={nutritionForm.weight}
              onChangeText={v => setNutritionForm(f => ({ ...f, weight: v }))} />

            <Text style={styles.fieldLabel}>Activity Level</Text>
            <View style={styles.choices}>
              {activityOptions.map(a => (
                <TouchableOpacity key={a} style={[styles.choiceBtn, nutritionForm.activityLevel === a && styles.choiceBtnActive]}
                  onPress={() => setNutritionForm(f => ({ ...f, activityLevel: a }))}>
                  <Text style={styles.choiceText}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.button, { marginTop: 20, opacity: allFilled ? 1 : 0.4 }]}
              onPress={submitNutrition} disabled={!allFilled}>
              <Text style={styles.buttonText}>Calculate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={restart}>
              <Text style={styles.cancelText}>Start Over</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Nutrition Results Screen ──────────────────────────────
  if (screen === 'nutritionResults' && nutritionResult) {
    const { tdee, cut, bulk, target, proteinG } = nutritionResult;
    const goalCalories = target ?? tdee;
    const pf = profileForm;
    const primaryGoal = pf.primaryGoal || 'Maintain';
    const goalLabel = { 'Build Muscle': 'Bulk', 'Lose Fat': 'Cut', 'Recomp': 'Maintain', 'Get Stronger': 'Maintain' }[primaryGoal] || 'Maintain';
    const displayWeight = pf.weightLbs || nutritionForm.weight;
    const displayActivity = pf.activityLevel || nutritionForm.activityLevel;

    const fatG = Math.round((goalCalories * 0.25) / 9);
    const carbG = Math.round((goalCalories - proteinG * 4 - fatG * 9) / 4);
    const fatCutG = Math.round((cut * 0.25) / 9);
    const carbCutG = Math.round((cut - proteinG * 4 - fatCutG * 9) / 4);
    const fatBulkG = Math.round((bulk * 0.25) / 9);
    const carbBulkG = Math.round((bulk - proteinG * 4 - fatBulkG * 9) / 4);
    const fatMainG = Math.round((tdee * 0.25) / 9);
    const carbMainG = Math.round((tdee - proteinG * 4 - fatMainG * 9) / 4);

    const meals = [
      { name: 'Breakfast', pct: 0.25, foods: ['Eggs or egg whites', 'Oats or whole grain toast', 'Greek yogurt or cottage cheese', 'Fruit'] },
      { name: 'Mid-Morning Snack', pct: 0.10, foods: ['Protein shake', 'Rice cakes with peanut butter', 'Apple or banana'] },
      { name: 'Lunch', pct: 0.25, foods: ['Chicken breast, tuna, or lean beef', 'Brown rice or sweet potato', 'Vegetables & salad', 'Olive oil dressing'] },
      { name: 'Pre-Workout', pct: 0.15, foods: ['Oats with protein powder', 'Banana', 'Light carb source'] },
      { name: 'Post-Workout / Dinner', pct: 0.20, foods: ['Lean protein (chicken, fish, steak)', 'White or brown rice', 'Broccoli or green vegetables'] },
      { name: 'Evening Snack', pct: 0.05, foods: ['Casein protein or cottage cheese', 'Almonds or walnuts'] },
    ];

    return (
      <View style={styles.container}>
        <LogoutBtn />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('quiz')} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Your Nutrition Plan</Text>
          <Text style={styles.subtitle}>{answers.name}{displayWeight ? ` · ${displayWeight} lbs` : ''}{displayActivity ? ` · ${displayActivity}` : ''}</Text>

          {/* Goal target card */}
          <View style={{ backgroundColor: COLORS.accent + '18', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.accent + '40', borderTopColor: COLORS.accent + '70' }}>
            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Your Daily Target · {primaryGoal}</Text>
            <Text style={{ color: COLORS.accent, fontSize: 42, fontWeight: '900', letterSpacing: -1 }}>{goalCalories} <Text style={{ fontSize: 18, fontWeight: '500', color: COLORS.muted }}>kcal</Text></Text>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
              <View>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>PROTEIN</Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{proteinG}g</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>CARBS</Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{carbG}g</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>FAT</Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{fatG}g</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>TDEE</Text>
                <Text style={{ color: COLORS.muted, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{tdee}</Text>
              </View>
            </View>
          </View>

          {/* All scenarios macros table */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Daily Macros Breakdown</Text>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2, textAlign: 'left' }]}>Scenario</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Protein</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Carbs</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Fat</Text>
            </View>
            {[
              { label: 'Maintain', kcal: tdee, protein: proteinG, carbs: carbMainG, fat: fatMainG },
              { label: 'Cut', kcal: cut, protein: proteinG, carbs: carbCutG, fat: fatCutG },
              { label: 'Bulk', kcal: bulk, protein: proteinG, carbs: carbBulkG, fat: fatBulkG },
            ].map((row, i) => {
              const isGoal = row.label === goalLabel;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt, isGoal && { backgroundColor: COLORS.accent + '18' }]}>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'left', color: isGoal ? COLORS.accent : COLORS.text, fontWeight: isGoal ? '700' : '400' }]}>{row.label}{isGoal ? ' ★' : ''}</Text>
                  <Text style={[styles.tableCell, { flex: 2, color: COLORS.accent }]}>{row.protein}g</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.carbs}g</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.fat}g</Text>
                </View>
              );
            })}
          </View>

          {/* Meal Plan */}
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Bodybuilding Meal Plan</Text>
          {meals.map((meal, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.dayTitle}>{meal.name}</Text>
                <Text style={styles.exerciseCount}>{Math.round(goalCalories * meal.pct)} kcal</Text>
              </View>
              {meal.foods.map((f, j) => (
                <Text key={j} style={styles.mealFood}>· {f}</Text>
              ))}
            </View>
          ))}

          <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={restart}>
            <Text style={styles.buttonText}>Start Over</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }


  // ── Rest Timer Screen ────────────────────────────────────
  if (screen === 'restTimer') {
    const progress = restTimerRemaining / restTimerDuration;
    const durations = [30, 60, 90, 120];
    return (
      <View style={[styles.container, { alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => { setRestTimerRunning(false); setScreen('day'); }} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Rest Timer</Text>

        {/* Duration selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {durations.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.pill, { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: restTimerDuration === d ? COLORS.accent : '#3a3a6a' }]}
              onPress={() => { setRestTimerDuration(d); setRestTimerRemaining(d); setRestTimerRunning(false); }}
            >
              <Text style={[styles.pillText, { color: COLORS.text }]}>{d}s</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Circular timer */}
        <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
          <CircularProgress progress={progress} />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ color: COLORS.text, fontSize: 48, fontWeight: 'bold', letterSpacing: 2 }}>
              {formatTime(restTimerRemaining)}
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              {restTimerRemaining === 0 ? 'Done!' : `Remaining`}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity
            style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#2a2a4a', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => { setRestTimerRemaining(restTimerDuration); setRestTimerRunning(false); }}
          >
            <Text style={{ fontSize: 26, color: COLORS.text }}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#4ade80', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setRestTimerRunning(r => !r)}
          >
            {restTimerRunning
              ? <View style={{ flexDirection: 'row', gap: 5 }}>
                  <View style={{ width: 8, height: 26, backgroundColor: '#1a1a2e', borderRadius: 2 }} />
                  <View style={{ width: 8, height: 26, backgroundColor: '#1a1a2e', borderRadius: 2 }} />
                </View>
              : <View style={{ width: 0, height: 0, borderTopWidth: 16, borderBottomWidth: 16, borderLeftWidth: 26, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#1a1a2e', marginLeft: 4 }} />
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#2a2a4a', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => { setRestTimerRemaining(0); setRestTimerRunning(false); }}
          >
            <View style={{ width: 20, height: 20, backgroundColor: COLORS.text, borderRadius: 3 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Settings Screen ───────────────────────────────────────
  if (screen === 'settings') {
    const totalLogEntries = Object.values(logs).reduce((sum, arr) => sum + arr.length, 0);
    const totalVolume = Object.values(logs).reduce((sum, arr) =>
      sum + arr.reduce((s, entry) => {
        const sets = entry.sets || [{ weight: entry.weight, reps: entry.reps }];
        return s + sets.reduce((ss, st) => ss + (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0), 0);
      }, 0)
    , 0);

    const exercisesTracked = Object.keys(logs).filter(k => logs[k].length > 0).length;
    const volumeDisplay = totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k`
      : totalVolume > 0 ? String(Math.round(totalVolume)) : '—';

    return (
      <View style={[styles.container, { paddingTop: 80 }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={() => setScreen(settingsFrom)} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Page header */}
          <View style={{ marginTop: 8, marginBottom: 20 }}>
            <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Settings</Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, marginTop: 4 }}>Account & preferences</Text>
          </View>

          {/* Profile card */}
          <LinearGradient
            colors={['#1e1040', '#0e1630', '#0a0a1a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff35' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: COLORS.accent + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.accent + '55' }}>
                <Text style={{ color: COLORS.accent, fontSize: 24, fontWeight: '900' }}>
                  {(user?.name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800' }}>{user?.name || '—'}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>{user?.email || '—'}</Text>
              </View>
            </View>
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ffffff10', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent }} />
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                <Text style={{ color: COLORS.text, fontWeight: '600' }}>{answers?.goal || '—'}</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* Stats row */}
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>YOUR DATA</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Sessions', value: String(totalLogEntries), color: COLORS.accent },
              { label: 'Volume (lbs)', value: volumeDisplay, color: '#4ade80' },
              { label: 'Exercises', value: String(exercisesTracked), color: COLORS.text },
            ].map(({ label, value, color }) => (
              <View key={label} style={[styles.statCard, { borderTopWidth: 2, borderTopColor: color + '55' }]}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Preferences */}
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>PREFERENCES</Text>
          <View style={{ backgroundColor: COLORS.deep, borderWidth: 1, borderColor: '#ffffff06', borderTopColor: '#ffffff28', borderRadius: 16, marginBottom: 24, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>⏱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}>Rest Timer</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Auto-start after each set</Text>
              </View>
              <Switch
                value={restTimerEnabled}
                onValueChange={v => {
                  setRestTimerEnabled(v);
                  if (user) updateDoc(doc(db, 'users', user.email), { restTimerEnabled: v });
                  if (!v) { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }
                }}
                trackColor={{ false: '#3a3a5a', true: '#4ade80' }}
                thumbColor={restTimerEnabled ? '#fff' : '#aaa'}
              />
            </View>
          </View>

          {/* Danger zone */}
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>DANGER ZONE</Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Reset All Logs',
              'This will permanently delete all your workout history. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset Everything', style: 'destructive', onPress: () => {
                  setLogs({});
                  if (user) updateDoc(doc(db, 'users', user.email), { logs: {}, completedWorkouts: {} });
                }},
              ]
            )}
            style={{ backgroundColor: COLORS.accent + '15', borderWidth: 1, borderColor: COLORS.accent + '40', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.accent, fontSize: 15, fontWeight: '700' }}>Reset All Logs</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Permanently delete workout history</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Week Detail Screen ────────────────────────────────────
  if (screen === 'weekDetail') {
    const workoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
    const completedDays = workoutDays.filter(d =>
      d.exercises.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek))
    ).length;
    const progress = workoutDays.length > 0 ? completedDays / workoutDays.length : 0;

    const totalVolume = workoutDays.reduce((sum, d) =>
      sum + d.exercises.reduce((s, e) => {
        const entry = (logs[logKey(d.day, e)] || []).slice(-1)[0];
        if (!entry) return s;
        const sets = entry.sets || [{ weight: entry.weight, reps: entry.reps }];
        return s + sets.reduce((ss, st) => ss + (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0), 0);
      }, 0)
    , 0);

    const loggedExerciseCount = workoutDays.reduce((sum, d) =>
      sum + d.exercises.filter(e => (logs[logKey(d.day, e)] || []).length > 0).length
    , 0);
    const estimatedMinutes = loggedExerciseCount * 8;
    const timeTrained = estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)} hr ${estimatedMinutes % 60} min`
      : `${estimatedMinutes} min`;

    const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const planDayMap = {};
    (plan || []).forEach(d => {
      const match = DAY_NAMES.findIndex(n => d.day.startsWith(n));
      if (match !== -1) planDayMap[match] = d;
    });

    return (
      <View style={[styles.container, { paddingTop: 70 }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={() => setScreen(weekDetailFrom)} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Big circular progress */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 140, height: 140 }}>
              <CircularProgress progress={progress} size={140} strokeWidth={10} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: COLORS.muted, fontSize: 13 }}>Week <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{currentWeek}</Text> of {TOTAL_WEEKS}</Text>
                <Text style={{ color: '#4ade80', fontSize: 28, fontWeight: 'bold' }}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Current Week</Text>
          </View>

          {/* Stats section */}
          <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Workout Progress</Text>

          {[
            { label: 'Workouts Completed', value: `${completedDays} / ${workoutDays.length}` },
            { label: 'Total Volume', value: totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '—' },
            { label: 'Time Trained', value: estimatedMinutes > 0 ? timeTrained : '—' },
          ].map(({ label, value }) => (
            <View key={label} style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff30', borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
              <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold' }}>{value}</Text>
            </View>
          ))}

          {/* Weekly day bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }}>
            {DAY_LABELS.map((label, i) => {
              const d = planDayMap[i];
              const isRest = !d || d.day.includes('Rest');
              const isDone = d && d.exercises.some(e => (logs[logKey(d.day, e)] || []).length > 0);
              const barColor = isRest ? '#2a2a4a' : isDone ? '#4ade80' : '#3a3a5a';
              return (
                <View key={label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4 }}>{label}</Text>
                  <View style={{ width: '80%', height: 6, borderRadius: 3, backgroundColor: barColor }} />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Plan Preview Screen (first-time onboarding) ──────────
  if (screen === 'plan-preview') {
    const isWomen = answers?.goal === 'Building Muscle - Women';
    const workoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
    const DAY_ICONS = { 'Upper Body': '💪', 'Lower Body': '🦵', 'Push Day': '🏋️', 'Pull Day': '🔙', 'Leg Day': '🦵', 'Glutes': '🍑', 'Back': '🔙' };
    const getDayIcon = (dayStr) => {
      const label = dayStr.split('–')[1]?.trim() || '';
      return Object.entries(DAY_ICONS).find(([k]) => label.includes(k))?.[1] || '🏃';
    };
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 8 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>💪</Text>
            <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }}>
              Your {isWomen ? "Women's" : "Men's"} Program
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              8-week progressive overload plan • 5 workout days/week
            </Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Weeks', value: '8' },
              { label: 'Days / Week', value: '5' },
              { label: 'Exercises', value: String(workoutDays.reduce((acc, d) => acc + d.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk')).length, 0)) },
            ].map(({ label, value }) => (
              <View key={label} style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff20' }}>
                <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Workout day cards */}
          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 }}>WEEKLY SPLIT</Text>
          {workoutDays.map((d, i) => {
            const label = d.day.split('–')[1]?.trim() || d.day;
            const dayName = d.day.split('–')[0]?.trim() || '';
            const exs = d.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk'));
            return (
              <View key={i} style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff18' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{getDayIcon(d.day)}</Text>
                  <View>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{label}</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>{dayName} • {exs.length} exercises</Text>
                  </View>
                </View>
                {exs.map((e, j) => {
                  const clean = cleanExerciseName(e);
                  const sr = parseSetsReps(e);
                  return (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: j === 0 ? 0 : 1, borderTopColor: '#ffffff08' }}>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', width: 20 }}>{String(j + 1).padStart(2, '0')}</Text>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{clean}</Text>
                      {sr && <Text style={{ color: COLORS.muted, fontSize: 12 }}>{sr.sets}×{sr.reps}</Text>}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Rest days note */}
          <View style={{ backgroundColor: '#0c0c1e', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ffffff06', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>💤</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>
              Wednesday & Sunday are rest days with optional light stretching and foam rolling.
            </Text>
          </View>

        </ScrollView>

        {/* Continue button pinned to bottom */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: '#ffffff08' }}>
          <TouchableOpacity
            onPress={() => setScreen('plan')}
            style={{ backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Continue to Workout →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={restart} style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Plan Overview Screen ─────────────────────────────────
  if (screen === 'plan') {
    return (
      <View style={[styles.container, { paddingTop: 70 }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={restart} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Workout Plan</Text>

        {/* Rest Timer Banner */}
        {restTimerEnabled && restTimerRunning && (
          <View style={styles.restBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>⏻  REST TIMER</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 }} numberOfLines={1}>
                {restingForExercise ? cleanExerciseName(restingForExercise) : 'Resting'}{' '}
                <Text style={{ color: '#4ade80' }}>• {formatTime(restTimerRemaining)}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                  onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }}
                >
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                  onPress={() => setRestTimerRemaining(r => Math.min(r + 30, restTimerDuration))}
                >
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>+30s</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 3, backgroundColor: '#1a2a1a', borderRadius: 2 }}>
              <View style={{ height: 3, backgroundColor: '#4ade80', borderRadius: 2, width: `${(restTimerRemaining / restTimerDuration) * 100}%` }} />
            </View>
          </View>
        )}

        {/* Next Action Card */}
        <NextActionCard />

        {/* Week Tracker Card */}
        <WeekTrackerCard />

        <FlatList
          data={plan}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <DayCard
              item={item}
              currentWeek={currentWeek}
              logs={logs}
              completedWorkouts={completedWorkouts}
              onPress={() => { setSelectedDay(item); setActiveExerciseIndex(0); setRestTimerRunning(false); setRestingForExercise(null); setScreen('day'); }}
            />
          )}
        />
      </View>
    );
  }

  // ── Day Detail Screen ────────────────────────────────────
  if (screen === 'day') {
    const dayIndex = plan ? plan.findIndex(d => d.day === selectedDay.day) : -1;
    const isRestDay = selectedDay.day.includes('Rest');
    const workoutExercises = isRestDay
      ? []
      : selectedDay.exercises.filter(e =>
          !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
        );
    const loggedCount = workoutExercises.filter(e => (logs[logKey(selectedDay.day, e)] || []).some(en => en.programWeek === currentWeek)).length;
    const totalExercises = workoutExercises.length;
    const progressFraction = totalExercises > 0 ? loggedCount / totalExercises : 0;
    const estimatedMinutes = totalExercises * 8;

    function getSmartPill(exerciseName) {
      const data = logs[logKey(selectedDay.day, exerciseName)] || [];
      if (data.length === 0) return null;
      const latest = parseFloat(data[data.length - 1].weight);
      const allTime = Math.max(...data.map(d => parseFloat(d.weight)));
      const prev = data.length > 1 ? parseFloat(data[data.length - 2].weight) : null;
      if (data.length > 1 && latest >= allTime && latest > prev) {
        return { label: `🏆 PR: ${latest} lbs`, color: '#fbbf24', bg: '#3a2a00', border: '#fbbf24' };
      }
      if (prev !== null && latest > prev) {
        return { label: `↑ +${(latest - prev).toFixed(0)} lbs`, color: '#4ade80', bg: '#1a3a2a', border: '#4ade80' };
      }
      return { label: `∿ Last: ${latest} lbs`, color: COLORS.muted, bg: '#2a2a4a', border: null };
    }

    const DAY_NAMES_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isToday = selectedDay.day.startsWith(DAY_NAMES_DAY[new Date().getDay()]);
    const workoutLabel = isRestDay
      ? 'Rest & Recovery'
      : selectedDay.day.split('–').map(s => s.trim())[1] || selectedDay.day;

    return (
      <View style={[styles.container, { paddingTop: 80 }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={() => setScreen('plan')} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        {/* Action-driven header */}
        <View style={{ marginTop: 8, marginBottom: 14 }}>
          {/* Context badge */}
          {isToday && !isRestDay && (
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <View style={{ backgroundColor: COLORS.accent + '20', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.accent + '50' }}>
                <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>🔥  TODAY</Text>
              </View>
            </View>
          )}
          {isToday && isRestDay && (
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <View style={{ backgroundColor: '#4a558020', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#4a558050' }}>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>💤  TODAY</Text>
              </View>
            </View>
          )}

          {/* Workout name + day nav arrows inline */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32, flex: 1 }}>
              {workoutLabel}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { if (dayIndex > 0) { setSelectedDay(plan[dayIndex - 1]); setActiveExerciseIndex(0); } }}
                style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: dayIndex > 0 ? 1 : 0.35 }}>
                <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', lineHeight: 26 }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (plan && dayIndex < plan.length - 1) { setSelectedDay(plan[dayIndex + 1]); setActiveExerciseIndex(0); } }}
                style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: plan && dayIndex < plan.length - 1 ? 1 : 0.35 }}>
                <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', lineHeight: 26 }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action / status line */}
          {!isRestDay && progressFraction === 0 && (
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>
              Start your workout · {totalExercises} exercises · ~{estimatedMinutes} min
            </Text>
          )}
          {!isRestDay && progressFraction > 0 && progressFraction < 1 && (
            <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '600' }}>
              {loggedCount} of {totalExercises} done — keep going 💪
            </Text>
          )}
          {!isRestDay && progressFraction >= 1 && (
            <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '600' }}>
              All exercises logged ✓
            </Text>
          )}
          {isRestDay && (
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>
              Recovery is part of the programme.
            </Text>
          )}
        </View>

        {/* Week Tracker + Progress Ring row */}
        {!isRestDay && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setWeekDetailFrom('day'); setScreen('weekDetail'); }}
              style={{ flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff30', borderRadius: 16, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 15 }}>Week {currentWeek}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>of {TOTAL_WEEKS}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => setCurrentWeek(w => Math.max(1, w - 1))} style={{ width: 24, height: 24, borderRadius: 5, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek > 1 ? 1 : 0.35 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', lineHeight: 19 }}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCurrentWeek(w => Math.min(TOTAL_WEEKS, w + 1))} style={{ width: 24, height: 24, borderRadius: 5, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek < TOTAL_WEEKS ? 1 : 0.35 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', lineHeight: 19 }}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <AnimatedProgressBar
                progress={((currentWeek - 1) / TOTAL_WEEKS + (workoutExercises.filter(e => (logs[logKey(selectedDay.day, e)] || []).some(en => en.programWeek === currentWeek)).length / Math.max(workoutExercises.length, 1)) / TOTAL_WEEKS)}
                height={4} color={COLORS.accent} trackColor="#2a2a4a" style={{ marginBottom: 6 }}
              />
              <Text style={{ color: COLORS.muted, fontSize: 11 }}>
                <Text style={{ color: COLORS.text, fontWeight: '600' }}>{loggedCount} / {totalExercises}</Text> Exercises Logged
              </Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 70, height: 70 }}>
              <CircularProgress progress={progressFraction} size={70} strokeWidth={6} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: 'bold' }}>{Math.round(progressFraction * 100)}%</Text>
                <Text style={{ color: COLORS.muted, fontSize: 9 }}>Complete</Text>
              </View>
            </View>
          </View>
        )}

        {/* Inline rest banner — always visible on workout days */}
        {!isRestDay && restTimerEnabled && (() => {
          const activeEx = workoutExercises[activeExerciseIndex] ?? workoutExercises[0];
          const bannerName = restTimerRunning && restingForExercise
            ? cleanExerciseName(restingForExercise)
            : activeEx ? cleanExerciseName(activeEx) : '';
          const suggested = activeEx ? getRestSuggestion(activeEx) : 60;
          const progressWidth = restTimerRunning
            ? `${(restTimerRemaining / restTimerDuration) * 100}%`
            : '0%';

          return (
            <View style={styles.restBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>⏻  REST TIMER</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 }} numberOfLines={1}>
                  {bannerName}{' '}
                  <Text style={{ color: '#4ade80' }}>
                    {restTimerRunning ? `• ${formatTime(restTimerRemaining)}` : `• ${formatTime(suggested)}`}
                  </Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {restTimerRunning ? (
                    <>
                      <TouchableOpacity
                        style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                        onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Skip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                        onPress={() => setRestTimerRemaining(r => Math.min(r + 30, restTimerDuration))}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>+30s</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 }}
                      onPress={() => {
                        setRestingForExercise(activeEx);
                        setRestTimerDuration(suggested);
                        setRestTimerRemaining(suggested);
                        setRestTimerRunning(true);
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={{ height: 3, backgroundColor: '#1a2a1a', borderRadius: 2 }}>
                <View style={{ height: 3, backgroundColor: '#4ade80', borderRadius: 2, width: progressWidth }} />
              </View>
            </View>
          );
        })()}

        {/* Stretch timer banner — rest days */}
        {isRestDay && (() => {
          const suggested = (restingForExercise && restingForExercise !== 'rest' && restTimerDuration > 0) ? restTimerDuration : 45;
          const progressWidth = restTimerRunning ? `${(restTimerRemaining / restTimerDuration) * 100}%` : '0%';
          return (
            <View style={styles.restBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>⏻  STRETCH TIMER</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 }} numberOfLines={1}>
                  {restingForExercise && restingForExercise !== 'rest' ? restingForExercise : 'Forward Fold'}{' '}
                  <Text style={{ color: '#4ade80' }}>
                    {restTimerRunning ? `• ${formatTime(restTimerRemaining)}` : `• ${formatTime(suggested)}`}
                  </Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {restTimerRunning ? (
                    <>
                      <TouchableOpacity
                        style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                        onPress={() => setRestTimerRunning(false)}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Pause</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                        onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(restTimerDuration); }}
                      >
                        <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Reset</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 }}
                      onPress={() => {
                        if (!restingForExercise || restingForExercise === 'rest') {
                          setRestingForExercise('Forward Fold');
                          setRestTimerDuration(45);
                          setRestTimerRemaining(45);
                          setStretchEachSide(false);
                        } else {
                          setRestTimerRemaining(restTimerDuration);
                        }
                        setRestTimerRunning(true);
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={{ height: 3, backgroundColor: '#1a2a1a', borderRadius: 2 }}>
                <View style={{ height: 3, backgroundColor: '#4ade80', borderRadius: 2, width: progressWidth }} />
              </View>
            </View>
          );
        })()}

        <View style={{ flex: 1 }}>
          <FlatList
            data={selectedDay.exercises}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => {
              const entryLogs = logs[logKey(selectedDay.day, item)] || [];
              const thisWeekLogs = entryLogs.filter(e => e.programWeek === currentWeek);
              const isStretching = item.includes('Full Body Stretching');
              const isFoamRolling = item.includes('Full Body Foam Rolling');
              const isResting = restTimerRunning && restingForExercise === item;
              const isActive = !isRestDay && !isStretching && !isFoamRolling && index === activeExerciseIndex;
              const isLogged = !isStretching && !isFoamRolling && !isRestDay && thisWeekLogs.length > 0;
              const sr = parseSetsReps(item);
              const smartPill = (!isStretching && !isFoamRolling && !isRestDay) ? getSmartPill(item) : null;
              const restSecs = (!isStretching && !isFoamRolling && !isRestDay) ? getRestSuggestion(item) : null;
              const restLabel = restSecs === 180 ? '3 min rest' : restSecs === 60 ? '1 min rest' : null;
              const foamRollingItems = [
                { label: 'Upper Back', duration: '1 min', emoji: '🔵' },
                { label: 'Lats', duration: '45 sec each side', emoji: '🔵' },
                { label: 'Glutes', duration: '45 sec each side', emoji: '🔵' },
                { label: 'Hamstrings', duration: '1 min', emoji: '🔵' },
                { label: 'Quads', duration: '1 min', emoji: '🔵' },
                { label: 'Calves', duration: '45 sec each side', emoji: '🔵' },
              ];
              const stretchingItems = [
                { label: 'Forward Fold', duration: '45 sec', img: require('./assets/stretches/forward-fold.jpg') },
                { label: 'Hip Flexor', duration: '45 sec each side', img: require('./assets/stretches/hip-flexor.jpg') },
                { label: 'Figure 4', duration: '45 sec each side', img: require('./assets/stretches/figure-4.jpg') },
                { label: "Child's Pose", duration: '1 min', img: require('./assets/stretches/childs-pose.jpg') },
                { label: 'Chest Stretch', duration: '45 sec each side', img: require('./assets/stretches/chest-stretch.jpg') },
                { label: 'Spinal Twist', duration: '45 sec each side', img: require('./assets/stretches/spinal-twist.jpg') },
                { label: 'Deep Squat', duration: '1 min', img: require('./assets/stretches/Deep Squat.jpg') },
              ];
              return (
                <TouchableOpacity
                  style={[styles.exerciseCard, { position: 'relative' }, isLogged && { backgroundColor: '#191932', borderTopColor: '#4ade8028', shadowColor: '#4ade80', shadowOpacity: 0.08, shadowRadius: 8 }, isActive && { borderLeftWidth: 3, borderLeftColor: COLORS.accent, shadowColor: COLORS.accent, shadowOpacity: 0.12, shadowRadius: 10 }, isResting && { borderColor: '#4ade8044', borderWidth: 1, shadowColor: '#4ade80', shadowOpacity: 0.1, shadowRadius: 10 }]}
                  onPress={() => {
                    if (!isStretching && !isFoamRolling && !isRestDay) {
                      setSelectedExercise(item);
                      setActiveExerciseIndex(index);
                      const sr = parseSetsReps(item);
                      const count = sr ? parseInt(sr.sets) : 3;
                      const lastLogs = logs[logKey(selectedDay.day, item)] || [];
                      const weekEntryCard = lastLogs.find(en => en.programWeek === currentWeek);
                      const lastEntry = lastLogs.length > 0 ? lastLogs[lastLogs.length - 1] : null;
                      const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
                      const set1Weight = lastEntry?.sets?.[0]?.weight || lastEntry?.weight || '';
                      setSessionSets(Array.from({ length: count }, (_, idx) => ({
                        weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || '',
                        reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
                        completed: false,
                      })));
                      setScreen('progress');
                      if (set1Weight && !weekEntryCard) { savedDismissRef.current = { index: null }; setWeightPickerIndex(0); setWeightPickerVisible(true); }
                    }
                  }}
                  activeOpacity={(isStretching || isFoamRolling || isRestDay) ? 1 : 0.75}
                >
                  {!isStretching && !isFoamRolling && !isRestDay && thisWeekLogs.length > 0 && (
                    <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#000', fontSize: 12, fontWeight: '800', lineHeight: 15 }}>✓</Text>
                    </View>
                  )}
                  <View style={[styles.exerciseCardTop, (isStretching || isFoamRolling) && { justifyContent: 'center' }]}>
                    {!isStretching && !isFoamRolling && <ExerciseImage exerciseName={item} exerciseDbImages={exerciseDbImages} />}
                    <View style={[styles.exerciseCardInfo, (isStretching || isFoamRolling) && { alignItems: 'center' }]}>
                      {!isStretching && !isFoamRolling && !isRestDay && (
                        <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3, opacity: 0.7 }}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      )}
                      <Text style={styles.exerciseName}>{cleanExerciseName(item)}</Text>
                      {sr && (
                        <View style={styles.pillRow}>
                          <View style={styles.pill}><Text style={styles.pillText}>{sr.sets} sets</Text></View>
                          <View style={styles.pill}><Text style={styles.pillText}>{sr.reps} reps</Text></View>
                          {smartPill && (
                            <View style={[styles.pill, { backgroundColor: smartPill.bg, borderWidth: smartPill.border ? 1 : 0, borderColor: smartPill.border || 'transparent' }]}>
                              <Text style={[styles.pillText, { color: smartPill.color }]}>{smartPill.label}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      {!isRestDay && !isStretching && !isFoamRolling && (
                        isResting
                          ? <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 }}>Resting • {formatTime(restTimerRemaining)}</Text>
                          : (() => {
                              if (thisWeekLogs.length === 0) {
                                return <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Tap to log</Text>;
                              }
                              const last = thisWeekLogs[thisWeekLogs.length - 1];
                              const sets = last.sets || [{ weight: last.weight, reps: last.reps }];
                              const w = sets[0]?.weight;
                              const summary = w ? `${sets.length} sets · ${w} lbs` : `${sets.length} sets logged`;
                              return <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{summary}</Text>;
                            })()
                      )}
                      {restLabel && !isResting && (
                        <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>⏱ {restLabel}</Text>
                      )}
                    </View>
                    {!isStretching && !isFoamRolling && !isRestDay && (
                      <Text style={[styles.chevron, { fontSize: 22, color: COLORS.muted }]}>›</Text>
                    )}
                  </View>
                  {isFoamRolling && (
                    <View style={styles.stretchGrid}>
                      {foamRollingItems.map((s, i) => (
                        <TouchableOpacity key={i} style={styles.stretchItem} onPress={() => {
                          const secs = parseDurationToSecs(s.duration);
                          setRestingForExercise(s.label);
                          setRestTimerDuration(secs);
                          setRestTimerRemaining(secs);
                          setRestTimerRunning(false);
                          setStretchEachSide(s.duration.includes('each side'));
                        }}>
                          <Text style={styles.stretchEmoji}>{s.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stretchLabel}>{s.label}</Text>
                            <Text style={styles.stretchDuration}>{s.duration}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {isStretching && (
                    <View style={styles.stretchGrid}>
                      {stretchingItems.map((s, i) => (
                        <TouchableOpacity key={i} style={styles.stretchItem} onPress={() => {
                          const secs = parseDurationToSecs(s.duration);
                          setRestingForExercise(s.label);
                          setRestTimerDuration(secs);
                          setRestTimerRemaining(secs);
                          setRestTimerRunning(false);
                          setStretchEachSide(s.duration.includes('each side'));
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stretchLabel}>{s.label}</Text>
                            <Text style={styles.stretchDuration}>{s.duration}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>


        <Modal visible={!!stretchImgModal} transparent animationType="fade">
          <TouchableOpacity style={styles.imgModalOverlay} onPress={() => setStretchImgModal(null)} activeOpacity={1}>
            <View style={styles.imgModalCard}>
              <Image source={stretchImgModal?.img} style={{ width: '100%', height: 280, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} resizeMode="cover" />
              <View style={styles.imgModalTextBox}>
                <Text style={styles.imgModalTitle}>{stretchImgModal?.label}</Text>
                <Text style={styles.imgModalNotes}>{stretchImgModal?.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {renderDayCompleteModal()}

        {/* Switch Sides Flash */}
        <Modal visible={showSwitchSides} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 20, paddingVertical: 36, paddingHorizontal: 48, alignItems: 'center', borderWidth: 1, borderColor: '#4ade8044' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔄</Text>
              <Text style={{ color: '#4ade80', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 }}>Switch Sides</Text>
            </View>
          </View>
        </Modal>

        {/* Complete Workout button on day screen */}
        {(() => {
          const wKey = `${selectedDay?.day}|${currentWeek}`;
          const dayAllLogged = !isRestDay && totalExercises > 0 && loggedCount === totalExercises;
          if (!dayAllLogged && !showCompleteButton) return null;
          const done = !!completedWorkouts[wKey];

          const markDone = () => {
            if (done) { setShowDayComplete(true); return; }
            const updated = { ...completedWorkouts, [wKey]: true };
            setCompletedWorkouts(updated);
            if (user) updateDoc(doc(db, 'users', user.email), { completedWorkouts: updated });
            setShowCompleteButton(false);
            setShowDayComplete(true);
            setRestTimerRunning(false);
            setRestTimerRemaining(0);
            setRestingForExercise(null);
            setTimeout(() => {
              setWorkoutChip(true);
              Animated.parallel([
                Animated.timing(chipFade, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(chipScale, { toValue: 1, speed: 60, bounciness: 8, useNativeDriver: true }),
              ]).start();
            }, 2000);
          };

          if (done && workoutChip) {
            return (
              <Animated.View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', opacity: chipFade, transform: [{ scale: chipScale }] }}>
                <TouchableOpacity onPress={() => setShowDayComplete(true)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.deep, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#4ade8040', borderTopColor: '#4ade8070', shadowColor: '#4ade80', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', lineHeight: 14 }}>✓</Text>
                  </View>
                  <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>Workout Complete</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          }

          return (
            <View style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
              <AnimatedPress
                style={{ backgroundColor: done ? '#12221a' : '#4ade80', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: done ? 1 : 0, borderColor: '#4ade8055', shadowColor: '#4ade80', shadowOpacity: done ? 0.1 : 0.35, shadowRadius: 14, elevation: done ? 4 : 8 }}
                onPress={markDone}
                scaleDown={0.95}
              >
                <Text style={{ color: done ? '#4ade80' : '#000', fontWeight: '800', fontSize: 16 }}>{done ? 'Workout Completed' : 'Complete Workout'}</Text>
                <Text style={{ color: done ? '#4ade80' : '#000', fontSize: 16, fontWeight: '800' }}>✓</Text>
              </AnimatedPress>
            </View>
          );
        })()}

      </View>
    );
  }

  // ── Progress Screen ──────────────────────────────────────
  if (screen === 'progress') {
    const data = logs[logKey(selectedDay.day, selectedExercise)] || [];
    const thisWeekData = data.filter(e =>
      e.programWeek !== undefined ? e.programWeek === currentWeek : e.week === currentWeek
    );
    const hasThisWeekLog = thisWeekData.length > 0;
    const maxLoggedWeek = data.length > 0
      ? Math.max(...data.map(en => en.programWeek))
      : 0;
    const canLogThisWeek = currentWeek <= maxLoggedWeek + 1;

    const allWorkoutLogged = (() => {
      const dayExs = (selectedDay?.exercises || []).filter(e =>
        !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
      );
      return dayExs.length > 0 && dayExs.every(e =>
        (logs[logKey(selectedDay.day, e)] || []).some(en =>
          en.programWeek === currentWeek
        )
      );
    })();
    const shouldShowCompleteBtn = allWorkoutLogged;
    const best = data.length > 0
      ? Math.max(...data.map(en => {
          const sets = en.sets || [{ weight: en.weight }];
          return Math.max(...sets.map(s => parseFloat(s.weight) || 0));
        }))
      : null;
    const prevWeekData = data.filter(e => e.programWeek === currentWeek - 1);
    const thisWeekLatest = thisWeekData.length > 0 ? (thisWeekData[thisWeekData.length - 1].sets?.[0]?.weight || thisWeekData[thisWeekData.length - 1].weight) : null;
    const prevWeekLatest = prevWeekData.length > 0 ? (prevWeekData[prevWeekData.length - 1].sets?.[0]?.weight || prevWeekData[prevWeekData.length - 1].weight) : null;
    const weekChange = (thisWeekLatest && prevWeekLatest) ? (parseFloat(thisWeekLatest) - parseFloat(prevWeekLatest)).toFixed(1) : null;

    const dayExercises = (selectedDay?.exercises || []).filter(e =>
      !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
    );
    const exIdx = dayExercises.indexOf(selectedExercise);

    function resetSetsForWeek(newWeek) {
      const sr = parseSetsReps(selectedExercise);
      const count = sr ? parseInt(sr.sets) : 3;
      const allLogs = logs[logKey(selectedDay.day, selectedExercise)] || [];
      const weekEntry = allLogs.find(en =>
        en.programWeek === newWeek
      );
      const lastEntry = weekEntry || (allLogs.length > 0 ? allLogs[allLogs.length - 1] : null);
      const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
      const set1Weight = lastEntry?.sets?.[0]?.weight || lastEntry?.weight || '';
      setSessionSets(Array.from({ length: count }, (_, idx) => ({
        weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || '',
        reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
        completed: false,
      })));
      if (set1Weight && !weekEntry) { savedDismissRef.current = { index: null }; setWeightPickerIndex(0); setWeightPickerVisible(true); }
    }

    function navigateExercise(newIdx) {
      const newEx = dayExercises[newIdx];
      setSelectedExercise(newEx);
      setActiveExerciseIndex(newIdx);
      const sr = parseSetsReps(newEx);
      const count = sr ? parseInt(sr.sets) : 3;
      const lastLogs = logs[logKey(selectedDay.day, newEx)] || [];
      const weekEntryNav = lastLogs.find(en => en.programWeek === currentWeek);
      const lastEntry = lastLogs.length > 0 ? lastLogs[lastLogs.length - 1] : null;
      const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
      const set1Weight = lastEntry?.sets?.[0]?.weight || lastEntry?.weight || '';
      setSessionSets(Array.from({ length: count }, (_, idx) => ({
        weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || '',
        reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
        completed: false,
      })));
      if (set1Weight && !weekEntryNav) { savedDismissRef.current = { index: null }; setWeightPickerIndex(0); setWeightPickerVisible(true); }
    }

    return (
      <View style={styles.container}>
        <LogoutBtn />
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setScreen('day')} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Week selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.deep, borderWidth: 1, borderColor: '#ffffff06', borderTopColor: '#ffffff28', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => { const w = Math.max(1, currentWeek - 1); setCurrentWeek(w); resetSetsForWeek(w); }} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek > 1 ? 1 : 0.35 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 15 }}>
              Week <Text style={{ color: COLORS.text }}>{currentWeek}</Text>
              <Text style={{ color: COLORS.muted, fontWeight: 'normal', fontSize: 13 }}> of {TOTAL_WEEKS}</Text>
            </Text>
            <TouchableOpacity onPress={() => { const w = Math.min(TOTAL_WEEKS, currentWeek + 1); setCurrentWeek(w); resetSetsForWeek(w); }} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek < TOTAL_WEEKS ? 1 : 0.35 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.deep, borderWidth: 1, borderColor: '#ffffff06', borderTopColor: '#ffffff28', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => exIdx > 0 && navigateExercise(exIdx - 1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: exIdx > 0 ? 1 : 0.35 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 15, flex: 1, textAlign: 'center', paddingHorizontal: 8 }} numberOfLines={1}>
              <Text style={{ color: COLORS.text }}>{cleanExerciseName(selectedExercise)}</Text>
              <Text style={{ color: COLORS.muted, fontWeight: 'normal', fontSize: 13 }}> ({exIdx + 1}/{dayExercises.length})</Text>
            </Text>
            <TouchableOpacity onPress={() => exIdx < dayExercises.length - 1 && navigateExercise(exIdx + 1)} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: exIdx < dayExercises.length - 1 ? 1 : 0.35 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Rest timer banner */}
          {restTimerEnabled && (() => {
            const suggested = getRestSuggestion(selectedExercise);
            const progressWidth = restTimerRunning ? `${(restTimerRemaining / restTimerDuration) * 100}%` : '0%';
            return (
              <View style={[styles.restBanner, { marginBottom: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>⏻  REST TIMER</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 }} numberOfLines={1}>
                    {cleanExerciseName(selectedExercise)}{' '}
                    <Text style={{ color: '#4ade80' }}>
                      {restTimerRunning ? `• ${formatTime(restTimerRemaining)}` : `• ${formatTime(suggested)}`}
                    </Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {restTimerRunning ? (
                      <>
                        <TouchableOpacity
                          style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                          onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 }}
                          onPress={() => setRestTimerRemaining(r => Math.min(r + 30, restTimerDuration))}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>+30s</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={{ backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 }}
                        onPress={() => {
                          setRestingForExercise(selectedExercise);
                          setRestTimerDuration(suggested);
                          setRestTimerRemaining(suggested);
                          setRestTimerRunning(true);
                        }}
                      >
                        <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>Start</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ height: 3, backgroundColor: '#1a2a1a', borderRadius: 2 }}>
                  <View style={{ height: 3, backgroundColor: '#4ade80', borderRadius: 2, width: progressWidth }} />
                </View>
              </View>
            );
          })()}

          {/* Header */}
          <View style={styles.progressHeader}>
            <ExerciseImage exerciseName={selectedExercise} exerciseDbImages={exerciseDbImages} size={160} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title2}>{cleanExerciseName(selectedExercise)}</Text>
              {parseSetsReps(selectedExercise) && (
                <View style={[styles.pillRow, { marginTop: 6 }]}>
                  <View style={styles.pill}><Text style={styles.pillText}>{parseSetsReps(selectedExercise).sets} sets</Text></View>
                  <View style={styles.pill}><Text style={styles.pillText}>{parseSetsReps(selectedExercise).reps} reps</Text></View>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          {data.length > 0 && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderTopColor: '#f59e0b55' }]}>
                <Text style={{ fontSize: 14, marginBottom: 4 }}>🏆</Text>
                <Text style={styles.statValue}>{best ? `${best}` : '—'}</Text>
                <Text style={styles.statLabel}>Personal Best</Text>
              </View>
              <View style={[styles.statCard, weekChange !== null ? { borderTopColor: parseFloat(weekChange) >= 0 ? '#4ade8055' : '#e9456055' } : {}]}>
                <Text style={{ fontSize: 14, marginBottom: 4 }}>📈</Text>
                <Text style={[styles.statValue, {
                  color: weekChange === null ? COLORS.muted : parseFloat(weekChange) >= 0 ? COLORS.success : COLORS.accent
                }]}>
                  {weekChange === null ? (thisWeekData.length > 0 ? 'First' : '—') : `${parseFloat(weekChange) >= 0 ? '+' : ''}${weekChange}`}
                </Text>
                <Text style={styles.statLabel}>vs Last Week</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={{ fontSize: 14, marginBottom: 4 }}>📊</Text>
                <Text style={styles.statValue}>{data.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
            </View>
          )}


          {/* Log Sets */}
          {!hasThisWeekLog && !canLogThisWeek && (
            <View style={{ backgroundColor: COLORS.deep, borderWidth: 1, borderColor: '#ffffff10', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 22 }}>🔒</Text>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>Week {currentWeek} Locked</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center' }}>
                Complete Week {maxLoggedWeek + 1} first before logging this week.
              </Text>
            </View>
          )}
          {!hasThisWeekLog && canLogThisWeek && <View style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff35', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>Log Sets</Text>
                {(() => {
                  const lastSet1 = data.length > 0 ? (data[data.length - 1]?.sets?.[0] || { weight: data[data.length - 1]?.weight, reps: data[data.length - 1]?.reps }) : null;
                  if (!lastSet1?.weight || sessionSets[0]?.completed) return null;
                  return <Text style={{ color: COLORS.muted, fontSize: 12 }}>⭐ Set 1 Suggestion: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{lastSet1.weight} lbs × {lastSet1.reps} reps</Text></Text>;
                })()}
              </View>
              <TouchableOpacity
                onPress={() => {
                  const sr = parseSetsReps(selectedExercise);
                  const count = sr ? parseInt(sr.sets) : 3;
                  const lastLogs = logs[logKey(selectedDay.day, selectedExercise)] || [];
                  const lastEntry = lastLogs.length > 0 ? lastLogs[lastLogs.length - 1] : null;
                  const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
                  const set1Weight = lastEntry?.sets?.[0]?.weight || lastEntry?.weight || '';
                  setSessionSets(Array.from({ length: count }, (_, idx) => ({
                    weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || '',
                    reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
                    completed: false,
                  })));
                  if (set1Weight) { savedDismissRef.current = { index: null }; setWeightPickerIndex(0); setWeightPickerVisible(true); }
                }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
            </View>
            {/* Completed sets summary */}
            {sessionSets.filter(s => s.completed).length > 0 && (
              <View style={{ marginBottom: 16 }}>
                {sessionSets.map((set, i) => set.completed ? (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#4ade8012', borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#4ade8030' }}>
                    <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Set {i + 1}</Text>
                    <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '700' }}>{set.weight} lbs × {set.reps} reps</Text>
                    <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700' }}>✓</Text>
                  </View>
                ) : null)}
              </View>
            )}

            {/* Active set */}
            {(() => {
              const activeIndex = sessionSets.findIndex(s => !s.completed);
              if (activeIndex === -1) return null;
              const set = sessionSets[activeIndex];
              return (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 16 }}>
                    SET {activeIndex + 1} OF {sessionSets.length}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
                    <TouchableOpacity
                      onPress={() => { setWeightPickerIndex(activeIndex); setWeightPickerVisible(true); }}
                      style={{ backgroundColor: '#2a2a4a', borderRadius: 16, width: 120, height: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: set.weight ? COLORS.accent : '#ffffff15' }}>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>WEIGHT</Text>
                      <Text style={{ color: set.weight ? COLORS.text : COLORS.muted, fontSize: 28, fontWeight: '800' }}>{set.weight || '—'}</Text>
                      {activeIndex > 0 && sessionSets[activeIndex - 1]?.weight ? (
                        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600' }}>prev {sessionSets[activeIndex - 1].weight} lbs</Text>
                      ) : (
                        <Text style={{ color: COLORS.muted, fontSize: 11 }}>lbs</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setRepsPickerIndex(activeIndex); setRepsPickerVisible(true); }}
                      style={{ backgroundColor: '#2a2a4a', borderRadius: 16, width: 120, height: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: set.reps ? COLORS.accent : '#ffffff15' }}>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>REPS</Text>
                      <Text style={{ color: set.reps ? COLORS.text : COLORS.muted, fontSize: 28, fontWeight: '800' }}>{set.reps || '—'}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 11 }}>reps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
            <AnimatedPress
              style={{ backgroundColor: sessionSets.every(s => s.completed) ? COLORS.accent : '#2a2a4a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 }}
              scaleDown={0.96}
              onPress={() => {
                const completed = sessionSets.filter(s => s.completed);
                if (completed.length === 0 || !sessionSets.every(s => s.completed)) return;
                const maxWeight = Math.max(...completed.map(s => parseFloat(s.weight) || 0));
                const bestSet = completed.find(s => parseFloat(s.weight) === maxWeight) || completed[completed.length - 1];
                const key = logKey(selectedDay.day, selectedExercise);
                const existing = logs[key] || [];
                const allSets = sessionSets.map((s, idx) => s.completed ? { weight: s.weight, reps: s.reps } : (existing[existing.length - 1]?.sets?.[idx] || { weight: '', reps: '' }));
                const newEntry = { programWeek: currentWeek, weight: String(maxWeight), reps: bestSet.reps, sets: allSets };
                const updatedLogs = { ...logs, [key]: [...existing, newEntry] };
                setLogs(updatedLogs);
                if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                const dayExs = (selectedDay?.exercises || []).filter(e =>
                  !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
                );
                const allLogged = dayExs.every(e =>
                  (updatedLogs[logKey(selectedDay.day, e)] || []).some(en =>
                    en.programWeek === currentWeek
                  )
                );
                if (allLogged) {
                  Vibration.vibrate([0, 60, 40, 80]);
                  setShowCompleteButton(true);
                } else {
                  const sr = parseSetsReps(selectedExercise);
                  const count = sr ? parseInt(sr.sets) : 3;
                  setSessionSets(Array.from({ length: count }, (_, idx) => ({ weight: allSets[idx]?.weight || String(maxWeight), reps: allSets[idx]?.reps || bestSet.reps, completed: false })));
                }
              }}
            >
              <Text style={{ color: sessionSets.every(s => s.completed) ? COLORS.text : COLORS.muted, fontWeight: 'bold', fontSize: 15 }}>Save Sets</Text>
            </AnimatedPress>
          </View>}

          {/* Log History */}
          {data.length > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Log History</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Clear Log History',
                    `Are you sure you want to clear all log history for ${cleanExerciseName(selectedExercise)}? This cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: () => {
                        const updatedLogs = { ...logs, [logKey(selectedDay.day, selectedExercise)]: [] };
                        setLogs(updatedLogs);
                        if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                        setSessionSets(s => s.map(set => ({ ...set, weight: '', completed: false })));
                        setShowCompleteButton(false);
                        // Un-complete the workout so the button can reappear after re-logging
                        const wKey = `${selectedDay?.day}|${currentWeek}`;
                        const updatedCompleted = { ...completedWorkouts };
                        delete updatedCompleted[wKey];
                        setCompletedWorkouts(updatedCompleted);
                        if (user) updateDoc(doc(db, 'users', user.email), { completedWorkouts: updatedCompleted });
                      }},
                    ]
                  )}
                >
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>
            {data.slice().reverse().map((entry, revIdx) => {
              const i = data.length - 1 - revIdx;
              const sets = entry.sets || [];
              const topSet = sets.length > 0 ? sets.reduce((best, s) => (parseFloat(s.weight) || 0) >= (parseFloat(best.weight) || 0) ? s : best, sets[0]) : { weight: entry.weight, reps: entry.reps };
              const volume = sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
              const prevEntry = i > 0 ? data[i - 1] : null;
              const prevVolume = prevEntry?.sets ? prevEntry.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0) : 0;
              const volumeChange = prevEntry && volume > 0 ? volume - prevVolume : null;
              const allVolumes = data.slice(0, i + 1).map(e => e.sets ? e.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0) : 0);
              const isPR = volume > 0 && volume === Math.max(...allVolumes);
              const isFirst = i === 0;
              return (
                <View key={i} style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff35', borderRadius: 16, padding: 18, marginBottom: 14 }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>Week {entry.programWeek ?? entry.week}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 12 }}>{cleanExerciseName(selectedExercise)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => { setEditingEntryIndex(i); setEditSets((entry.sets || []).map(s => ({ weight: s.weight, reps: s.reps }))); }}
                        style={{ backgroundColor: '#2a2a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                      >
                        <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                      </TouchableOpacity>
                      {i === data.length - 1 && (
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            'Clear Week ' + (entry.programWeek ?? entry.week),
                            'Remove this entry from log history? This cannot be undone.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Clear', style: 'destructive', onPress: () => {
                                const key = logKey(selectedDay.day, selectedExercise);
                                const updatedEntries = data.filter((_, idx) => idx !== i);
                                const updatedLogs = { ...logs, [key]: updatedEntries };
                                setLogs(updatedLogs);
                                if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                              }},
                            ]
                          )}
                          style={{ backgroundColor: '#3a1a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Badges */}
                  {isPR && !isFirst && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>🏆</Text>
                      <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>New PR</Text>
                    </View>
                  )}
                  {isFirst && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>🏆</Text>
                      <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>First Entry</Text>
                    </View>
                  )}
                  {/* Stats */}
                  {topSet && sets.length > 0 && (
                    <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 2 }}>
                      Top Set <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{topSet.weight}</Text> lbs × <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{topSet.reps}</Text> reps
                    </Text>
                  )}
                  {volume > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                        Volume <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{volume.toLocaleString()}</Text> lbs
                      </Text>
                      {volumeChange !== null && (
                        <Text style={{ color: volumeChange >= 0 ? '#4ade80' : COLORS.accent, fontSize: 13, fontWeight: '700' }}>
                          {volumeChange >= 0 ? '+' : ''}{volumeChange} lb
                        </Text>
                      )}
                    </View>
                  )}
                  {sets.length > 0 && (
                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>
                      {sets.map(s => `${s.weight}×${s.reps}`).join(' · ')}
                    </Text>
                  )}
                </View>
              );
            })}
            </>
          ) : null}
        </ScrollView>

        {/* Reps Picker Modal */}
        {(() => {
          const sr = parseSetsReps(selectedExercise || '');
          let lo = 6, hi = 15;
          if (sr) {
            const parts = sr.reps.split('-').map(Number);
            lo = parts[0];
            hi = parts.length > 1 ? parts[1] : lo;
          }
          const repOptions = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
          const currentReps = repsPickerIndex !== null ? parseInt(sessionSets[repsPickerIndex]?.reps) || null : null;
          return (
            <Modal visible={repsPickerVisible} transparent animationType="fade">
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setRepsPickerVisible(false)}>
                <View style={{ alignItems: 'center', gap: 10, width: 220 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setRepsPickerVisible(false);
                      setWeightPickerIndex(repsPickerIndex);
                      setWeightPickerVisible(true);
                    }}
                    style={{ alignSelf: 'flex-start', backgroundColor: '#2a2a4a', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff20' }}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>←</Text>
                  </TouchableOpacity>
                  <View style={{ backgroundColor: COLORS.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff18', width: 220 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 20 }}>SELECT REPS</Text>
                    <ScrollView style={{ maxHeight: 300, width: '100%' }} showsVerticalScrollIndicator={false}>
                      {repOptions.map(r => {
                        const selected = currentReps === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            onPress={() => {
                              const s = [...sessionSets];
                              s[repsPickerIndex] = { ...s[repsPickerIndex], reps: String(r) };
                              setSessionSets(s);
                            }}
                            style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 6, backgroundColor: selected ? '#4ade80' : '#2a2a4a', borderWidth: 1, borderColor: selected ? '#4ade80' : '#ffffff10', alignItems: 'center' }}
                          >
                            <Text style={{ color: selected ? '#000' : COLORS.text, fontSize: 20, fontWeight: '700' }}>{r} reps</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const s = [...sessionSets];
                      s[repsPickerIndex] = { ...s[repsPickerIndex], completed: true };
                      setSessionSets(s);
                      setRepsPickerVisible(false);
                      if (restTimerEnabled) {
                        const suggested = getRestSuggestion(selectedExercise);
                        setRestingForExercise(selectedExercise);
                        setRestTimerDuration(suggested);
                        setRestTimerRemaining(suggested);
                        setRestTimerRunning(true);
                      }
                      if (s.every(set => set.completed)) {
                        const completed = s.filter(set => set.completed);
                        const maxWeight = Math.max(...completed.map(set => parseFloat(set.weight) || 0));
                        const bestSet = completed.find(set => parseFloat(set.weight) === maxWeight) || completed[completed.length - 1];
                        const key = logKey(selectedDay.day, selectedExercise);
                        const existing = logs[key] || [];
                        const allSets = s.map((set, idx) => set.completed ? { weight: set.weight, reps: set.reps } : (existing[existing.length - 1]?.sets?.[idx] || { weight: '', reps: '' }));
                        const newEntry = { programWeek: currentWeek, weight: String(maxWeight), reps: bestSet.reps, sets: allSets };
                        const updatedLogs = { ...logs, [key]: [...existing, newEntry] };
                        setLogs(updatedLogs);
                        if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                      }
                    }}
                    style={{ width: 220, backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#000', fontSize: 15, fontWeight: '800' }}>Complete Set</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          );
        })()}

        {/* Weight Picker Modal */}
        {(() => {
          const exName = cleanExerciseName(selectedExercise || '');
          const range = EXERCISE_WEIGHT_RANGES[exName] || { min: 5, max: 300 };
          const steps = [];
          for (let w = range.min; w <= range.max; w = Math.round((w + 2.5) * 10) / 10) steps.push(w);
          const ownW = weightPickerIndex !== null ? parseFloat(sessionSets[weightPickerIndex]?.weight) || 0 : 0;
          let prevSetWeight = null;
          if (weightPickerIndex > 0) {
            for (let j = weightPickerIndex - 1; j >= 0; j--) {
              const prev = parseFloat(sessionSets[j]?.weight);
              if (prev > 0) { prevSetWeight = String(prev); break; }
            }
          }
          const currentW = (weightPickerIndex > 0 && prevSetWeight)
            ? parseFloat(prevSetWeight)
            : (ownW || range.min);
          const selectedVal = steps.find(w => Math.abs(w - currentW) < 0.01) ?? steps[0];
          return (
            <Modal visible={weightPickerVisible} transparent animationType="slide">
              <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: '#000000cc' }} onPress={() => { savedDismissRef.current = { index: weightPickerIndex }; setWeightPickerVisible(false); }}>
                <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>

                  {/* ── Plate Calculator (Android only, barbell exercises only) ── */}
                  {Platform.OS === 'android' && isBarbellExercise(selectedExercise) && (() => {
                    const totalWeight = platesToWeight(barPlates);
                    const scrollToWeight = (w) => {
                      const idx = steps.findIndex(s => Math.abs(s - w) < 0.01);
                      if (idx !== -1) weightListRef.current?.scrollToIndex({ index: Math.max(0, idx - 2), animated: true });
                    };
                    const addPlate = (p) => {
                      const next = [...barPlates, p];
                      setBarPlates(next);
                      const w = platesToWeight(next);
                      setTempWeightVal(w);
                      scrollToWeight(w);
                    };
                    const removeLastOf = (p) => {
                      const idx = [...barPlates].lastIndexOf(p);
                      if (idx === -1) return;
                      const next = barPlates.filter((_, i) => i !== idx);
                      setBarPlates(next);
                      const w = platesToWeight(next);
                      setTempWeightVal(w);
                      scrollToWeight(w);
                    };
                    return (
                      <View style={{ marginHorizontal: 40, marginBottom: 10, backgroundColor: COLORS.card, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff10', borderTopColor: '#ffffff28', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.35, shadowRadius: 16 }}>
                        {/* Header */}
                        <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.9 }}>PLATE CALCULATOR</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {barPlates.length > 0 && (
                              <TouchableOpacity onPress={() => { setBarPlates([]); setTempWeightVal(45); }} activeOpacity={0.7}
                                style={{ backgroundColor: '#ffffff15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ffffff25' }}>
                                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>Clear</Text>
                              </TouchableOpacity>
                            )}
                            <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '900' }}>
                              {totalWeight}<Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '500' }}> lbs</Text>
                            </Text>
                          </View>
                        </View>
                        {/* Body: barbell left, plate grid right */}
                        <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 10, gap: 10, alignItems: 'center' }}>
                          {/* Left: barbell */}
                          <View style={{ width: 120, height: 90, justifyContent: 'center' }}>
                            {/* Sleeve (thin end, left of collar) */}
                            <View style={{ position: 'absolute', left: 0, width: 16, height: 7, backgroundColor: '#b0b0b0' }} />
                            {/* Main bar (right of collar) */}
                            <View style={{ position: 'absolute', left: 13, right: 0, height: 14, backgroundColor: '#b0b0b0', borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                            {/* Left end cap */}
                            <View style={{ position: 'absolute', left: 13, width: 6, height: 18, backgroundColor: '#888', borderRadius: 2 }} />
                            {/* Plates stacked outward from left collar */}
                            <View style={{ position: 'absolute', left: 19, flexDirection: 'row', alignItems: 'center' }}>
                              {[...barPlates].sort((a, b) => b - a).map((p, i) => (
                                <TouchableOpacity key={i} onPress={() => removeLastOf(p)} activeOpacity={0.7}>
                                  <View style={{ width: PLATE_W[p] + 2, height: PLATE_H[p], backgroundColor: PLATE_COLORS[p], borderRadius: 4, marginRight: 0.5, borderWidth: 1, borderColor: '#ffffff35' }} />
                                </TouchableOpacity>
                              ))}
                            </View>
                            {barPlates.length === 0 && (
                              <Text style={{ color: '#ffffff30', fontSize: 10, position: 'absolute', left: 14, top: '60%' }}>empty</Text>
                            )}
                          </View>
                          {/* Right: plate buttons — 2 rows, proportional size */}
                          <View style={{ flex: 1, gap: 2 }}>
                            {/* Row 1: 45 and 5 */}
                            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                              {[45, 5].map(p => {
                                const size = p === 45 ? 78 : 46;
                                const hole = 14;
                                const fs = p === 45 ? 12 : 9;
                                return (
                                  <TouchableOpacity key={p} onPress={() => addPlate(p)} activeOpacity={0.72}
                                    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLATE_COLORS[p], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff30', shadowColor: PLATE_COLORS[p], shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 }}>
                                    <View style={{ position: 'absolute', width: hole, height: hole, borderRadius: hole / 2, backgroundColor: COLORS.card }} />
                                    <Text style={{ position: 'absolute', top: Math.round(size * 0.1), color: '#fff', fontSize: fs, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>{p} lbs</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            {/* Row 2: 25, 10, 2.5 */}
                            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-start' }}>
                              {[25, 10, 2.5].map(p => {
                                const size = p === 25 ? 62 : p === 10 ? 52 : 40;
                                const hole = 14;
                                const fs = p === 25 ? 10 : p === 10 ? 9 : 8;
                                return (
                                  <TouchableOpacity key={p} onPress={() => addPlate(p)} activeOpacity={0.72}
                                    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLATE_COLORS[p], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff30', shadowColor: PLATE_COLORS[p], shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 }}>
                                    <View style={{ position: 'absolute', width: hole, height: hole, borderRadius: hole / 2, backgroundColor: COLORS.card }} />
                                    <Text style={{ position: 'absolute', top: Math.round(size * 0.1), color: '#fff', fontSize: fs, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>{p} lbs</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* ── Weight Picker Card ── */}
                  <View style={{ marginHorizontal: 10, marginBottom: 10, backgroundColor: COLORS.card, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff10', borderTopColor: '#ffffff28', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 20 }}>
                    <View style={{ paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#ffffff10', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Select Weight</Text>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => {
                          const s = [...sessionSets];
                          s[weightPickerIndex] = { ...s[weightPickerIndex], weight: String(tempWeightVal ?? selectedVal) };
                          s[weightPickerIndex] = { ...s[weightPickerIndex], completed: true };
                          setSessionSets(s);
                          setTempWeightVal(null);
                          const nextIdx = s.findIndex((set, i) => i > weightPickerIndex && !set.completed);
                          if (nextIdx !== -1) {
                            keepPlatesRef.current = true;
                            setTimeout(() => { setWeightPickerIndex(nextIdx); setWeightPickerVisible(true); }, 300);
                          }
                          setWeightPickerVisible(false);
                          if (restTimerEnabled) {
                            const suggested = getRestSuggestion(selectedExercise);
                            setRestingForExercise(selectedExercise);
                            setRestTimerDuration(suggested);
                            setRestTimerRemaining(suggested);
                            setRestTimerRunning(true);
                          }
                          if (s.every(set => set.completed)) {
                            const completed = s.filter(set => set.completed);
                            const maxWeight = Math.max(...completed.map(set => parseFloat(set.weight) || 0));
                            const bestSet = completed.find(set => parseFloat(set.weight) === maxWeight) || completed[completed.length - 1];
                            const key = logKey(selectedDay.day, selectedExercise);
                            const existing = logs[key] || [];
                            const allSets = s.map((set, idx) => set.completed ? { weight: set.weight, reps: set.reps } : (existing[existing.length - 1]?.sets?.[idx] || { weight: '', reps: '' }));
                            const newEntry = { programWeek: currentWeek, weight: String(maxWeight), reps: bestSet.reps, sets: allSets };
                            const updatedLogs = { ...logs, [key]: [...existing, newEntry] };
                            setLogs(updatedLogs);
                            if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                          }
                        }} style={{ backgroundColor: '#4ade80', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 }}>
                          <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>Complete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          if (tempWeightVal !== null) {
                            const s = [...sessionSets];
                            s[weightPickerIndex] = { ...s[weightPickerIndex], weight: String(tempWeightVal) };
                            setSessionSets(s);
                          }
                          setTempWeightVal(null);
                          setWeightPickerVisible(false);
                          setRepsPickerIndex(weightPickerIndex);
                          setRepsPickerVisible(true);
                        }} style={{ backgroundColor: '#2a2a4a', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: '#ffffff20' }}>
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>Adjust Reps</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#ffffff08', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: prevSetWeight ? 1 : 0 }}>
                      <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>Previous Set</Text>
                      <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '700' }}>{prevSetWeight || ''} lbs</Text>
                    </View>
                    {Platform.OS === 'android' ? (() => {
                      const activeVal = tempWeightVal ?? selectedVal;
                      const milestones = { 135: '1 plate', 225: '2 plates', 315: '3 plates', 405: '4 plates', 585: '5 plates' };
                      const selectedIdx = steps.findIndex(w => Math.abs(w - activeVal) < 0.01);
                      return (
                        <FlatList
                          ref={weightListRef}
                          data={steps}
                          keyExtractor={(w) => String(w)}
                          style={{ height: 220 }}
                          showsVerticalScrollIndicator={false}
                          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
                          initialScrollIndex={Math.max(0, selectedIdx - 2)}
                          onMomentumScrollEnd={(e) => {
                            const scrollY = e.nativeEvent.contentOffset.y;
                            const idx = Math.min(Math.max(Math.round(scrollY / 52) + 2, 0), steps.length - 1);
                            const newW = steps[idx];
                            setTempWeightVal(newW);
                            setBarPlates(newW >= 45 ? weightToPlates(newW) : []);
                          }}
                          onScrollEndDrag={(e) => {
                            const scrollY = e.nativeEvent.contentOffset.y;
                            const idx = Math.min(Math.max(Math.round(scrollY / 52) + 2, 0), steps.length - 1);
                            const newW = steps[idx];
                            setTempWeightVal(newW);
                            setBarPlates(newW >= 45 ? weightToPlates(newW) : []);
                          }}
                          renderItem={({ item: w }) => {
                            const isSelected = Math.abs(w - (tempWeightVal ?? selectedVal)) < 0.01;
                            const label = `${w % 1 === 0 ? w : w.toFixed(1)} lbs`;
                            const milestone = milestones[w];
                            return (
                              <TouchableOpacity
                                onPress={() => setTempWeightVal(w)}
                                style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, backgroundColor: isSelected ? '#ffffff0e' : 'transparent', borderLeftWidth: isSelected ? 3 : 0, borderLeftColor: COLORS.accent }}
                              >
                                <Text style={{ color: isSelected ? COLORS.text : COLORS.muted, fontSize: isSelected ? 18 : 16, fontWeight: isSelected ? '800' : '400' }}>{label}</Text>
                                {milestone && <Text style={{ color: isSelected ? COLORS.accent : '#ffffff30', fontSize: 12, fontWeight: '600' }}>{milestone}</Text>}
                              </TouchableOpacity>
                            );
                          }}
                        />
                      );
                    })() : (
                      <Picker
                        selectedValue={tempWeightVal ?? selectedVal}
                        onValueChange={(val) => setTempWeightVal(val)}
                        itemStyle={{ color: COLORS.text, fontSize: 22 }}
                        style={{ backgroundColor: COLORS.card }}
                      >
                        {steps.map(w => (
                          <Picker.Item key={w} label={(() => {
                            const base = `${w % 1 === 0 ? w : w.toFixed(1)} lbs`;
                            const milestones = { 135: '— 1 plate', 225: '— 2 plates', 315: '— 3 plates', 405: '— 4 plates', 585: '— 5 plates' };
                            return milestones[w] ? `${base}  ${milestones[w]}` : base;
                          })()} value={w} />
                        ))}
                      </Picker>
                    )}
                  </View>

                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          );
        })()}

        {/* Edit Log Entry Modal */}
        <Modal visible={editingEntryIndex !== null} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#12122a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 16 }}>
                Edit Week {editingEntryIndex !== null ? (data[editingEntryIndex]?.programWeek ?? data[editingEntryIndex]?.week) : ''} Log
              </Text>
              {editSets.map((s, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 13, width: 40 }}>Set {idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 10, marginBottom: 2 }}>WEIGHT</Text>
                    <TextInput
                      style={{ backgroundColor: '#2a2a4a', color: COLORS.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, textAlign: 'center' }}
                      keyboardType="decimal-pad"
                      value={String(s.weight)}
                      onChangeText={v => { const arr = [...editSets]; arr[idx] = { ...arr[idx], weight: v }; setEditSets(arr); }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 10, marginBottom: 2 }}>REPS</Text>
                    <TextInput
                      style={{ backgroundColor: '#2a2a4a', color: COLORS.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, textAlign: 'center' }}
                      keyboardType="number-pad"
                      value={String(s.reps)}
                      onChangeText={v => { const arr = [...editSets]; arr[idx] = { ...arr[idx], reps: v }; setEditSets(arr); }}
                    />
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setEditingEntryIndex(null)}
                  style={{ flex: 1, backgroundColor: '#2a2a4a', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                >
                  <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (editingEntryIndex === null) return;
                    const key = logKey(selectedDay.day, selectedExercise);
                    const updated = (logs[key] || []).map((en, idx2) => {
                      if (idx2 !== editingEntryIndex) return en;
                      const allSets = editSets.map(s => ({ weight: s.weight, reps: s.reps }));
                      const maxWeight = Math.max(...allSets.map(s => parseFloat(s.weight) || 0));
                      const bestSet = allSets.reduce((b, s) => (parseFloat(s.weight) || 0) >= (parseFloat(b.weight) || 0) ? s : b, allSets[0]);
                      return { ...en, weight: String(maxWeight), reps: bestSet?.reps || en.reps, sets: allSets };
                    });
                    const updatedLogs = { ...logs, [key]: updated };
                    setLogs(updatedLogs);
                    if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                    setEditingEntryIndex(null);
                  }}
                  style={{ flex: 1, backgroundColor: '#4ade80', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                >
                  <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Complete Workout button */}
        {(shouldShowCompleteBtn || showCompleteButton) && (() => {
          const key = `${selectedDay?.day}|${currentWeek}`;
          const done = !!completedWorkouts[key];

          const markDone = () => {
            if (done) { setShowDayComplete(true); return; }
            const updated = { ...completedWorkouts, [key]: true };
            setCompletedWorkouts(updated);
            if (user) updateDoc(doc(db, 'users', user.email), { completedWorkouts: updated });
            setShowCompleteButton(false);
            setShowDayComplete(true);
            setRestTimerRunning(false);
            setRestTimerRemaining(0);
            setRestingForExercise(null);
            setTimeout(() => {
              setWorkoutChip(true);
              Animated.parallel([
                Animated.timing(chipFade, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(chipScale, { toValue: 1, speed: 60, bounciness: 8, useNativeDriver: true }),
              ]).start();
            }, 2000);
          };

          if (done && workoutChip) {
            return (
              <Animated.View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', opacity: chipFade, transform: [{ scale: chipScale }] }}>
                <TouchableOpacity onPress={() => setShowDayComplete(true)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.deep, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#4ade8040', borderTopColor: '#4ade8070', shadowColor: '#4ade80', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', lineHeight: 14 }}>✓</Text>
                  </View>
                  <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>Workout Complete</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          }

          return (
            <View style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
              <AnimatedPress
                style={{ backgroundColor: done ? '#12221a' : '#4ade80', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: done ? 1 : 0, borderColor: '#4ade8055', shadowColor: '#4ade80', shadowOpacity: done ? 0.1 : 0.35, shadowRadius: 14, elevation: done ? 4 : 8 }}
                onPress={markDone}
                scaleDown={0.95}
              >
                <Text style={{ color: done ? '#4ade80' : '#000', fontWeight: '800', fontSize: 16 }}>{done ? 'Workout Completed' : 'Complete Workout'}</Text>
                <Text style={{ color: done ? '#4ade80' : '#000', fontSize: 16, fontWeight: '800' }}>✓</Text>
              </AnimatedPress>
            </View>
          );
        })()}

        {renderDayCompleteModal()}

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.input },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  dotDone: { backgroundColor: COLORS.success },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
  },
  questionText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'left',
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  authError: { color: '#ff6b6b', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  authField: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff12', borderTopColor: '#ffffff20', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 16 },
  authInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  choices: { gap: 14 },
  choiceBtn: {
    backgroundColor: COLORS.input,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  choiceBtnActive: {
    backgroundColor: COLORS.accent,
  },
  choiceText: { color: COLORS.text, fontSize: 16 },
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 18, padding: 20, gap: 16, borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff35', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18, marginBottom: 0 },
  goalEmoji: { fontSize: 32 },
  goalTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  goalSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  goalChevron: { color: COLORS.muted, fontSize: 22, fontWeight: 'bold' },
  fieldLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  mealFood: { color: COLORS.muted, fontSize: 13, marginTop: 4, paddingLeft: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffffff08',
    borderTopColor: '#ffffff35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 6,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16, flex: 1 },
  chevron: { color: COLORS.muted, fontSize: 24 },
  exerciseCount: { color: '#4a4a6a', fontSize: 12, marginTop: 3 },
  backBtn: { marginBottom: 12, paddingRight: 80, paddingVertical: 16 },
  backText: { color: COLORS.text, fontSize: 44, fontWeight: '700', lineHeight: 48 },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#ffffff0a',
    borderTopColor: '#ffffff30',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  exerciseCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stretchGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stretchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%', backgroundColor: COLORS.input, borderRadius: 10, padding: 10 },
  stretchNumber: { color: COLORS.muted, fontSize: 16, fontWeight: 'bold', width: 22, textAlign: 'center' },
  stretchEmoji: { fontSize: 28 },
  stretchImg: { width: 64, height: 64, borderRadius: 8 },
  stretchLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  stretchDuration: { color: COLORS.muted, fontSize: 11 },
  exerciseCardInfo: { flex: 1 },
  exImgBox: { width: 120, height: 76, borderRadius: 8, backgroundColor: COLORS.input, justifyContent: 'center', alignItems: 'center' },
  exImgEmoji: { fontSize: 30 },
  exImg: { width: 120, height: 76, borderRadius: 8, overflow: 'hidden' },
  progressImgRow: { alignItems: 'center', marginBottom: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  title2: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  subtitle2: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  tableContainer: { backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  tableHeaderRow: { backgroundColor: COLORS.input },
  tableRowAlt: { backgroundColor: '#ffffff08' },
  tableCell: { fontSize: 13, color: COLORS.text, textAlign: 'center' },
  tableHeaderCell: { color: COLORS.muted, fontWeight: 'bold', fontSize: 12 },
  weekCol: { flex: 2, textAlign: 'left' },
  weightCol: { flex: 2, textAlign: 'center' },
  changeCol: { flex: 2, textAlign: 'center' },
  dateCol: { flex: 1, textAlign: 'right' },
  weightValue: { fontWeight: 'bold', color: COLORS.text },
  entryNum: { color: COLORS.muted, fontSize: 11 },
  exerciseName: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  pillRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  pill: { backgroundColor: '#1e1e44', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#ffffff0a' },
  pillText: { color: '#8888b8', fontSize: 11, fontWeight: '600' },
  logCount: { color: COLORS.muted, fontSize: 12, marginBottom: 10 },
  exerciseBtns: { flexDirection: 'row', gap: 8 },
  logBtn: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  progressBtn: {
    backgroundColor: COLORS.success + '22',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  logBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  restTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a3a2a', borderWidth: 1, borderColor: '#4ade80', borderRadius: 10, paddingVertical: 10, marginBottom: 12 },
  restTimerBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 15 },
  floatBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flex: 0,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  modalSubtitle: { color: COLORS.muted, fontSize: 14, marginBottom: 16 },
  cancelBtn: { marginTop: 10, alignItems: 'center', padding: 10 },
  cancelText: { color: COLORS.muted, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
    borderTopColor: '#ffffff32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14, marginBottom: 12 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 8,
    paddingBottom: 4,
  },
  barCol: { alignItems: 'center', width: 52 },
  barWeightLabel: { color: COLORS.muted, fontSize: 10, marginBottom: 4 },
  bar: { width: 36, backgroundColor: COLORS.accent, borderRadius: 4 },
  barLatest: { backgroundColor: COLORS.success },
  weekLabel: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  emptyChart: { color: COLORS.muted, textAlign: 'center', fontSize: 13, padding: 16 },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  logWeek: { color: COLORS.muted, fontSize: 14 },
  logWeight: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  sectionLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14, marginTop: 4, borderLeftWidth: 2, borderLeftColor: COLORS.accent, paddingLeft: 8 },
  restBanner: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  restBannerLabel: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  restBannerTime: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  imgModalOverlay: { flex: 1, backgroundColor: '#000000ee', justifyContent: 'center', alignItems: 'center', padding: 20 },
  imgModalCard: { width: '100%' },
  imgModalFull: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  imgModalTextBox: { backgroundColor: '#ffffff', padding: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' },
  imgModalTitle: { color: '#000000', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  imgModalNotes: { color: '#333333', fontSize: 13, lineHeight: 19 },
});

export default function App() {
  return (
    <ErrorBoundary>
      <LinearGradient
        colors={['#1a0508', '#0a0a0f', '#0a0a0f']}
        locations={[0, 0.18, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <Root />
      </LinearGradient>
    </ErrorBoundary>
  );
}
