import { useState } from 'react';
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
  bg: '#1a1a2e',
  card: '#16213e',
  accent: '#e94560',
  text: '#ffffff',
  muted: '#aaaaaa',
  input: '#0f3460',
  success: '#4caf50',
};

function buildPlan(days) { return days; }


const WORKOUT_PLANS = {
  'Building Muscle - Men': buildPlan([
    { day: 'Sunday – Rest', exercises: ['Full Body Stretching 15min', 'Foam Roll', 'Deep Breathing 5min'] },
    { day: 'Monday – Upper Body', exercises: ['Incline Bench', 'Seated Cable Fly', 'Weighted Pull Ups', 'Cable Lateral Raise 3×10', 'Deficit Pendlay Row'] },
    { day: 'Tuesday – Lower Body', exercises: ['Lying Leg Curl 2×8', 'Back Squat 3×6', 'Romanian Deadlift 3×6', 'Leg Extension 2×10', 'Hip Abduction 2×10', 'Standing Calf Raise 3×10'] },
    { day: 'Wednesday – Rest', exercises: ['Full Body Stretching 15min', 'Foam Roll', 'Deep Breathing 5min'] },
    { day: 'Thursday – Push Day', exercises: ['Bench Press 3×8', 'Machine Shoulder Press 3×10', 'Pec Deck 3×15', 'Cable Lateral Raise 3×10', 'Overhead Extension 3×8', 'Cable Kickback 3×10'] },
    { day: 'Friday – Pull Day', exercises: ['Close Grip Lat Pulldown 3×10', 'Chest-Supported Row 3×8', 'Close-Grip Cable Row 2×15', 'Reverse Cable Flyes 3×15', 'Shrugs 4×15', 'EZ-Bar Curl 3×10', 'Machine Preacher Curl 3×15'] },
    { day: 'Saturday – Leg Day', exercises: ['Seated Leg Curl 2×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 2×10', 'Hip Adduction 2×10', 'Standing Calf Raise 3×10'] },
  ]),
  'Building Muscle - Women': buildPlan([
    { day: 'Sunday – Rest', exercises: ['Full Body Stretching 15min', 'Foam Roll', 'Deep Breathing 5min'] },
    { day: 'Monday – Glutes + Hamstrings', exercises: ['Barbell Hip Thrust 4×6-8', 'Romanian Deadlift 4×8-10', 'Lying Leg Curl 3×10-12', 'Bulgarian Split Squat 3×8-10', 'Cable Kickback 3×12-15'] },
    { day: 'Tuesday – Upper Body (Back + Shoulders)', exercises: ['Lat Pulldown 4×8-12', 'Seated Cable Row 3×10-12', 'Dumbbell Shoulder Press 3×8-10', 'Cable Lateral Raise 3×12-15', 'Rear Delt Machine Fly 3×12-15'] },
    { day: 'Wednesday – Rest', exercises: ['Full Body Stretching 15min', 'Foam Roll', 'Deep Breathing 5min'] },
    { day: 'Thursday – Glute Pump / Isolation', exercises: ['Glute Bridge 4×10-12', 'Step Ups 3×10', 'Cable Glute Kickbacks 3×12-15', 'Hip Abduction Machine 3×15-20', '45° Back Extensions 3×12-15'] },
    { day: 'Friday – Glutes + Quads', exercises: ['Back Squat 4×6-8', 'Leg Press 3×10-12', 'Walking Lunges 3×10', 'Leg Extension 3×12-15', 'Barbell Hip Thrust 3×8-10'] },
    { day: 'Saturday – Leg Day', exercises: ['Seated Leg Curl 2×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 2×10', 'Hip Adduction 2×10', 'Standing Calf Raise 3×10'] },
  ]),
};

const PT_PLANS = {
  'Knee': [
    { day: 'Phase 1 – Early Recovery', exercises: ['Quad Sets 3×15', 'Heel Slides 3×12', 'Straight Leg Raises 3×10', 'Ankle Pumps 3×15', 'Seated Knee Extensions 3×10'] },
    { day: 'Phase 2 – Strengthening', exercises: ['Mini Squats 3×12', 'Terminal Knee Extensions 3×15', 'Step-Ups 3×10', 'Clamshells 3×12', 'Single Leg Balance 3×20s'] },
    { day: 'Phase 3 – Return to Activity', exercises: ['Leg Press 3×12', 'Bulgarian Split Squat 3×8', 'Nordic Curl Negatives 3×5', 'Lateral Band Walks 3×15', 'Single Leg RDL 3×10'] },
  ],
  'Shoulder': [
    { day: 'Phase 1 – Pain Relief & Mobility', exercises: ['Pendulum Swings 3×10', 'Wall Slides 3×12', 'Cross-Body Stretch 3×30s', 'Scapular Retractions 3×15', 'Chin Tucks 3×10'] },
    { day: 'Phase 2 – Rotator Cuff Strengthening', exercises: ['Band External Rotation 3×15', 'Band Internal Rotation 3×15', 'Y-T-W Raises 3×10', 'Serratus Punches 3×12', 'Face Pulls 3×15'] },
    { day: 'Phase 3 – Functional Strength', exercises: ['DB Press (light) 3×10', 'Cable Rows 3×12', 'Lateral Raises 3×12', 'Arnold Press 3×10', 'Push-Up Plus 3×12'] },
  ],
  'Lower Back': [
    { day: 'Phase 1 – Acute Care', exercises: ['Pelvic Tilts 3×12', 'Knee-to-Chest Stretch 3×30s', 'Cat-Cow 3×10', 'Supine Spinal Twist 3×30s', 'Diaphragmatic Breathing 5min'] },
    { day: 'Phase 2 – Core Stability', exercises: ['Dead Bug 3×10', 'Bird Dog 3×10', 'Glute Bridges 3×15', 'Side Plank 3×20s', 'Pallof Press 3×12'] },
    { day: 'Phase 3 – Functional Movement', exercises: ['Romanian Deadlift (light) 3×10', 'Goblet Squat 3×12', 'Suitcase Carry 3×30m', 'McGill Curl-Up 3×10', 'Hip Hinge Practice 3×10'] },
  ],
  'Hip': [
    { day: 'Phase 1 – Mobility & Activation', exercises: ['Hip 90-90 Stretch 3×30s', 'Pigeon Pose 3×45s', 'Hip Flexor Stretch 3×30s', 'Clamshells 3×12', 'Supine Hip Rotations 3×10'] },
    { day: 'Phase 2 – Strengthening', exercises: ['Glute Bridges 3×15', 'Side-Lying Hip Abduction 3×12', 'Step-Ups 3×10', 'Lateral Band Walks 3×15', 'Single Leg Balance 3×30s'] },
    { day: 'Phase 3 – Functional Loading', exercises: ['Hip Thrusts 3×12', 'Bulgarian Split Squat 3×10', 'Single Leg RDL 3×10', 'Monster Walks 3×15', 'Reverse Lunges 3×10'] },
  ],
  'Ankle & Foot': [
    { day: 'Phase 1 – Mobility & RICE', exercises: ['Ankle Circles 3×10', 'Alphabet Tracing (foot) 2×1', 'Towel Scrunches 3×15', 'Calf Stretch 3×30s', 'Plantar Fascia Stretch 3×30s'] },
    { day: 'Phase 2 – Strength & Balance', exercises: ['Calf Raises 3×15', 'Single Leg Calf Raises 3×12', 'Heel Walks 3×20 steps', 'Toe Walks 3×20 steps', 'Single Leg Balance 3×30s'] },
    { day: 'Phase 3 – Dynamic Stability', exercises: ['Single Leg Balance on Foam 3×30s', 'Lateral Hops (small) 3×10', 'Heel-to-Toe Walk 3×10m', 'Step-Downs 3×10', 'Jump Rope (easy) 3×30s'] },
  ],
  'Neck': [
    { day: 'Phase 1 – Pain Relief', exercises: ['Chin Tucks 3×10', 'Neck Lateral Stretch 3×30s', 'Neck Rotation Stretch 3×30s', 'Shoulder Rolls 3×10', 'Upper Trap Stretch 3×30s'] },
    { day: 'Phase 2 – Strengthening', exercises: ['Isometric Neck Flexion 3×10s', 'Isometric Neck Extension 3×10s', 'Isometric Lateral Flexion 3×10s', 'Scapular Squeezes 3×15', 'Band Pull-Aparts 3×12'] },
    { day: 'Phase 3 – Functional', exercises: ['Deep Neck Flexor Training 3×10', 'Thoracic Extension 3×10', 'Face Pulls 3×15', 'Posture Walk 3×1min', 'Foam Roll Thoracic Spine'] },
  ],
  'Wrist & Elbow': [
    { day: 'Phase 1 – Mobility', exercises: ['Wrist Circles 3×10', 'Prayer Stretch 3×30s', 'Reverse Prayer Stretch 3×30s', 'Forearm Stretch 3×30s', 'Grip Squeeze 3×15'] },
    { day: 'Phase 2 – Strengthening', exercises: ['Wrist Curls 3×15', 'Reverse Wrist Curls 3×15', 'Hammer Curls (light) 3×12', 'Pronation & Supination 3×12', 'Finger Extensions 3×15'] },
    { day: 'Phase 3 – Functional Load', exercises: ['Push-Up on Fists 3×10', 'Farmer Carry (light) 3×30m', 'Cable Rows 3×12', 'Plate Pinch 3×20s', 'Reverse Curls 3×12'] },
  ],
};

const QUESTIONS = [
  { key: 'name', label: "What's your name?", placeholder: 'Enter your name', type: 'text' },
  { key: 'goal', label: 'What are you looking to do?', type: 'choice', options: ['Building Muscle - Men', 'Building Muscle - Women', 'Nutrition Plan', 'Physical Therapy'] },
];

const EXERCISE_NOTES = {
  'Incline Bench':          'Keep shoulder blades pinched and depressed. Drive feet into the floor. Lower the bar to upper chest, elbows at ~60°.',
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
  'Seated Leg Curl':        'Sit tall with back against the pad. Curl to full contraction and pause briefly at the bottom. Return slowly for a full hamstring stretch — don\'t let the weight stack bounce.',
  'Romanian Deadlift':      'Hinge at the hips, slight knee bend. Feel the hamstring stretch before driving hips forward to stand.',
  'Standing Calf Raise':    'Stand with the balls of your feet on the edge of the platform. Lower into a full stretch, then drive up onto your toes and squeeze hard at the top. Control the descent — don\'t bounce at the bottom.',
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
  'Cable Lateral Raise':    'Slight forward lean. Lead with your elbow, not your wrist. Raise to shoulder height and lower with control — don\'t let the cable pull you back.',
};

// Add your images to assets/exercises/ and replace null with require('./assets/exercises/filename.jpg')
const EXERCISE_IMAGES = {
  'Incline Bench':           require('./assets/exercises/incline-bench.jpg'),
  'Seated Cable Fly':        require('./assets/exercises/seated-cable-fly.jpg'),
  'Weighted Pull Ups':       require('./assets/exercises/weighted-pull-ups.jpg'),
  'Cable Lateral Raise':     require('./assets/exercises/cable-lateral-raise.jpg'),
  'Deficit Pendlay Row':     require('./assets/exercises/deficit-pendlay-row.jpg'),
  'Barbell Hip Thrust':      require('./assets/exercises/barbell-hip-thrusts.jpg'),
  'Bulgarian Split Squat':   require('./assets/exercises/bulgarian-split-squat.jpg'),
  'Bench Press':             require('./assets/exercises/bench-press.jpg'),
  'Machine Shoulder Press':  require('./assets/exercises/shoulder-press.jpg'),
  'Pec Deck':                require('./assets/exercises/pec-deck.jpg'),
  'Overhead Extension':      require('./assets/exercises/Overhead Extension.jpg'),
  'Cable Kickback':          require('./assets/exercises/cable-kickbacks.jpg'),
  'Close Grip Lat Pulldown': require('./assets/exercises/close-grip-lat-pulldown.jpg'),
  'Chest-Supported Row':     require('./assets/exercises/chest-supported-row.jpg'),
  'Close-Grip Cable Row':    require('./assets/exercises/close-grip-cable-row.jpg'),
  'Reverse Cable Flyes':     require('./assets/exercises/reverse-cable-flyes.jpg'),
  'EZ-Bar Curl':             require('./assets/exercises/ez-bar-curl.jpg'),
  'Machine Preacher Curl':   require('./assets/exercises/machine-preacher-curl.jpg'),
  'Shrugs':                  require('./assets/exercises/shrugs.jpg'),
  'Seated Leg Curl':         require('./assets/exercises/seated-leg-curl.jpg'),
  'Hip Adduction':           require('./assets/exercises/hip-adduction.jpg'),
  'Linear Hack Squat':       require('./assets/exercises/linear-hack-squat.jpg'),
  'Back Squat':              require('./assets/exercises/back-squat.jpg'),
  'Romanian Deadlift':       require('./assets/exercises/romanian-deadlift.jpg'),
  'Leg Press':               require('./assets/exercises/leg-press.jpg'),
  'Leg Extension':           require('./assets/exercises/leg-extension.jpg'),
  'Leg Extensions':          require('./assets/exercises/leg-extension.jpg'),
  'Hip Abduction':           require('./assets/exercises/hip-abduction.jpg'),
  'Standing Calf Raise':     require('./assets/exercises/standing-calf-raise.jpg'),
  'Lying Leg Curl':          require('./assets/exercises/lying-leg-curl.jpg'),
  'Walking Lunges':          require('./assets/exercises/walking-lunges.jpg'),
  'Rear Delt Machine Fly':   require('./assets/exercises/rear-delt-machine-fly.jpg'),
  'Lat Pulldown':            require('./assets/exercises/lat-pulldown.jpg'),
  'Seated Cable Row':        require('./assets/exercises/seated-cable-row.jpg'),
  'Dumbbell Shoulder Press': require('./assets/exercises/dumbell-shoulder-press.jpg'),
  'Overhead Press':          null,
  'Pull-Ups':                null,
  'Bicep Curls':             null,
  'Tricep Pushdowns':        null,
  'Calf Raises':             null,
  'Incline Dumbbell Press':  null,
  'Lateral Raises':          null,
  'Tricep Dips':             null,
  'Cable Flys':              null,
  'Deadlift':                null,
  'Cable Rows':              null,
  'Face Pulls':              null,
  'Barbell Curls':           null,
  'Hammer Curls':            null,
  'Front Squat':             null,
  'Nordic Curls':            null,
};

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

function ExerciseImage({ exerciseName }) {
  const [enlarged, setEnlarged] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const source = EXERCISE_IMAGES[cleanExerciseName(exerciseName)] ?? null;
  if (!source) {
    return (
      <View style={styles.exImgBox}>
        <Text style={styles.exImgEmoji}>{getExerciseEmoji(exerciseName)}</Text>
      </View>
    );
  }
  const clean = cleanExerciseName(exerciseName);
  const info = Image.resolveAssetSource(source);
  const aspectRatio = info && info.width && info.height ? info.width / info.height : 4 / 3;
  const cardWidth = screenWidth - 40;
  const maxImgHeight = screenHeight * 0.65;
  const imgHeight = Math.min(cardWidth / aspectRatio, maxImgHeight);
  return (
    <>
      <TouchableOpacity onPress={() => setEnlarged(true)}>
        <Image source={source} style={styles.exImg} resizeMode="cover" />
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

  function logKey(dayTitle, exercise) {
    return `${dayTitle}|${exercise}`;
  }

  function handleAnswer(value) {
    const key = QUESTIONS[step].key;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setTextVal('');

    if (key === 'goal' && value === 'Nutrition Plan') {
      setScreen('nutrition');
      return;
    }
    if (key === 'goal' && value === 'Physical Therapy') {
      setScreen('physicalTherapy');
      return;
    }
    if (key === 'goal' && (value === 'Building Muscle - Men' || value === 'Building Muscle - Women')) {
      setPlan(WORKOUT_PLANS[value]);
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

  // ── Quiz Screen ──────────────────────────────────────────
  if (screen === 'quiz') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Workout Tracker</Text>
        <View style={styles.progress}>
          {QUESTIONS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
          ))}
        </View>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.label}</Text>
          {question.type === 'text' && (
            <>
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
            </>
          )}
          {question.type === 'choice' && (
            <View style={styles.choices}>
              {question.options.map(opt => (
                <TouchableOpacity key={opt} style={styles.choiceBtn} onPress={() => handleAnswer(opt)}>
                  <Text style={styles.choiceText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
          <TouchableOpacity onPress={() => { setStep(1); setScreen('quiz'); }} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
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
          <TouchableOpacity onPress={() => setScreen('nutrition')} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
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

  // ── Physical Therapy Screen ───────────────────────────────
  if (screen === 'physicalTherapy') {
    const bodyParts = Object.keys(PT_PLANS);
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => { setStep(1); setScreen('quiz'); }} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Physical Therapy</Text>
        <Text style={styles.subtitle}>Select the area you want to work on</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {bodyParts.map(part => (
            <TouchableOpacity key={part} style={styles.card} onPress={() => {
              setPlan(PT_PLANS[part]);
              setAnswers(a => ({ ...a, ptBodyPart: part }));
              setScreen('plan');
            }}>
              <View style={styles.cardRow}>
                <Text style={styles.dayTitle}>{part}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              <Text style={styles.exerciseCount}>{PT_PLANS[part].length} phases</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Plan Overview Screen ─────────────────────────────────
  if (screen === 'plan') {
    const isPT = answers.goal === 'Physical Therapy';
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => isPT ? setScreen('physicalTherapy') : restart()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isPT ? `${answers.ptBodyPart} Rehab` : 'Your Workout Plan'}</Text>
        <Text style={styles.subtitle}>{isPT ? answers.name : (answers.goal === 'Building Muscle - Men' || answers.goal === 'Building Muscle - Women') ? `${answers.name}'s ${answers.goal} Plan` : `${answers.name}'s ${answers.goal} Plan · ${answers.level}`}</Text>
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
        <TouchableOpacity onPress={() => setScreen('plan')} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back to Plan</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{selectedDay.day}</Text>
        <FlatList
          data={selectedDay.exercises}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => {
            const entryCount = (logs[logKey(selectedDay.day, item)] || []).length;
            return (
              <View style={styles.exerciseCard}>
                <View style={styles.exerciseCardTop}>
                  <ExerciseImage exerciseName={item} />
                  <View style={styles.exerciseCardInfo}>
                    <Text style={styles.exerciseName}>{item}</Text>
                    <Text style={styles.logCount}>
                      {entryCount > 0 ? `${entryCount} week${entryCount > 1 ? 's' : ''} logged` : 'No logs yet'}
                    </Text>
                  </View>
                </View>
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
        <TouchableOpacity onPress={() => setScreen('day')} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back to {selectedDay.day.split(' – ')[0]}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.progressHeader}>
            <ExerciseImage exerciseName={selectedExercise} />
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
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
  exerciseCardInfo: { flex: 1 },
  exImgBox: { width: 150, height: 90, borderRadius: 8, backgroundColor: COLORS.input, justifyContent: 'center', alignItems: 'center' },
  exImgEmoji: { fontSize: 36 },
  exImg: { width: 150, height: 90, borderRadius: 8, overflow: 'hidden' },
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
  exerciseName: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
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
