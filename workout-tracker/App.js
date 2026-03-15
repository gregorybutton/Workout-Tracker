import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  bg: '#13132b',
  card: '#1c1c3a',
  accent: '#e94560',
  text: '#ffffff',
  muted: '#8888aa',
  input: '#23234a',
  success: '#4caf50',
};

function buildPlan(days) { return days; }


const WORKOUT_PLANS = {
  'Building Muscle - Men': buildPlan([
    { day: 'Sunday – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Monday – Upper Body', exercises: ['Incline Bench Press 4×6-8', 'Weighted Pull Ups 4×6-8', 'Bent Over Barbell Row 3×8-10', 'Pec Deck 3×10-12', 'Seated Lateral Raise 3×12-15', 'Cable Tricep Pushdowns 3×10-12', 'Incline Dumbbell Curl 3×10-12'] },
    { day: 'Tuesday – Lower Body', exercises: ['Lying Leg Curl 2×8', 'Barbell Back Squat 4×5-8', 'Romanian Deadlift 3×8-10', 'Leg Press 3×10-12', 'Seated Calf Raise 4×10-15'] },
    { day: 'Wednesday – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Thursday – Push Day', exercises: ['Flat Bench Press 4×5-8', 'Machine Shoulder Press 3×10', 'Pec Deck 3×15', 'Seated Lateral Raise 4×12-15', 'Overhead Extension 3×8'] },
    { day: 'Friday – Pull Day', exercises: ['Close Grip Lat Pulldown 3×10', 'Chest-Supported Row 3×8', 'Close-Grip Cable Row 2×15', 'Reverse Cable Flyes 3×15', 'Shrugs 4×15', 'EZ-Bar Curl 3×10', 'Machine Preacher Curl 3×15'] },
    { day: 'Saturday – Leg Day', exercises: ['Seated Leg Curl 2×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 2×10', 'Hip Adduction 2×10', 'Standing Calf Raise 3×10'] },
  ]),
  'Building Muscle - Women': buildPlan([
    { day: 'Sunday – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Monday – Glutes + Hamstrings', exercises: ['Barbell Hip Thrust 4×6-8', 'Romanian Deadlift 4×8-10', 'Lying Leg Curl 3×10-12', 'Bulgarian Split Squat 3×8-10', 'Cable Kickback 3×12-15'] },
    { day: 'Tuesday – Upper Body (Back + Shoulders)', exercises: ['Lat Pulldown 4×8-12', 'Seated Cable Row 3×10-12', 'Dumbbell Shoulder Press 3×8-10', 'Cable Lateral Raise 3×12-15', 'Rear Delt Machine Fly 3×12-15'] },
    { day: 'Wednesday – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Thursday – Glute Pump / Isolation', exercises: ['Glute Bridge 4×10-12', 'Step Ups 3×10', 'Cable Glute Kickbacks 3×12-15', 'Hip Abduction Machine 3×15-20', '45° Back Extensions 3×12-15'] },
    { day: 'Friday – Glutes + Quads', exercises: ['Back Squat 4×6-8', 'Leg Press 3×10-12', 'Walking Lunges 3×10', 'Leg Extension 3×12-15', 'Barbell Hip Thrust 3×8-10'] },
    { day: 'Saturday – Leg Day', exercises: ['Seated Leg Curl 2×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 2×10', 'Hip Adduction 2×10', 'Standing Calf Raise 3×10'] },
  ]),
};


const QUESTIONS = [
  { key: 'goal', label: "What's your goal?", type: 'choice', options: ['Building Muscle - Men', 'Building Muscle - Women', 'Get a Nutrition Plan'] },
];

const GOAL_META = {
  'Building Muscle - Men':   { emoji: '💪', subtitle: 'Track workouts' },
  'Building Muscle - Women': { emoji: '💪', subtitle: 'Track workouts' },
  'Get a Nutrition Plan':    { emoji: '🥗', subtitle: 'Calculate calories' },
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
  'Seated Leg Curl':        'Sit tall with back against the pad. Curl to full contraction and pause briefly at the bottom. Return slowly for a full hamstring stretch — don\'t let the weight stack bounce.',
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
  'Close Grip Lat Pulldown': 'Grip shoulder-width or narrower, palms facing you. Pull elbows down toward your hips and squeeze the lats at the bottom. Control the return — don\'t let the bar yank you up.',
  'Chest-Supported Row':    'Chest flat against the pad to eliminate momentum. Retract shoulder blades first, then row to lower chest. Squeeze at the top and lower with full control.',
  'Close-Grip Cable Row':   'Sit tall, slight knee bend. Pull the handle to your lower sternum, driving elbows back. Squeeze shoulder blades together at the end — don\'t let shoulders roll forward on the return.',
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
  'Seated Lateral Raise': 'Sit tall on the edge of a bench, dumbbells at your sides. Lead with your elbows and raise arms out to shoulder height — keep a slight bend in the elbow throughout. Pause briefly at the top, then lower slowly with control. Avoid shrugging or using momentum.',
  'Pec Deck':                  'Adjust the seat so handles are at chest height. Keep a slight bend in the elbows and lead with your elbows — not your hands. Squeeze the chest hard at the peak contraction, then return slowly for a full stretch. Don\'t let the weight snap back.',
  'Bent Over Barbell Row':     'Hinge at the hips until torso is roughly parallel to the floor, slight knee bend. Brace your core and keep your back flat throughout. Pull the bar to your lower chest, driving elbows back and squeezing the shoulder blades together at the top. Lower with control — don\'t let your back round on the descent.',
  'Cable Tricep Pushdowns':    'Set the cable to a high pulley with a rope or bar attachment. Keep elbows tucked at your sides throughout — they should not move. Push down to full extension and squeeze the triceps hard at the bottom. Return slowly, allowing a full stretch at the top before the next rep.',
};

// Local images — all commented out to use ExerciseDB API instead.
// Uncomment any entry to override the API with your own photo.
const EXERCISE_IMAGES = {
  // 'Incline Bench':           require('./assets/exercises/incline-bench.jpg'),
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
  // 'Close Grip Lat Pulldown': require('./assets/exercises/close-grip-lat-pulldown.jpg'),
  // 'Chest-Supported Row':     require('./assets/exercises/chest-supported-row.jpg'),
  // 'Close-Grip Cable Row':    require('./assets/exercises/close-grip-cable-row.jpg'),
  // 'Reverse Cable Flyes':     require('./assets/exercises/reverse-cable-flyes.jpg'),
  // 'EZ-Bar Curl':             require('./assets/exercises/ez-bar-curl.jpg'),
  // 'Machine Preacher Curl':   require('./assets/exercises/machine-preacher-curl.jpg'),
  // 'Shrugs':                  require('./assets/exercises/shrugs.jpg'),
  // 'Seated Leg Curl':         require('./assets/exercises/seated-leg-curl.jpg'),
  // 'Hip Adduction':           require('./assets/exercises/hip-adduction.jpg'),
  // 'Linear Hack Squat':       require('./assets/exercises/linear-hack-squat.jpg'),
  // 'Back Squat':              require('./assets/exercises/back-squat.jpg'),
  // 'Romanian Deadlift':       require('./assets/exercises/romanian-deadlift.jpg'),
  // 'Leg Press':               require('./assets/exercises/leg-press.jpg'),
  // 'Leg Extension':           require('./assets/exercises/leg-extension.jpg'),
  // 'Leg Extensions':          require('./assets/exercises/leg-extension.jpg'),
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
  'Seated Lateral Raise':   { name: 'seated side lateral raise', index: 0 },
  'Barbell Back Squat':          { name: 'barbell full squat', index: 0 },
  'Lying Leg Curl':              { name: 'lying leg curls', index: 0 },
  'Seated Calf Raise':           { name: 'seated calf raise', index: 0 },
  'Bent Over Barbell Row':       { name: 'bent over barbell row', index: 0 },
  'Cable Tricep Pushdowns':      { name: 'reverse grip triceps pushdown', index: 0 },
};

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
    .replace(/\bEZ Bar\b/gi, 'Barbell')
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

function ExerciseImage({ exerciseName, exerciseDbImages = {} }) {
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

  if (!source) {
    return (
      <View style={styles.exImgBox}>
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
        {(clean === 'Weighted Pull Ups' || clean === 'Machine Shoulder Press') ? (
          <View style={{ width: 140, height: 90, borderRadius: 8, overflow: 'hidden' }}>
            <Image source={source} style={{ width: 140, height: 180 }} resizeMode="cover" />
          </View>
        ) : (
          <Image source={source} style={styles.exImg} resizeMode="cover" />
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

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <Text style={styles.emptyChart}>No weight logged yet. Tap "+ Log Weight" to start tracking!</Text>;
  }
  const weights = data.map(d => parseFloat(d.weight));
  const maxW = Math.max(...weights);
  const minW = Math.min(...weights);
  const range = maxW === minW ? 1 : maxW - minW;
  const MAX_BAR = 120;
  const MIN_BAR = 24;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chart}>
        {data.map((entry, i) => {
          const barHeight = ((parseFloat(entry.weight) - minW) / range) * (MAX_BAR - MIN_BAR) + MIN_BAR;
          const isLatest = i === data.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barWeightLabel}>{entry.weight}</Text>
              <View style={[styles.bar, { height: barHeight }, isLatest && styles.barLatest]} />
              <Text style={styles.weekLabel}>Wk {entry.week}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function LogModal({ visible, exercise, onSave, onCancel }) {
  const [weightInput, setWeightInput] = useState('');

  function handleSave() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight.');
      return;
    }
    onSave(weightInput);
    setWeightInput('');
  }

  function handleCancel() {
    setWeightInput('');
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <Text style={styles.modalSubtitle}>{exercise}</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight (lbs or kg)"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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

export default function Root() {
  const [textVal, setTextVal] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null);
  const [screen, setScreen] = useState('quiz');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logs, setLogs] = useState({});
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [loggingExercise, setLoggingExercise] = useState(null);
  const [nutritionForm, setNutritionForm] = useState({ age: '', gender: '', heightFt: '', heightIn: '', weight: '', activityLevel: '' });
  const [nutritionResult, setNutritionResult] = useState(null);
  const [stretchImgModal, setStretchImgModal] = useState(null);
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', gender: '' });
  const [authError, setAuthError] = useState('');
  const [exerciseDbImages, setExerciseDbImages] = useState({});

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('logs'),
      AsyncStorage.getItem('user'),
    ]).then(([logsVal, userVal]) => {
      if (logsVal) setLogs(JSON.parse(logsVal));
      if (userVal) {
        const savedUser = JSON.parse(userVal);
        setUser(savedUser);
        setAnswers({ name: savedUser.name });
        setScreen('login');
      } else {
        setScreen('register');
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

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

  function handleRegister() {
    const { name, email, password, gender } = authForm;
    if (!name || !email || !password || !gender) {
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
    const newUser = { name, email, password, gender };
    AsyncStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    setAnswers({ name });
    setAuthError('');
    setScreen('quiz');
  }

  function handleLogin() {
    const { email, password } = authForm;
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    AsyncStorage.getItem('user').then(val => {
      if (!val) { setAuthError('No account found. Please register.'); return; }
      const saved = JSON.parse(val);
      if (saved.email !== email || saved.password !== password) {
        setAuthError('Incorrect email or password.');
        return;
      }
      setUser(saved);
      setAnswers({ name: saved.name });
      setAuthError('');
      setScreen('quiz');
    });
  }

  function handleLogout() {
    setUser(null);
    setAuthForm({ name: '', email: '', password: '', gender: '' });
    setAuthError('');
    setPlan(null);
    setAnswers({});
    setScreen('login');
  }

  function logKey(dayTitle, exercise) {
    return `${dayTitle}|${exercise}`;
  }

  function handleAnswer(value) {
    const key = QUESTIONS[step].key;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setTextVal('');

    if (key === 'goal' && value === 'Get a Nutrition Plan') {
      setScreen('nutrition');
      return;
    }

    if (key === 'goal' && (value === 'Building Muscle - Men' || value === 'Building Muscle - Women')) {
      setPlan(WORKOUT_PLANS[value]);
      AsyncStorage.getItem('user').then(val => {
        if (val) {
          const saved = JSON.parse(val);
          AsyncStorage.setItem('user', JSON.stringify({ ...saved, goal: value }));
        }
      });
      setScreen('plan');
      return;
    }
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setPlan(null);
    setTextVal('');
    setScreen('quiz');
    setSelectedDay(null);
    setSelectedExercise(null);
    setLogs({});
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

  function openLogModal(exercise) {
    setLoggingExercise(exercise);
    setLogModalVisible(true);
  }

  function saveLog(weight) {
    const key = logKey(selectedDay.day, loggingExercise);
    const existing = logs[key] || [];
    setLogs(prev => ({ ...prev, [key]: [...existing, { week: existing.length + 1, weight }] }));
    setLogModalVisible(false);
  }

  const question = QUESTIONS[step];

  function LogoutBtn() {
    return (
      <TouchableOpacity onPress={handleLogout} style={[styles.backBtn, { alignSelf: 'flex-end' }]}>
        <Text style={[styles.backText, { color: '#ff6b6b' }]}>Log Out</Text>
      </TouchableOpacity>
    );
  }

  // ── Register Screen ───────────────────────────────────────
  if (screen === 'register') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start tracking your workouts</Text>
          <View style={styles.questionCard}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={COLORS.muted}
              value={authForm.name}
              onChangeText={v => setAuthForm(f => ({ ...f, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.muted}
              value={authForm.email}
              onChangeText={v => setAuthForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              value={authForm.password}
              onChangeText={v => setAuthForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />
            <Text style={[styles.questionText, { fontSize: 15, marginTop: 8 }]}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {['Male', 'Female'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.button, { flex: 1, backgroundColor: authForm.gender === g ? COLORS.accent : COLORS.input }]}
                  onPress={() => setAuthForm(f => ({ ...f, gender: g }))}
                >
                  <Text style={styles.buttonText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAuthError(''); setScreen('login'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: COLORS.muted }}>Already have an account? <Text style={{ color: COLORS.accent }}>Log in</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Login Screen ──────────────────────────────────────────
  if (screen === 'login') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to your account</Text>
          <View style={styles.questionCard}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.muted}
              value={authForm.email}
              onChangeText={v => setAuthForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              value={authForm.password}
              onChangeText={v => setAuthForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAuthError(''); setScreen('register'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: COLORS.muted }}>Don't have an account? <Text style={{ color: COLORS.accent }}>Register</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Quiz Screen ──────────────────────────────────────────
  if (screen === 'quiz') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
          ) : <View />}
          <LogoutBtn />
        </View>
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
              const label = opt.startsWith('Building Muscle') ? 'Build Muscle' : opt;
              return (
                <TouchableOpacity key={opt} style={styles.goalCard} onPress={() => handleAnswer(opt)}>
                  <Text style={styles.goalEmoji}>{meta?.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{label}</Text>
                    <Text style={styles.goalSubtitle}>{meta?.subtitle}</Text>
                  </View>
                  <Text style={styles.goalChevron}>›</Text>
                </TouchableOpacity>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => { setStep(0); setScreen('quiz'); }} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <LogoutBtn />
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
    const { tdee, cut, bulk, proteinG } = nutritionResult;
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('nutrition')} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <LogoutBtn />
          </View>
          <Text style={styles.title}>Your Nutrition Plan</Text>
          <Text style={styles.subtitle}>{answers.name} · {nutritionForm.weight} lbs · {nutritionForm.activityLevel}</Text>

          {/* TDEE Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{tdee}</Text>
              <Text style={styles.statLabel}>TDEE (kcal)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.accent }]}>{cut}</Text>
              <Text style={styles.statLabel}>Cut (kcal)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{bulk}</Text>
              <Text style={styles.statLabel}>Bulk (kcal)</Text>
            </View>
          </View>

          {/* Macros Table */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Daily Macros Breakdown</Text>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2, textAlign: 'left' }]}>Goal</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Protein</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Carbs</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Fat</Text>
            </View>
            {[
              { label: 'Maintain', protein: proteinG, carbs: carbMainG, fat: fatMainG },
              { label: 'Cut', protein: proteinG, carbs: carbCutG, fat: fatCutG },
              { label: 'Bulk', protein: proteinG, carbs: carbBulkG, fat: fatBulkG },
            ].map((row, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'left' }]}>{row.label}</Text>
                <Text style={[styles.tableCell, { flex: 2, color: COLORS.accent }]}>{row.protein}g</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.carbs}g</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.fat}g</Text>
              </View>
            ))}
          </View>

          {/* Meal Plan */}
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Bodybuilding Meal Plan</Text>
          {meals.map((meal, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.dayTitle}>{meal.name}</Text>
                <Text style={styles.exerciseCount}>{Math.round(tdee * meal.pct)} kcal</Text>
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


  // ── Plan Overview Screen ─────────────────────────────────
  if (screen === 'plan') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity onPress={restart} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
            <Text style={[styles.backText, { color: '#ff6b6b' }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Your Workout Plan</Text>
        <FlatList
          data={plan}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => { setSelectedDay(item); setScreen('day'); }}>
              <View style={styles.cardRow}>
                <Text style={styles.dayTitle}>{item.day}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              <Text style={styles.exerciseCount}>{item.exercises.length} exercises</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // ── Day Detail Screen ────────────────────────────────────
  if (screen === 'day') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => setScreen('plan')} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back to Plan</Text>
          </TouchableOpacity>
          <LogoutBtn />
        </View>
        <Text style={styles.title}>{selectedDay.day}</Text>
        <FlatList
          data={selectedDay.exercises}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => {
            const entryCount = (logs[logKey(selectedDay.day, item)] || []).length;
            const isStretching = item.includes('Full Body Stretching');
            const isFoamRolling = item.includes('Full Body Foam Rolling');
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
              <View style={styles.exerciseCard}>
                <View style={[styles.exerciseCardTop, (isStretching || isFoamRolling) && { justifyContent: 'center' }]}>
                  {!isStretching && !isFoamRolling && <ExerciseImage exerciseName={item} exerciseDbImages={exerciseDbImages} />}
                  <View style={[styles.exerciseCardInfo, (isStretching || isFoamRolling) && { alignItems: 'center' }]}>
                    <Text style={styles.exerciseName}>{cleanExerciseName(item)}</Text>
                    {(() => { const sr = parseSetsReps(item); return sr ? (
                      <View style={styles.pillRow}>
                        <View style={styles.pill}><Text style={styles.pillText}>{sr.sets} sets</Text></View>
                        <View style={styles.pill}><Text style={styles.pillText}>{sr.reps} reps</Text></View>
                      </View>
                    ) : null; })()}
                    {!selectedDay.day.includes('Rest') && (
                      <Text style={styles.logCount}>
                        {entryCount > 0 ? `${entryCount} week${entryCount > 1 ? 's' : ''} logged` : 'No logs yet'}
                      </Text>
                    )}
                  </View>
                </View>
                {isFoamRolling && (
                  <View style={styles.stretchGrid}>
                    {foamRollingItems.map((s, i) => (
                      <View key={i} style={styles.stretchItem}>
                        <Text style={styles.stretchEmoji}>{s.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stretchLabel}>{s.label}</Text>
                          <Text style={styles.stretchDuration}>{s.duration}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {isStretching && (
                  <View style={styles.stretchGrid}>
                    {stretchingItems.map((s, i) => (
                      <View key={i} style={styles.stretchItem}>
                        <TouchableOpacity onPress={() => setStretchImgModal(s)}>
                          <Image source={s.img} style={styles.stretchImg} resizeMode="cover" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stretchLabel}>{s.label}</Text>
                          <Text style={styles.stretchDuration}>{s.duration}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {!selectedDay.day.includes('Rest') && (
                  <View style={styles.exerciseBtns}>
                    <TouchableOpacity style={styles.logBtn} onPress={() => openLogModal(item)}>
                      <Text style={styles.logBtnText}>+ Log Weight</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.logBtn, styles.progressBtn]}
                      onPress={() => { setSelectedExercise(item); setScreen('progress'); }}
                    >
                      <Text style={styles.logBtnText}>See Progress</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
        <LogModal
          visible={logModalVisible}
          exercise={loggingExercise}
          onSave={saveLog}
          onCancel={() => setLogModalVisible(false)}
        />
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
      </View>
    );
  }

  // ── Progress Screen ──────────────────────────────────────
  if (screen === 'progress') {
    const data = logs[logKey(selectedDay.day, selectedExercise)] || [];
    const latest = data.length > 0 ? data[data.length - 1].weight : null;
    const first = data.length > 1 ? data[0].weight : null;
    const totalChange = first && latest ? (parseFloat(latest) - parseFloat(first)).toFixed(1) : null;

    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => setScreen('day')} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back to {selectedDay.day.split(' – ')[0]}</Text>
          </TouchableOpacity>
          <LogoutBtn />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.progressHeader}>
            <ExerciseImage exerciseName={selectedExercise} exerciseDbImages={exerciseDbImages} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title2}>{selectedExercise.replace(/\s*\d+[×xX]\d+\s*/g, '').trim()}</Text>
              <Text style={styles.subtitle2}>{selectedDay.day}</Text>
            </View>
          </View>

          {/* Stats Row */}
          {data.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{latest}</Text>
                <Text style={styles.statLabel}>Latest</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data.length}</Text>
                <Text style={styles.statLabel}>Weeks</Text>
              </View>
              {totalChange !== null && (
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: parseFloat(totalChange) >= 0 ? COLORS.success : COLORS.accent }]}>
                    {parseFloat(totalChange) >= 0 ? '+' : ''}{totalChange}
                  </Text>
                  <Text style={styles.statLabel}>Total Change</Text>
                </View>
              )}
            </View>
          )}

          {/* Graph */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Weight Over Time</Text>
            <BarChart data={data} />
          </View>

          {/* Table */}
          {data.length > 0 ? (
            <View style={styles.tableContainer}>
              <Text style={styles.sectionLabel}>Log History</Text>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderCell, styles.weekCol]}>Week</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, styles.weightCol]}>Weight</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, styles.changeCol]}>Change</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, styles.dateCol]}>Entry #</Text>
              </View>
              {/* Table Rows */}
              {data.map((entry, i) => {
                const prev = i > 0 ? parseFloat(data[i - 1].weight) : null;
                const curr = parseFloat(entry.weight);
                const diff = prev !== null ? (curr - prev).toFixed(1) : null;
                const diffNum = diff !== null ? parseFloat(diff) : null;
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, styles.weekCol]}>Week {entry.week}</Text>
                    <Text style={[styles.tableCell, styles.weightCol, styles.weightValue]}>{entry.weight}</Text>
                    <Text style={[
                      styles.tableCell,
                      styles.changeCol,
                      diff !== null && { color: diffNum >= 0 ? COLORS.success : COLORS.accent },
                    ]}>
                      {diff === null ? '—' : (diffNum >= 0 ? `+${diff}` : diff)}
                    </Text>
                    <Text style={[styles.tableCell, styles.dateCol, styles.entryNum]}>#{i + 1}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyChart}>No entries yet. Tap "+ Log This Week" to get started!</Text>
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.logBtn, styles.floatBtn]} onPress={() => openLogModal(selectedExercise)}>
          <Text style={styles.logBtnText}>+ Log This Week</Text>
        </TouchableOpacity>

        <LogModal
          visible={logModalVisible}
          exercise={loggingExercise}
          onSave={saveLog}
          onCancel={() => setLogModalVisible(false)}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
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
  choices: { gap: 10 },
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
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 14 },
  goalEmoji: { fontSize: 32 },
  goalTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  goalSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  goalChevron: { color: COLORS.muted, fontSize: 22, fontWeight: 'bold' },
  fieldLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  mealFood: { color: COLORS.muted, fontSize: 13, marginTop: 4, paddingLeft: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15, flex: 1 },
  chevron: { color: COLORS.muted, fontSize: 24 },
  exerciseCount: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  backBtn: { marginBottom: 12 },
  backText: { color: COLORS.accent, fontSize: 15 },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  exerciseCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  stretchGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stretchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '47%', backgroundColor: COLORS.input, borderRadius: 10, padding: 10 },
  stretchNumber: { color: COLORS.muted, fontSize: 16, fontWeight: 'bold', width: 22, textAlign: 'center' },
  stretchEmoji: { fontSize: 28 },
  stretchImg: { width: 64, height: 64, borderRadius: 8 },
  stretchLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  stretchDuration: { color: COLORS.muted, fontSize: 11 },
  exerciseCardInfo: { flex: 1 },
  exImgBox: { width: 140, height: 90, borderRadius: 8, backgroundColor: COLORS.input, justifyContent: 'center', alignItems: 'center' },
  exImgEmoji: { fontSize: 36 },
  exImg: { width: 140, height: 90, borderRadius: 8, overflow: 'hidden' },
  progressImgRow: { alignItems: 'center', marginBottom: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
  exerciseName: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  pillRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  pill: { backgroundColor: '#3a3a6a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { color: '#d0d0f0', fontSize: 11, fontWeight: '600' },
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
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
  sectionLabel: { color: COLORS.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  imgModalOverlay: { flex: 1, backgroundColor: '#000000ee', justifyContent: 'center', alignItems: 'center', padding: 20 },
  imgModalCard: { width: '100%' },
  imgModalFull: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  imgModalTextBox: { backgroundColor: '#ffffff', padding: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' },
  imgModalTitle: { color: '#000000', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  imgModalNotes: { color: '#333333', fontSize: 13, lineHeight: 19 },
});
