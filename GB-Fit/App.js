import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

const MEAL_TYPES = [
  { id: 'breakfast', name: 'Breakfast', icon: '🌅' },
  { id: 'lunch',     name: 'Lunch',     icon: '☀️' },
  { id: 'dinner',    name: 'Dinner',    icon: '🌙' },
  { id: 'snacks',    name: 'Snacks',    icon: '🍎' },
];

const FOOD_DATABASE = [
  // ── Staples ───────────────────────────────────────────────
  { name: 'Chicken Breast',      unit: '100g',        calories: 165, protein: 31, carbs: 0,  fats: 4  },
  { name: 'Chicken Thigh',       unit: '100g',        calories: 209, protein: 26, carbs: 0,  fats: 11 },
  { name: 'Rice, White',         unit: '100g cooked', calories: 130, protein: 3,  carbs: 28, fats: 0  },
  { name: 'Rice, Brown',         unit: '100g cooked', calories: 123, protein: 3,  carbs: 26, fats: 1  },
  { name: 'Oats',                unit: '100g dry',    calories: 389, protein: 17, carbs: 66, fats: 7  },
  { name: 'Egg',                 unit: 'large egg',   calories: 78,  protein: 6,  carbs: 1,  fats: 5  },
  { name: 'Egg Whites',          unit: '100g',        calories: 52,  protein: 11, carbs: 1,  fats: 0  },
  { name: 'Greek Yogurt',        unit: '170g serving',calories: 100, protein: 17, carbs: 6,  fats: 0  },
  { name: 'Cottage Cheese',      unit: '100g',        calories: 98,  protein: 11, carbs: 3,  fats: 5  },
  { name: 'Whole Milk',          unit: '240ml',       calories: 149, protein: 8,  carbs: 12, fats: 8  },
  { name: 'Whey Protein',        unit: 'scoop',       calories: 120, protein: 25, carbs: 3,  fats: 2  },
  { name: 'Salmon',              unit: '100g',        calories: 208, protein: 20, carbs: 0,  fats: 13 },
  { name: 'Tuna, Canned',        unit: '142g can',    calories: 132, protein: 29, carbs: 0,  fats: 1  },
  { name: 'Ground Beef 70/30',   unit: '100g',        calories: 332, protein: 17, carbs: 0,  fats: 29 },
  { name: 'Ground Beef 80/20',   unit: '100g',        calories: 254, protein: 21, carbs: 0,  fats: 18 },
  { name: 'Ground Beef 85/15',   unit: '100g',        calories: 215, protein: 23, carbs: 0,  fats: 13 },
  { name: 'Ground Beef 90/10',   unit: '100g',        calories: 176, protein: 26, carbs: 0,  fats: 8  },
  { name: 'Ground Beef 93/7',    unit: '100g',        calories: 152, protein: 27, carbs: 0,  fats: 5  },
  { name: 'Ground Beef 96/4',    unit: '100g',        calories: 130, protein: 28, carbs: 0,  fats: 2  },
  { name: 'Sweet Potato',        unit: '100g',        calories: 86,  protein: 2,  carbs: 20, fats: 0  },
  { name: 'Potato, Boiled',      unit: '100g',        calories: 87,  protein: 2,  carbs: 20, fats: 0  },
  { name: 'Pasta',               unit: '100g dry',    calories: 371, protein: 13, carbs: 74, fats: 2  },
  { name: 'Bread',               unit: 'slice',       calories: 79,  protein: 3,  carbs: 15, fats: 1  },
  { name: 'Banana',              unit: 'medium',      calories: 105, protein: 1,  carbs: 27, fats: 0  },
  { name: 'Apple',               unit: 'medium',      calories: 95,  protein: 0,  carbs: 25, fats: 0  },
  { name: 'Blueberries',         unit: '100g',        calories: 57,  protein: 1,  carbs: 14, fats: 0  },
  { name: 'Broccoli',            unit: '100g',        calories: 34,  protein: 3,  carbs: 7,  fats: 0  },
  { name: 'Spinach',             unit: '100g',        calories: 23,  protein: 3,  carbs: 4,  fats: 0  },
  { name: 'Almonds',             unit: '30g',         calories: 174, protein: 6,  carbs: 6,  fats: 15 },
  { name: 'Peanut Butter',       unit: '2 tbsp',      calories: 188, protein: 8,  carbs: 6,  fats: 16 },
  { name: 'Avocado',             unit: 'half',        calories: 120, protein: 1,  carbs: 6,  fats: 11 },
  { name: 'Olive Oil',           unit: 'tbsp',        calories: 119, protein: 0,  carbs: 0,  fats: 14 },
  { name: 'Cheddar Cheese',      unit: '30g',         calories: 120, protein: 7,  carbs: 0,  fats: 10 },

  // ── Proteins ──────────────────────────────────────────────
  { name: 'Ground Turkey 93%',   unit: '100g',        calories: 148, protein: 21, carbs: 0,  fats: 7  },
  { name: 'Tilapia',             unit: '100g',        calories: 96,  protein: 20, carbs: 0,  fats: 2  },
  { name: 'Shrimp',              unit: '100g',        calories: 85,  protein: 18, carbs: 1,  fats: 1  },
  { name: 'Salmon, Canned',      unit: '100g',        calories: 142, protein: 20, carbs: 0,  fats: 6  },
  { name: 'Beef Jerky',          unit: '30g',         calories: 82,  protein: 13, carbs: 5,  fats: 1  },
  { name: 'Turkey Breast, Deli', unit: '100g',        calories: 90,  protein: 19, carbs: 2,  fats: 1  },
  { name: 'Edamame',             unit: '100g',        calories: 121, protein: 11, carbs: 9,  fats: 5  },
  { name: 'Tofu, Firm',          unit: '100g',        calories: 76,  protein: 8,  carbs: 2,  fats: 4  },
  { name: 'Deli Ham',            unit: '100g',        calories: 103, protein: 17, carbs: 2,  fats: 3  },

  // ── Dairy / Eggs ──────────────────────────────────────────
  { name: 'Butter',              unit: 'tbsp',        calories: 102, protein: 0,  carbs: 0,  fats: 12 },
  { name: 'Heavy Cream',         unit: 'tbsp',        calories: 52,  protein: 0,  carbs: 0,  fats: 6  },
  { name: 'Half & Half',         unit: 'tbsp',        calories: 20,  protein: 0,  carbs: 1,  fats: 2  },
  { name: 'Milk, 2%',            unit: '240ml',       calories: 122, protein: 8,  carbs: 12, fats: 5  },
  { name: 'Skim Milk',           unit: '240ml',       calories: 83,  protein: 8,  carbs: 12, fats: 0  },
  { name: 'Cream Cheese',        unit: 'tbsp',        calories: 51,  protein: 1,  carbs: 1,  fats: 5  },
  { name: 'Sour Cream',          unit: '2 tbsp',      calories: 60,  protein: 1,  carbs: 1,  fats: 6  },
  { name: 'Ricotta',             unit: '100g',        calories: 174, protein: 11, carbs: 3,  fats: 13 },
  { name: 'Greek Yogurt, Fat Free', unit: '170g',     calories: 90,  protein: 16, carbs: 7,  fats: 0  },
  { name: 'Kefir',               unit: '240ml',       calories: 110, protein: 9,  carbs: 12, fats: 2  },
  { name: 'Mozzarella, Whole',   unit: '30g',         calories: 85,  protein: 6,  carbs: 1,  fats: 6  },
  { name: 'Mozzarella, Part Skim', unit: '30g',       calories: 72,  protein: 7,  carbs: 1,  fats: 5  },
  { name: 'Swiss Cheese',        unit: '30g',         calories: 111, protein: 8,  carbs: 0,  fats: 9  },
  { name: 'Parmesan',            unit: 'tbsp',        calories: 22,  protein: 2,  carbs: 0,  fats: 1  },
  { name: 'String Cheese',       unit: 'stick',       calories: 80,  protein: 7,  carbs: 1,  fats: 5  },
  { name: 'Casein Protein',      unit: 'scoop',       calories: 120, protein: 24, carbs: 4,  fats: 1  },

  // ── Carbs / Grains ────────────────────────────────────────
  { name: 'Cream of Rice',       unit: '100g dry',    calories: 363, protein: 7,  carbs: 80, fats: 1  },
  { name: 'Bagel, White',        unit: 'medium bagel',calories: 270, protein: 10, carbs: 53, fats: 2  },
  { name: 'Corn Tortilla',       unit: 'tortilla',    calories: 52,  protein: 1,  carbs: 11, fats: 1  },
  { name: 'Jasmine Rice',        unit: '100g cooked', calories: 130, protein: 3,  carbs: 28, fats: 0  },
  { name: 'Quinoa',              unit: '100g cooked', calories: 120, protein: 4,  carbs: 21, fats: 2  },
  { name: 'Rice Cakes',          unit: '2 cakes',     calories: 70,  protein: 1,  carbs: 15, fats: 0  },
  { name: 'Baby Potatoes',       unit: '100g',        calories: 77,  protein: 2,  carbs: 17, fats: 0  },
  { name: 'Sourdough Bread',     unit: 'slice',       calories: 93,  protein: 4,  carbs: 18, fats: 1  },
  { name: 'Mass Gainer',         unit: '100g scoop',  calories: 380, protein: 20, carbs: 70, fats: 4  },

  // ── Fats / Snacks ─────────────────────────────────────────
  { name: 'Cashews',             unit: '30g',         calories: 163, protein: 4,  carbs: 9,  fats: 13 },
  { name: 'Walnuts',             unit: '30g',         calories: 196, protein: 5,  carbs: 4,  fats: 20 },
  { name: 'Mixed Nuts',          unit: '30g',         calories: 173, protein: 5,  carbs: 6,  fats: 16 },
  { name: 'Peanuts',             unit: '30g',         calories: 170, protein: 7,  carbs: 5,  fats: 15 },
  { name: 'Sunflower Seeds',     unit: '30g',         calories: 175, protein: 6,  carbs: 6,  fats: 15 },
  { name: 'Dark Chocolate 70%',  unit: '30g',         calories: 170, protein: 2,  carbs: 13, fats: 12 },
  { name: 'Hummus',              unit: '2 tbsp',      calories: 70,  protein: 2,  carbs: 6,  fats: 5  },

  // ── Supplements ───────────────────────────────────────────
  { name: 'BCAAs',               unit: '10g',         calories: 5,   protein: 1,  carbs: 0,  fats: 0  },
  { name: 'Creatine',            unit: '5g',          calories: 0,   protein: 0,  carbs: 0,  fats: 0  },

  // ── Fruits ────────────────────────────────────────────────
  { name: 'Strawberries',        unit: '100g',        calories: 32,  protein: 1,  carbs: 8,  fats: 0  },
  { name: 'Mango',               unit: '100g',        calories: 60,  protein: 1,  carbs: 15, fats: 0  },
  { name: 'Pineapple',           unit: '100g',        calories: 50,  protein: 1,  carbs: 13, fats: 0  },
  { name: 'Grapes',              unit: '100g',        calories: 69,  protein: 1,  carbs: 18, fats: 0  },
  { name: 'Orange',              unit: 'medium',      calories: 62,  protein: 1,  carbs: 15, fats: 0  },
  { name: 'Watermelon',          unit: '100g',        calories: 30,  protein: 1,  carbs: 8,  fats: 0  },
  { name: 'Peach',               unit: 'medium',      calories: 59,  protein: 1,  carbs: 14, fats: 0  },
  { name: 'Raspberries',         unit: '100g',        calories: 52,  protein: 1,  carbs: 12, fats: 1  },
  { name: 'Kiwi',                unit: 'medium',      calories: 42,  protein: 1,  carbs: 10, fats: 0  },
  { name: 'Cherries',            unit: '100g',        calories: 63,  protein: 1,  carbs: 16, fats: 0  },
  { name: 'Pear',                unit: 'medium',      calories: 101, protein: 1,  carbs: 27, fats: 0  },
  { name: 'Grapefruit',          unit: 'half',        calories: 52,  protein: 1,  carbs: 13, fats: 0  },

  // ── Vegetables ────────────────────────────────────────────
  { name: 'Sweet Corn',          unit: '100g',        calories: 86,  protein: 3,  carbs: 19, fats: 1  },
  { name: 'Green Beans',         unit: '100g',        calories: 31,  protein: 2,  carbs: 7,  fats: 0  },
  { name: 'Asparagus',           unit: '100g',        calories: 20,  protein: 2,  carbs: 4,  fats: 0  },
  { name: 'Zucchini',            unit: '100g',        calories: 17,  protein: 1,  carbs: 3,  fats: 0  },
  { name: 'Bell Pepper',         unit: 'medium',      calories: 31,  protein: 1,  carbs: 7,  fats: 0  },
  { name: 'Cucumber',            unit: '100g',        calories: 15,  protein: 1,  carbs: 4,  fats: 0  },
  { name: 'Carrot',              unit: 'medium',      calories: 25,  protein: 1,  carbs: 6,  fats: 0  },
  { name: 'Kale',                unit: '100g',        calories: 49,  protein: 4,  carbs: 9,  fats: 1  },
  { name: 'Mushrooms',           unit: '100g',        calories: 22,  protein: 3,  carbs: 3,  fats: 0  },
  { name: 'Cauliflower',         unit: '100g',        calories: 25,  protein: 2,  carbs: 5,  fats: 0  },
  { name: 'Peas',                unit: '100g',        calories: 81,  protein: 5,  carbs: 14, fats: 0  },
  { name: 'Celery',              unit: '100g',        calories: 16,  protein: 1,  carbs: 3,  fats: 0  },
  { name: 'Tomato',              unit: 'medium',      calories: 22,  protein: 1,  carbs: 5,  fats: 0  },
  { name: 'Brussels Sprouts',    unit: '100g',        calories: 43,  protein: 3,  carbs: 9,  fats: 0  },

  // ── Beef Cuts ─────────────────────────────────────────────
  { name: 'Sirloin Steak',       unit: '100g',        calories: 207, protein: 26, carbs: 0,  fats: 11 },
  { name: 'Ribeye Steak',        unit: '100g',        calories: 291, protein: 24, carbs: 0,  fats: 21 },
  { name: 'Flank Steak',         unit: '100g',        calories: 192, protein: 27, carbs: 0,  fats: 9  },
  { name: 'Beef Tenderloin',     unit: '100g',        calories: 215, protein: 26, carbs: 0,  fats: 12 },
  { name: 'T-Bone Steak',        unit: '100g',        calories: 247, protein: 24, carbs: 0,  fats: 16 },
  { name: 'NY Strip Steak',      unit: '100g',        calories: 271, protein: 27, carbs: 0,  fats: 17 },
  { name: 'Beef Brisket',        unit: '100g',        calories: 263, protein: 22, carbs: 0,  fats: 19 },
  { name: 'Bison, Ground',       unit: '100g',        calories: 175, protein: 24, carbs: 0,  fats: 8  },
  { name: 'Venison',             unit: '100g',        calories: 158, protein: 30, carbs: 0,  fats: 3  },
  { name: 'Lamb, Ground',        unit: '100g',        calories: 258, protein: 17, carbs: 0,  fats: 21 },
  { name: 'Lamb Chops',          unit: '100g',        calories: 294, protein: 25, carbs: 0,  fats: 21 },

  // ── Pork ──────────────────────────────────────────────────
  { name: 'Pork Tenderloin',     unit: '100g',        calories: 143, protein: 26, carbs: 0,  fats: 4  },
  { name: 'Pork Chop',           unit: '100g',        calories: 231, protein: 25, carbs: 0,  fats: 14 },
  { name: 'Bacon',               unit: '3 strips',    calories: 137, protein: 9,  carbs: 0,  fats: 11 },
  { name: 'Canadian Bacon',      unit: '2 slices',    calories: 68,  protein: 11, carbs: 1,  fats: 2  },
  { name: 'Pork Belly',          unit: '100g',        calories: 518, protein: 9,  carbs: 0,  fats: 53 },
  { name: 'Pork Sausage',        unit: '100g',        calories: 378, protein: 14, carbs: 1,  fats: 35 },
  { name: 'Breakfast Sausage',   unit: '2 links',     calories: 186, protein: 7,  carbs: 1,  fats: 17 },
  { name: 'Ham, Cooked',         unit: '100g',        calories: 163, protein: 22, carbs: 1,  fats: 8  },
  { name: 'Prosciutto',          unit: '30g',         calories: 87,  protein: 8,  carbs: 0,  fats: 6  },
  { name: 'Hot Dog',             unit: '1 frank',     calories: 130, protein: 5,  carbs: 2,  fats: 11 },

  // ── Poultry ───────────────────────────────────────────────
  { name: 'Chicken Wings',       unit: '100g',        calories: 266, protein: 21, carbs: 0,  fats: 19 },
  { name: 'Chicken Drumstick',   unit: '100g',        calories: 216, protein: 24, carbs: 0,  fats: 13 },
  { name: 'Rotisserie Chicken',  unit: '100g',        calories: 190, protein: 24, carbs: 0,  fats: 10 },
  { name: 'Ground Turkey 85%',   unit: '100g',        calories: 196, protein: 22, carbs: 0,  fats: 12 },
  { name: 'Duck Breast',         unit: '100g',        calories: 201, protein: 28, carbs: 0,  fats: 10 },

  // ── Seafood ───────────────────────────────────────────────
  { name: 'Cod',                 unit: '100g',        calories: 82,  protein: 18, carbs: 0,  fats: 1  },
  { name: 'Halibut',             unit: '100g',        calories: 111, protein: 23, carbs: 0,  fats: 2  },
  { name: 'Sardines, Canned',    unit: '100g',        calories: 208, protein: 25, carbs: 0,  fats: 11 },
  { name: 'Mackerel',            unit: '100g',        calories: 205, protein: 19, carbs: 0,  fats: 14 },
  { name: 'Trout',               unit: '100g',        calories: 168, protein: 23, carbs: 0,  fats: 8  },
  { name: 'Mahi-Mahi',           unit: '100g',        calories: 109, protein: 24, carbs: 0,  fats: 1  },
  { name: 'Swordfish',           unit: '100g',        calories: 144, protein: 20, carbs: 0,  fats: 7  },
  { name: 'Sea Bass',            unit: '100g',        calories: 97,  protein: 18, carbs: 0,  fats: 2  },
  { name: 'Snapper',             unit: '100g',        calories: 128, protein: 26, carbs: 0,  fats: 2  },
  { name: 'Crab, King',          unit: '100g',        calories: 97,  protein: 19, carbs: 0,  fats: 2  },
  { name: 'Lobster',             unit: '100g',        calories: 89,  protein: 19, carbs: 0,  fats: 1  },
  { name: 'Scallops',            unit: '100g',        calories: 111, protein: 21, carbs: 5,  fats: 1  },
  { name: 'Clams',               unit: '100g',        calories: 148, protein: 26, carbs: 5,  fats: 2  },
  { name: 'Oysters',             unit: '100g',        calories: 68,  protein: 7,  carbs: 4,  fats: 2  },
  { name: 'Mussels',             unit: '100g',        calories: 172, protein: 24, carbs: 7,  fats: 5  },

  // ── Deli / Processed Meats ────────────────────────────────
  { name: 'Salami',              unit: '30g',         calories: 119, protein: 5,  carbs: 1,  fats: 11 },
  { name: 'Pepperoni',           unit: '30g',         calories: 138, protein: 6,  carbs: 1,  fats: 12 },
  { name: 'Roast Beef, Deli',    unit: '100g',        calories: 131, protein: 22, carbs: 1,  fats: 4  },
  { name: 'Bologna',             unit: '30g',         calories: 88,  protein: 3,  carbs: 1,  fats: 8  },
  { name: 'Chorizo',             unit: '100g',        calories: 455, protein: 24, carbs: 2,  fats: 39 },

  // ── Plant Proteins ────────────────────────────────────────
  { name: 'Tempeh',              unit: '100g',        calories: 193, protein: 19, carbs: 9,  fats: 11 },
  { name: 'Seitan',              unit: '100g',        calories: 370, protein: 75, carbs: 14, fats: 2  },
  { name: 'Pea Protein',         unit: 'scoop',       calories: 120, protein: 27, carbs: 2,  fats: 1  },
  { name: 'Lentils, Cooked',     unit: '100g',        calories: 116, protein: 9,  carbs: 20, fats: 0  },
  { name: 'Black Beans',         unit: '100g cooked', calories: 132, protein: 9,  carbs: 24, fats: 0  },
  { name: 'Chickpeas',           unit: '100g cooked', calories: 164, protein: 9,  carbs: 27, fats: 3  },
  { name: 'Kidney Beans',        unit: '100g cooked', calories: 127, protein: 9,  carbs: 23, fats: 0  },
  { name: 'White Beans',         unit: '100g cooked', calories: 139, protein: 10, carbs: 25, fats: 0  },
  { name: 'Pinto Beans',         unit: '100g cooked', calories: 143, protein: 9,  carbs: 26, fats: 1  },
  { name: 'Soybeans, Cooked',    unit: '100g',        calories: 173, protein: 17, carbs: 10, fats: 9  },
  { name: 'Lima Beans',          unit: '100g cooked', calories: 115, protein: 8,  carbs: 21, fats: 0  },
  { name: 'Refried Beans',       unit: '100g',        calories: 90,  protein: 5,  carbs: 14, fats: 2  },
  { name: 'Falafel',             unit: '3 pieces',    calories: 333, protein: 13, carbs: 32, fats: 18 },

  // ── More Cheese ───────────────────────────────────────────
  { name: 'Gouda',               unit: '30g',         calories: 101, protein: 7,  carbs: 1,  fats: 8  },
  { name: 'Feta',                unit: '30g',         calories: 75,  protein: 4,  carbs: 1,  fats: 6  },
  { name: 'Blue Cheese',         unit: '30g',         calories: 100, protein: 6,  carbs: 1,  fats: 8  },
  { name: 'Provolone',           unit: '30g',         calories: 100, protein: 7,  carbs: 1,  fats: 8  },
  { name: 'Brie',                unit: '30g',         calories: 101, protein: 6,  carbs: 0,  fats: 8  },
  { name: 'American Cheese',     unit: '1 slice',     calories: 71,  protein: 4,  carbs: 1,  fats: 5  },
  { name: 'Monterey Jack',       unit: '30g',         calories: 106, protein: 7,  carbs: 0,  fats: 9  },
  { name: 'Pepper Jack',         unit: '30g',         calories: 106, protein: 7,  carbs: 0,  fats: 9  },
  { name: 'Colby Jack',          unit: '30g',         calories: 110, protein: 7,  carbs: 0,  fats: 9  },
  { name: 'Havarti',             unit: '30g',         calories: 120, protein: 7,  carbs: 0,  fats: 10 },

  // ── More Grains ───────────────────────────────────────────
  { name: 'Farro, Cooked',       unit: '100g',        calories: 170, protein: 6,  carbs: 34, fats: 1  },
  { name: 'Barley, Cooked',      unit: '100g',        calories: 123, protein: 2,  carbs: 28, fats: 0  },
  { name: 'Bulgur, Cooked',      unit: '100g',        calories: 83,  protein: 3,  carbs: 19, fats: 0  },
  { name: 'Millet, Cooked',      unit: '100g',        calories: 119, protein: 4,  carbs: 24, fats: 1  },
  { name: 'Buckwheat, Cooked',   unit: '100g',        calories: 92,  protein: 3,  carbs: 20, fats: 1  },
  { name: 'Couscous, Cooked',    unit: '100g',        calories: 112, protein: 4,  carbs: 23, fats: 0  },
  { name: 'Amaranth, Cooked',    unit: '100g',        calories: 102, protein: 4,  carbs: 19, fats: 2  },
  { name: 'Oatmeal, Cooked',     unit: '100g',        calories: 71,  protein: 2,  carbs: 12, fats: 1  },
  { name: 'Granola',             unit: '100g',        calories: 471, protein: 10, carbs: 64, fats: 20 },
  { name: 'Cornmeal',            unit: '100g dry',    calories: 362, protein: 8,  carbs: 77, fats: 4  },
  { name: 'Polenta, Cooked',     unit: '100g',        calories: 71,  protein: 2,  carbs: 14, fats: 1  },
  { name: 'English Muffin',      unit: '1 muffin',    calories: 132, protein: 5,  carbs: 26, fats: 1  },
  { name: 'Pita Bread',          unit: '1 pita',      calories: 165, protein: 5,  carbs: 33, fats: 1  },
  { name: 'Naan',                unit: '1 piece',     calories: 262, protein: 9,  carbs: 45, fats: 5  },
  { name: 'Whole Wheat Bread',   unit: 'slice',       calories: 69,  protein: 4,  carbs: 12, fats: 1  },
  { name: 'Rye Bread',           unit: 'slice',       calories: 65,  protein: 2,  carbs: 12, fats: 1  },
  { name: 'Flour Tortilla',      unit: '8" tortilla', calories: 146, protein: 4,  carbs: 26, fats: 3  },
  { name: 'Soba Noodles',        unit: '100g cooked', calories: 99,  protein: 5,  carbs: 21, fats: 0  },
  { name: 'Rice Noodles',        unit: '100g cooked', calories: 108, protein: 2,  carbs: 25, fats: 0  },
  { name: 'Udon Noodles',        unit: '100g cooked', calories: 132, protein: 4,  carbs: 28, fats: 0  },

  // ── More Fruits ───────────────────────────────────────────
  { name: 'Dates',               unit: '3 dates',     calories: 83,  protein: 1,  carbs: 22, fats: 0  },
  { name: 'Figs, Dried',         unit: '30g',         calories: 74,  protein: 1,  carbs: 19, fats: 0  },
  { name: 'Prunes',              unit: '3 prunes',    calories: 71,  protein: 1,  carbs: 19, fats: 0  },
  { name: 'Pomegranate',         unit: '100g',        calories: 83,  protein: 2,  carbs: 19, fats: 1  },
  { name: 'Papaya',              unit: '100g',        calories: 43,  protein: 0,  carbs: 11, fats: 0  },
  { name: 'Guava',               unit: '100g',        calories: 68,  protein: 3,  carbs: 14, fats: 1  },
  { name: 'Lychee',              unit: '100g',        calories: 66,  protein: 1,  carbs: 17, fats: 0  },
  { name: 'Dragon Fruit',        unit: '100g',        calories: 60,  protein: 1,  carbs: 13, fats: 0  },
  { name: 'Blackberries',        unit: '100g',        calories: 43,  protein: 1,  carbs: 10, fats: 0  },
  { name: 'Cranberries',         unit: '100g',        calories: 46,  protein: 0,  carbs: 12, fats: 0  },
  { name: 'Coconut, Shredded',   unit: '30g',         calories: 100, protein: 1,  carbs: 5,  fats: 9  },
  { name: 'Plantain, Cooked',    unit: '100g',        calories: 116, protein: 1,  carbs: 30, fats: 0  },
  { name: 'Cantaloupe',          unit: '100g',        calories: 34,  protein: 1,  carbs: 8,  fats: 0  },
  { name: 'Honeydew',            unit: '100g',        calories: 36,  protein: 1,  carbs: 9,  fats: 0  },
  { name: 'Apricot',             unit: 'medium',      calories: 17,  protein: 0,  carbs: 4,  fats: 0  },
  { name: 'Plum',                unit: 'medium',      calories: 30,  protein: 0,  carbs: 8,  fats: 0  },
  { name: 'Nectarine',           unit: 'medium',      calories: 62,  protein: 1,  carbs: 15, fats: 0  },
  { name: 'Tangerine',           unit: 'medium',      calories: 47,  protein: 1,  carbs: 12, fats: 0  },
  { name: 'Coconut Milk',        unit: '100ml',       calories: 197, protein: 2,  carbs: 6,  fats: 21 },
  { name: 'Passion Fruit',       unit: '100g',        calories: 97,  protein: 2,  carbs: 23, fats: 1  },

  // ── More Vegetables ───────────────────────────────────────
  { name: 'Artichoke',           unit: 'medium',      calories: 60,  protein: 4,  carbs: 13, fats: 0  },
  { name: 'Beets',               unit: '100g',        calories: 43,  protein: 2,  carbs: 10, fats: 0  },
  { name: 'Bok Choy',            unit: '100g',        calories: 13,  protein: 1,  carbs: 2,  fats: 0  },
  { name: 'Cabbage, Green',      unit: '100g',        calories: 25,  protein: 1,  carbs: 6,  fats: 0  },
  { name: 'Cabbage, Red',        unit: '100g',        calories: 31,  protein: 1,  carbs: 7,  fats: 0  },
  { name: 'Collard Greens',      unit: '100g',        calories: 32,  protein: 3,  carbs: 6,  fats: 0  },
  { name: 'Eggplant',            unit: '100g',        calories: 25,  protein: 1,  carbs: 6,  fats: 0  },
  { name: 'Leek',                unit: '100g',        calories: 61,  protein: 2,  carbs: 14, fats: 0  },
  { name: 'Okra',                unit: '100g',        calories: 33,  protein: 2,  carbs: 7,  fats: 0  },
  { name: 'Parsnip',             unit: '100g',        calories: 75,  protein: 1,  carbs: 18, fats: 0  },
  { name: 'Swiss Chard',         unit: '100g',        calories: 19,  protein: 2,  carbs: 4,  fats: 0  },
  { name: 'Turnip',              unit: '100g',        calories: 28,  protein: 1,  carbs: 6,  fats: 0  },
  { name: 'Radish',              unit: '100g',        calories: 16,  protein: 1,  carbs: 3,  fats: 0  },
  { name: 'Butternut Squash',    unit: '100g',        calories: 45,  protein: 1,  carbs: 12, fats: 0  },
  { name: 'Acorn Squash',        unit: '100g',        calories: 40,  protein: 1,  carbs: 10, fats: 0  },
  { name: 'Spaghetti Squash',    unit: '100g',        calories: 31,  protein: 1,  carbs: 7,  fats: 0  },
  { name: 'Fennel',              unit: '100g',        calories: 31,  protein: 1,  carbs: 7,  fats: 0  },
  { name: 'Snap Peas',           unit: '100g',        calories: 42,  protein: 3,  carbs: 8,  fats: 0  },
  { name: 'Watercress',          unit: '100g',        calories: 11,  protein: 2,  carbs: 1,  fats: 0  },
  { name: 'Arugula',             unit: '100g',        calories: 25,  protein: 3,  carbs: 4,  fats: 1  },
  { name: 'Romaine Lettuce',     unit: '100g',        calories: 17,  protein: 1,  carbs: 3,  fats: 0  },
  { name: 'Iceberg Lettuce',     unit: '100g',        calories: 14,  protein: 1,  carbs: 3,  fats: 0  },
  { name: 'Onion, Yellow',       unit: '100g',        calories: 40,  protein: 1,  carbs: 9,  fats: 0  },
  { name: 'Red Onion',           unit: '100g',        calories: 40,  protein: 1,  carbs: 9,  fats: 0  },
  { name: 'Green Onion',         unit: '100g',        calories: 32,  protein: 2,  carbs: 7,  fats: 0  },
  { name: 'Garlic',              unit: '1 clove',     calories: 4,   protein: 0,  carbs: 1,  fats: 0  },
  { name: 'Ginger',              unit: '100g',        calories: 80,  protein: 2,  carbs: 18, fats: 1  },
  { name: 'Jalapeño',            unit: '1 pepper',    calories: 4,   protein: 0,  carbs: 1,  fats: 0  },
  { name: 'Corn, Canned',        unit: '100g',        calories: 86,  protein: 3,  carbs: 19, fats: 1  },

  // ── More Nuts & Seeds ─────────────────────────────────────
  { name: 'Pistachios',          unit: '30g',         calories: 159, protein: 6,  carbs: 8,  fats: 13 },
  { name: 'Brazil Nuts',         unit: '30g',         calories: 196, protein: 4,  carbs: 4,  fats: 20 },
  { name: 'Hazelnuts',           unit: '30g',         calories: 188, protein: 4,  carbs: 5,  fats: 18 },
  { name: 'Macadamia Nuts',      unit: '30g',         calories: 204, protein: 2,  carbs: 4,  fats: 22 },
  { name: 'Pine Nuts',           unit: '30g',         calories: 204, protein: 4,  carbs: 4,  fats: 21 },
  { name: 'Pecans',              unit: '30g',         calories: 210, protein: 3,  carbs: 4,  fats: 22 },
  { name: 'Chia Seeds',          unit: '2 tbsp',      calories: 97,  protein: 3,  carbs: 8,  fats: 6  },
  { name: 'Flaxseeds, Ground',   unit: '2 tbsp',      calories: 75,  protein: 3,  carbs: 4,  fats: 6  },
  { name: 'Hemp Seeds',          unit: '3 tbsp',      calories: 166, protein: 10, carbs: 3,  fats: 13 },
  { name: 'Pumpkin Seeds',       unit: '30g',         calories: 163, protein: 9,  carbs: 4,  fats: 14 },
  { name: 'Sesame Seeds',        unit: 'tbsp',        calories: 52,  protein: 2,  carbs: 2,  fats: 4  },
  { name: 'Almond Butter',       unit: '2 tbsp',      calories: 196, protein: 7,  carbs: 6,  fats: 18 },
  { name: 'Tahini',              unit: 'tbsp',        calories: 89,  protein: 3,  carbs: 3,  fats: 8  },

  // ── Oils & Cooking Fats ───────────────────────────────────
  { name: 'Coconut Oil',         unit: 'tbsp',        calories: 121, protein: 0,  carbs: 0,  fats: 14 },
  { name: 'Avocado Oil',         unit: 'tbsp',        calories: 124, protein: 0,  carbs: 0,  fats: 14 },
  { name: 'Ghee',                unit: 'tbsp',        calories: 130, protein: 0,  carbs: 0,  fats: 15 },
  { name: 'Sesame Oil',          unit: 'tbsp',        calories: 120, protein: 0,  carbs: 0,  fats: 14 },
  { name: 'Canola Oil',          unit: 'tbsp',        calories: 124, protein: 0,  carbs: 0,  fats: 14 },

  // ── Condiments & Sauces ───────────────────────────────────
  { name: 'Ketchup',             unit: 'tbsp',        calories: 19,  protein: 0,  carbs: 5,  fats: 0  },
  { name: 'Mustard, Yellow',     unit: 'tbsp',        calories: 9,   protein: 1,  carbs: 1,  fats: 1  },
  { name: 'Mayonnaise',          unit: 'tbsp',        calories: 94,  protein: 0,  carbs: 0,  fats: 10 },
  { name: 'Ranch Dressing',      unit: '2 tbsp',      calories: 145, protein: 1,  carbs: 2,  fats: 15 },
  { name: 'BBQ Sauce',           unit: '2 tbsp',      calories: 60,  protein: 1,  carbs: 13, fats: 0  },
  { name: 'Hot Sauce',           unit: 'tsp',         calories: 1,   protein: 0,  carbs: 0,  fats: 0  },
  { name: 'Soy Sauce',           unit: 'tbsp',        calories: 10,  protein: 2,  carbs: 1,  fats: 0  },
  { name: 'Teriyaki Sauce',      unit: '2 tbsp',      calories: 62,  protein: 1,  carbs: 14, fats: 0  },
  { name: 'Salsa',               unit: '2 tbsp',      calories: 10,  protein: 0,  carbs: 2,  fats: 0  },
  { name: 'Honey',               unit: 'tbsp',        calories: 64,  protein: 0,  carbs: 17, fats: 0  },
  { name: 'Maple Syrup',         unit: 'tbsp',        calories: 52,  protein: 0,  carbs: 13, fats: 0  },
  { name: 'Sriracha',            unit: 'tbsp',        calories: 15,  protein: 0,  carbs: 3,  fats: 0  },
  { name: 'Worcestershire',      unit: 'tbsp',        calories: 13,  protein: 0,  carbs: 3,  fats: 0  },
  { name: 'Apple Cider Vinegar', unit: 'tbsp',        calories: 3,   protein: 0,  carbs: 0,  fats: 0  },
  { name: 'Tzatziki',            unit: '2 tbsp',      calories: 20,  protein: 1,  carbs: 1,  fats: 2  },
  { name: 'Guacamole',           unit: '2 tbsp',      calories: 50,  protein: 1,  carbs: 3,  fats: 4  },
  { name: 'Miso Paste',          unit: 'tbsp',        calories: 34,  protein: 2,  carbs: 5,  fats: 1  },
  { name: 'Pesto',               unit: '2 tbsp',      calories: 160, protein: 4,  carbs: 2,  fats: 15 },
  { name: 'Marinara Sauce',      unit: '100g',        calories: 53,  protein: 2,  carbs: 9,  fats: 1  },
  { name: 'Olive Tapenade',      unit: '2 tbsp',      calories: 44,  protein: 0,  carbs: 2,  fats: 4  },

  // ── Beverages ─────────────────────────────────────────────
  { name: 'Coffee, Black',       unit: '240ml',       calories: 2,   protein: 0,  carbs: 0,  fats: 0  },
  { name: 'Green Tea',           unit: '240ml',       calories: 2,   protein: 0,  carbs: 0,  fats: 0  },
  { name: 'Orange Juice',        unit: '240ml',       calories: 112, protein: 2,  carbs: 26, fats: 0  },
  { name: 'Apple Juice',         unit: '240ml',       calories: 114, protein: 0,  carbs: 28, fats: 0  },
  { name: 'Sports Drink',        unit: '360ml',       calories: 80,  protein: 0,  carbs: 22, fats: 0  },
  { name: 'Almond Milk, Unswt.', unit: '240ml',       calories: 30,  protein: 1,  carbs: 1,  fats: 3  },
  { name: 'Oat Milk',            unit: '240ml',       calories: 120, protein: 3,  carbs: 16, fats: 5  },
  { name: 'Soy Milk',            unit: '240ml',       calories: 80,  protein: 7,  carbs: 4,  fats: 4  },
  { name: 'Coconut Water',       unit: '240ml',       calories: 45,  protein: 0,  carbs: 9,  fats: 0  },
  { name: 'Kombucha',            unit: '240ml',       calories: 30,  protein: 0,  carbs: 7,  fats: 0  },

  // ── Breakfast Items ───────────────────────────────────────
  { name: 'Pancake, Plain',      unit: '1 medium',    calories: 175, protein: 4,  carbs: 28, fats: 6  },
  { name: 'Waffle, Plain',       unit: '1 waffle',    calories: 218, protein: 6,  carbs: 25, fats: 10 },
  { name: 'French Toast',        unit: '1 slice',     calories: 149, protein: 7,  carbs: 16, fats: 7  },
  { name: 'Croissant',           unit: '1 medium',    calories: 231, protein: 5,  carbs: 26, fats: 12 },
  { name: 'Muffin, Blueberry',   unit: '1 muffin',    calories: 313, protein: 4,  carbs: 48, fats: 12 },
  { name: 'Yogurt Parfait',      unit: '100g',        calories: 95,  protein: 4,  carbs: 16, fats: 2  },
  { name: 'Hash Browns',         unit: '100g',        calories: 265, protein: 2,  carbs: 26, fats: 17 },

  // ── Snacks ────────────────────────────────────────────────
  { name: 'Protein Bar',         unit: '1 bar',       calories: 200, protein: 21, carbs: 22, fats: 9  },
  { name: 'Granola Bar',         unit: '1 bar',       calories: 193, protein: 4,  carbs: 29, fats: 7  },
  { name: 'Popcorn, Air Popped', unit: '30g',         calories: 110, protein: 3,  carbs: 22, fats: 1  },
  { name: 'Pretzels',            unit: '30g',         calories: 114, protein: 3,  carbs: 24, fats: 1  },
  { name: 'Potato Chips',        unit: '30g',         calories: 153, protein: 2,  carbs: 15, fats: 10 },
  { name: 'Tortilla Chips',      unit: '30g',         calories: 142, protein: 2,  carbs: 18, fats: 7  },
  { name: 'Trail Mix',           unit: '30g',         calories: 130, protein: 4,  carbs: 13, fats: 8  },
  { name: 'Oreo Cookies',        unit: '3 cookies',   calories: 160, protein: 2,  carbs: 25, fats: 7  },
  { name: 'Rice Cake, Plain',    unit: '1 cake',      calories: 35,  protein: 1,  carbs: 7,  fats: 0  },
  { name: 'Edamame, Shelled',    unit: '100g',        calories: 122, protein: 11, carbs: 9,  fats: 5  },

  // ── International ─────────────────────────────────────────
  { name: 'Egg Fried Rice',      unit: '100g',        calories: 163, protein: 5,  carbs: 22, fats: 6  },
  { name: 'Gyoza (3 pcs)',       unit: '3 pieces',    calories: 150, protein: 6,  carbs: 18, fats: 6  },
  { name: 'Lentil Soup',         unit: '100g',        calories: 71,  protein: 4,  carbs: 12, fats: 1  },
  { name: 'Collagen Peptides',   unit: 'scoop',       calories: 40,  protein: 9,  carbs: 0,  fats: 0  },
];

function getRelatableUnit(unit) {
  if (!unit) return null;
  const gMatch = unit.match(/^(\d+\.?\d*)\s*g/);
  if (gMatch) {
    const g = parseFloat(gMatch[1]);
    const cups = g / 240;
    const rounded = Math.round(cups * 4) / 4;
    if (rounded === 0) return null;
    return `≈ ${rounded} cup`;
  }
  const mlMatch = unit.match(/^(\d+\.?\d*)\s*ml/);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    const cups = ml / 240;
    if (cups >= 0.75) return `≈ ${Math.round(cups * 4) / 4} cup`;
    return `≈ ${Math.round(ml * 0.03381 * 10) / 10} fl oz`;
  }
  return null;
}

const WORKOUT_PLANS = {
  'Building Muscle - Men 5x': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Incline Bench Press 4×6-8', 'Weighted Pull Ups 4×6-8', 'Bent Over Barbell Row 3×8-10', 'Pec Deck 3×10-12', 'Cable Single Arm Lateral Raise 3×12-15', 'Cable Tricep Pushdown 3×10-12', 'EZ Bar Seated Curl 3×10-12'] },
    { day: 'Day 2 – Lower Body', exercises: ['Lying Leg Curl 3×8', 'Barbell Back Squat 4×5-8', 'Romanian Deadlift 3×8-10', 'Leg Press 3×10-12', 'Standing Calf Raise 4×10-15'] },
    { day: 'Day 3 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 4 – Push', exercises: ['Flat Bench Press 4×5-8', 'Machine Shoulder Press 3×10', 'Pec Deck 3×15', 'Cable Single Arm Lateral Raise 4×12-15', 'Overhead Extension 3×8'] },
    { day: 'Day 5 – Pull', exercises: ['Neutral Grip Lat Pulldown 3×10', 'Dumbbell Chest Supported Row 3×8', 'Cable Seated Row 3×15', 'Reverse Cable Flyes 3×15', 'Shrugs 4×15', 'EZ Bar Seated Curl 3×10', 'Machine Preacher Curl 3×15'] },
    { day: 'Day 6 – Legs', exercises: ['Kneeling Leg Curl 3×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 3×10', 'Hip Adduction 3×10', 'Standing Calf Raise 3×10'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
  'Building Muscle - Women 5x': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Lat Pulldown 4×8-12', 'Seated Cable Row 3×10-12', 'Dumbbell Shoulder Press 3×8-10', 'Cable Lateral Raise 3×12-15', 'Rear Delt Machine Fly 3×12-15'] },
    { day: 'Day 2 – Lower Body', exercises: ['Barbell Hip Thrust 4×6-8', 'Romanian Deadlift 4×8-10', 'Lying Leg Curl 3×10-12', 'Bulgarian Split Squat 3×8-10', 'Cable Kickback 3×12-15'] },
    { day: 'Day 3 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 4 – Push', exercises: ['Glute Bridge 4×10-12', 'Step Ups 3×10', 'Cable Glute Kickbacks 3×12-15', 'Hip Abduction Machine 3×15-20', '45° Back Extensions 3×12-15'] },
    { day: 'Day 5 – Pull', exercises: ['Back Squat 4×6-8', 'Leg Press 3×10-12', 'Walking Lunges 3×10', 'Leg Extension 3×12-15', 'Barbell Hip Thrust 3×8-10'] },
    { day: 'Day 6 – Legs', exercises: ['Kneeling Leg Curl 3×8', 'Linear Hack Squat 3×6', 'Romanian Deadlift 3×8', 'Leg Extension 3×10', 'Hip Adduction 3×10', 'Standing Calf Raise 3×10'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
  'Building Muscle - Men 3x': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Flat Bench Press 4×5-8', 'Incline Bench Press 3×8-10', 'Weighted Pull Ups 3×6-8', 'Bent Over Barbell Row 3×8-10', 'Cable Single Arm Lateral Raise 3×12-15', 'Cable Tricep Pushdown 3×10-12', 'EZ Bar Seated Curl 3×10-12'] },
    { day: 'Day 2 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 3 – Lower Body', exercises: ['Barbell Back Squat 4×5-8', 'Romanian Deadlift 3×8-10', 'Leg Press 3×10-12', 'Lying Leg Curl 3×10-12', 'Leg Extension 3×12-15', 'Standing Calf Raise 4×10-15'] },
    { day: 'Day 4 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 5 – Full Body', exercises: ['Flat Bench Press 3×6-8', 'Barbell Back Squat 3×6-8', 'Neutral Grip Lat Pulldown 3×8-10', 'Romanian Deadlift 3×8-10', 'Cable Single Arm Lateral Raise 3×12-15', 'EZ Bar Seated Curl 3×10-12', 'Cable Tricep Pushdown 3×10-12'] },
    { day: 'Day 6 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
  'Building Muscle - Women 3x': buildPlan([
    { day: 'Day 1 – Upper Body', exercises: ['Lat Pulldown 4×8-12', 'Seated Cable Row 3×10-12', 'Dumbbell Shoulder Press 3×8-10', 'Cable Lateral Raise 3×12-15', 'Rear Delt Machine Fly 3×12-15', 'Cable Tricep Pushdown 3×12-15'] },
    { day: 'Day 2 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 3 – Lower Body', exercises: ['Barbell Hip Thrust 4×6-8', 'Romanian Deadlift 4×8-10', 'Bulgarian Split Squat 3×8-10', 'Lying Leg Curl 3×10-12', 'Cable Kickback 3×12-15', 'Hip Abduction Machine 3×15-20'] },
    { day: 'Day 4 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 5 – Full Body', exercises: ['Back Squat 3×6-8', 'Barbell Hip Thrust 3×8-10', 'Lat Pulldown 3×10-12', 'Romanian Deadlift 3×8-10', 'Cable Kickback 3×12-15', 'Hip Abduction Machine 3×15-20'] },
    { day: 'Day 6 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
    { day: 'Day 7 – Rest', exercises: ['Full Body Stretching 15min', 'Full Body Foam Rolling Routine', 'Incline Walk 30min'] },
  ]),
};


const QUESTIONS = [
  { key: 'goal', label: "What's your goal?", type: 'choice', options: ['Building Muscle - Men 5x', 'Building Muscle - Women 5x', 'Building Muscle - Men 3x', 'Building Muscle - Women 3x'] },
];


const GOAL_META = {
  'Building Muscle - Men 5x':      { icon: '🏋️', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: ['Personalized Weekly Workouts', 'Auto-Adjusts weights based on performance', 'Personalized Nutrition Plan'] },
  'Building Muscle - Women 5x':    { icon: '🏋️', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: ['Personalized Weekly Workouts', 'Auto-Adjusts weights based on performance', 'Personalized Nutrition Plan'] },
  'Building Muscle - Men 3x':   { icon: '🏋️', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: ['3 Days Per Week Structure', 'Auto-Adjusts weights based on performance', 'Personalized Nutrition Plan'] },
  'Building Muscle - Women 3x': { icon: '🏋️', iconColor: '#ff6b6b', iconGradient: ['#e63946', '#7b1fa2'], subtitle: ['3 Days Per Week Structure', 'Auto-Adjusts weights based on performance', 'Personalized Nutrition Plan'] },
  'Get Your Nutrition Plan':    { icon: '🥗', iconColor: '#69f0ae', iconGradient: ['#2ecc71', '#0097a7'], subtitle: 'Calculate calories' },
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

// Maps a clean exercise name to a base lift + ratio + type for weight suggestion.
// Returns null for bodyweight/cardio exercises.
function categorizeExercise(name) {
  const n = name.toLowerCase();
  // ── Hip dominant (check before squat patterns) ─────────────
  if (n.includes('deadlift'))                                              return { base: 'deadlift', ratio: 1.00, type: 'compound' };
  if (n.includes('hip thrust') || n.includes('glute bridge'))             return { base: 'deadlift', ratio: 0.90, type: 'compound' };
  if (n.includes('good morning'))                                          return { base: 'deadlift', ratio: 0.45, type: 'compound' };
  if (n.includes('shrug'))                                                 return { base: 'deadlift', ratio: 0.80, type: 'accessory' };
  // ── Quad dominant ───────────────────────────────────────────
  if (n.includes('leg press'))                                             return { base: 'squat',    ratio: 1.80, type: 'compound' };
  if (n.includes('hack squat'))                                            return { base: 'squat',    ratio: 0.85, type: 'compound' };
  if (n.includes('squat'))                                                 return { base: 'squat',    ratio: 1.00, type: 'compound' };
  if (n.includes('bulgarian') || n.includes('split squat'))               return { base: 'squat',    ratio: 0.45, type: 'compound' };
  if (n.includes('lunge'))                                                 return { base: 'squat',    ratio: 0.40, type: 'compound' };
  if (n.includes('step up'))                                               return { base: 'squat',    ratio: 0.35, type: 'compound' };
  if (n.includes('leg extension'))                                         return { base: 'squat',    ratio: 0.28, type: 'accessory' };
  if (n.includes('leg curl') || n.includes('hamstring curl'))             return { base: 'squat',    ratio: 0.28, type: 'accessory' };
  if (n.includes('calf raise') || n.includes('calf press'))               return { base: 'squat',    ratio: 0.55, type: 'accessory' };
  // ── Vertical push ───────────────────────────────────────────
  if (n.includes('overhead press') || n.includes('military press'))       return { base: 'ohp',      ratio: 1.00, type: 'compound' };
  if (n.includes('shoulder press') || n.includes('arnold'))               return { base: 'ohp',      ratio: 0.90, type: 'compound' };
  if (n.includes('lateral raise'))                                         return { base: 'ohp',      ratio: 0.22, type: 'accessory' };
  if (n.includes('front raise'))                                           return { base: 'ohp',      ratio: 0.18, type: 'accessory' };
  if (n.includes('face pull') || n.includes('rear delt'))                 return { base: 'ohp',      ratio: 0.30, type: 'accessory' };
  if (n.includes('upright row'))                                           return { base: 'ohp',      ratio: 0.55, type: 'accessory' };
  // ── Horizontal push ─────────────────────────────────────────
  if (n.includes('close grip bench') || n.includes('close-grip'))         return { base: 'bench',    ratio: 0.85, type: 'compound' };
  if (n.includes('incline') && n.includes('press'))                       return { base: 'bench',    ratio: 0.80, type: 'compound' };
  if (n.includes('decline') && n.includes('press'))                       return { base: 'bench',    ratio: 0.90, type: 'compound' };
  if (n.includes('bench press'))                                           return { base: 'bench',    ratio: 1.00, type: 'compound' };
  if (n.includes('chest press') || n.includes('machine press'))           return { base: 'bench',    ratio: 0.90, type: 'compound' };
  if (n.includes('cable fly') || n.includes('cable crossover') || n.includes('pec dec') || n.includes('chest fly') || n.includes('dumbbell fly') || n.includes('flye')) return { base: 'bench', ratio: 0.38, type: 'accessory' };
  // ── Pull / back ─────────────────────────────────────────────
  if (n.includes('barbell row') || n.includes('bent over row') || n.includes('bent-over row')) return { base: 'bench', ratio: 0.75, type: 'compound' };
  if (n.includes('t-bar row') || n.includes('t bar row'))                 return { base: 'bench',    ratio: 0.70, type: 'compound' };
  if (n.includes('seated row') || n.includes('cable row'))                return { base: 'bench',    ratio: 0.65, type: 'compound' };
  if (n.includes('chest-supported row') || n.includes('chest supported')) return { base: 'bench',    ratio: 0.60, type: 'compound' };
  if (n.includes('dumbbell row') || n.includes('single-arm row') || n.includes('one arm row')) return { base: 'bench', ratio: 0.45, type: 'compound' };
  if (n.includes('lat pulldown') || n.includes('cable pulldown'))         return { base: 'bench',    ratio: 0.62, type: 'compound' };
  if (n.includes('pullover'))                                              return { base: 'bench',    ratio: 0.50, type: 'accessory' };
  // ── Arms ────────────────────────────────────────────────────
  if (n.includes('barbell curl') || n.includes('ez bar curl'))            return { base: 'bench',    ratio: 0.28, type: 'accessory' };
  if (n.includes('curl'))                                                  return { base: 'bench',    ratio: 0.18, type: 'accessory' };
  if (n.includes('skull crusher') || n.includes('lying tricep'))          return { base: 'bench',    ratio: 0.25, type: 'accessory' };
  if (n.includes('tricep') || n.includes('pushdown') || n.includes('press down') || n.includes('kickback') || n.includes('overhead extension') || n.includes('overhead tricep')) return { base: 'bench', ratio: 0.22, type: 'accessory' };
  return null;
}

// Weekly progression rates: compound lifts progress faster than accessories.
const PROGRESSION_RATES = {
  Beginner:     { compound: 0.05,  accessory: 0.03  },
  Intermediate: { compound: 0.025, accessory: 0.015 },
  Advanced:     { compound: 0.015, accessory: 0.010 },
};

function calculateSuggestedWeight(exerciseName, week, suggested, fitnessLevel) {
  if (!suggested || !exerciseName || !week) return '';
  const info = categorizeExercise(exerciseName);
  if (!info) return '';
  const baseWeight = suggested[info.base];
  if (!baseWeight) return '';
  const rates = PROGRESSION_RATES[fitnessLevel] || PROGRESSION_RATES.Intermediate;
  const weeklyRate = info.type === 'compound' ? rates.compound : rates.accessory;
  const multiplier = Math.pow(1 + weeklyRate, week - 1);
  const raw = baseWeight * info.ratio * multiplier;
  return String(Math.max(5, Math.round(raw / 5) * 5));
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

function PulsingDot({ color = '#e94560', size = 7 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulse, marginRight: 5 }} />
  );
}

function AnimatedBmiCard({ bmi }) {
  const target = parseFloat(bmi);
  const [displayVal, setDisplayVal] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const steps = 24;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setDisplayVal(parseFloat((from + (target - from) * step / steps).toFixed(1)));
      if (step >= steps) clearInterval(iv);
    }, 14);
    return () => clearInterval(iv);
  }, [target]);

  const b = displayVal;
  const { label, color, context } =
    b < 18.5 ? { label: 'Underweight',    color: '#60a5fa', context: 'Building lean muscle will help bring you to a healthier weight.' }
    : b < 22  ? { label: 'Healthy',        color: '#4ade80', context: 'Great starting point — ideal for lean muscle gain.' }
    : b < 25  ? { label: 'Healthy',        color: '#4ade80', context: 'Solid foundation for strength and body recomposition.' }
    : b < 27  ? { label: 'Above Average',  color: '#f59e0b', context: 'Slightly above ideal for lean muscle gain — a cut-and-build approach works well here.' }
    : b < 30  ? { label: 'Above Average',  color: '#f59e0b', context: 'Combining strength training with a slight deficit will get you results fast.' }
    :           { label: 'High',            color: '#ef4444', context: 'Prioritising fat loss alongside muscle building is the right call.' };

  return (
    <View style={{ backgroundColor: '#1a1a30', borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: color + '35', borderTopColor: color + '60' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View>
          <Text style={{ color: '#ffffff60', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 3 }}>BMI</Text>
          <Text style={{ color, fontSize: 13, fontWeight: '800' }}>{label}</Text>
        </View>
        <Text style={{ color, fontSize: 34, fontWeight: '900', letterSpacing: -1 }}>{displayVal.toFixed(1)}</Text>
      </View>
      <Text style={{ color: '#ffffff60', fontSize: 12, lineHeight: 18 }}>{context}</Text>
    </View>
  );
}

// Progress bar that animates its fill from 0 → target on mount/change
function AnimatedProgressBar({ progress, color = '#4a90e2', trackColor = '#2a2a4a', height = 8, glowColor, style, delay = 0 }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 1100,
      delay,
      easing: Easing.out(Easing.cubic),
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
function ExpandablePreviewCard({ d, cardAnim, getDayIcon }) {
  const [expanded, setExpanded] = useState(false);
  const scale    = useRef(new Animated.Value(1)).current;
  const chevRot  = useRef(new Animated.Value(0)).current;
  const cOpacity = useRef(new Animated.Value(0)).current;
  const cSlide   = useRef(new Animated.Value(-8)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 120, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }).start();

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.parallel([
      Animated.timing(chevRot,  { toValue: next ? 1 : 0, duration: 220, useNativeDriver: true }),
      Animated.timing(cOpacity, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }),
      Animated.spring(cSlide,   { toValue: next ? 0 : -8, useNativeDriver: true, speed: 140, bounciness: 4 }),
    ]).start();
  };

  const label   = d.day.split('–')[1]?.trim() || d.day;
  const dayName = d.day.split('–')[0]?.trim() || '';
  const exs = d.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk'));
  const chevron = chevRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Animated.View style={{
      opacity: cardAnim,
      transform: [
        { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
        { scale },
      ],
      backgroundColor: COLORS.card,
      borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff18',
    }}>
      <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut} onPress={toggle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{getDayIcon(d.day)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{label}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>{dayName} • {exs.length} exercises</Text>
          </View>
          <Animated.Text style={{ color: COLORS.muted, fontSize: 18, transform: [{ rotate: chevron }] }}>⌄</Animated.Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={{ opacity: cOpacity, transform: [{ translateY: cSlide }], marginTop: 12 }}>
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
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ── Meal Log Modal ─────────────────────────────────────────────
function MealLogModal({ visible, onClose, nutKey, mealsData, onSaveMeals, customFoods = [], onSaveCustomFood, favoriteFoods = [], onToggleFavorite, nutritionHistory = {}, onLogout, onSettings }) {
  // Internal nav: 'overview' | 'detail' | 'addFood'
  const [view, setView] = useState('overview');
  const [activeMealId, setActiveMealId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // addFood sub-state
  const [addMode, setAddMode] = useState('recent'); // 'recent' | 'search' | 'quick'
  const [searchQuery, setSearchQuery] = useState('');
  const [quickMacros, setQuickMacros] = useState({ name: '', unit: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' });
  const [selectedFood, setSelectedFood] = useState(null); // food tapped in search
  const [qty, setQty] = useState('1');
  const [editingFoodId, setEditingFoodId] = useState(null); // food being qty-edited in detail
  const [editQty, setEditQty] = useState('1');

  // Local copy of meals — [ { id, name, icon, foods: [{id,name,cal,prot,carbs,fats}], totals } ]
  const [meals, setMeals] = useState([]);

  // Initialise / reset when opened
  useEffect(() => {
    if (!visible) return;
    const base = MEAL_TYPES.map(mt => {
      const existing = mealsData?.find(m => m.id === mt.id);
      return existing
        ? { ...existing }
        : { id: mt.id, name: mt.name, icon: mt.icon, foods: [], totals: { calories: 0, protein: 0, carbs: 0, fats: 0 } };
    });
    setMeals(base);
    setView('overview');
    setActiveMealId(null);
    setSearchQuery('');
    setSelectedFood(null);
    setQty('1');
    setQuickMacros({ name: '', unit: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' });
  }, [visible]);

  // Recalculate meal totals whenever foods change
  function recalcMeal(mealList) {
    return mealList.map(m => ({
      ...m,
      totals: m.foods.reduce(
        (acc, f) => ({ calories: acc.calories + f.calories, protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fats: acc.fats + f.fats }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    }));
  }

  function autoSave(updatedMeals) {
    const totals = updatedMeals.reduce(
      (acc, m) => ({ calories: acc.calories + m.totals.calories, protein: acc.protein + m.totals.protein, carbs: acc.carbs + m.totals.carbs, fats: acc.fats + m.totals.fats }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    onSaveMeals(updatedMeals, totals);
  }

  function addFoodToMeal(food, quantity = 1) {
    const q = Math.max(parseFloat(quantity) || 1, 0.1);
    const newFood = {
      id: `${Date.now()}`,
      name: food.name,
      unit: food.unit || '',
      quantity: q,
      perUnit: { calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats },
      calories: Math.round(food.calories * q),
      protein:  Math.round(food.protein  * q),
      carbs:    Math.round(food.carbs    * q),
      fats:     Math.round(food.fats     * q),
    };
    const updated = recalcMeal(meals.map(m => m.id === activeMealId ? { ...m, foods: [...m.foods, newFood] } : m));
    setMeals(updated);
    autoSave(updated);
    setView('detail');
    setSearchQuery('');
    setSelectedFood(null);
    setQty('1');
    setQuickMacros({ name: '', unit: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' });
  }

  function addAllFoodsFromMeal(mealFoods) {
    const newFoods = mealFoods.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      unit: f.unit || '',
      quantity: f.quantity || 1,
      perUnit: f.perUnit || { calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats },
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fats: f.fats,
    }));
    const updated = recalcMeal(meals.map(m => m.id === activeMealId ? { ...m, foods: [...m.foods, ...newFoods] } : m));
    setMeals(updated);
    autoSave(updated);
    setView('detail');
  }

  function removeFoodFromMeal(mealId, foodId) {
    const updated = recalcMeal(meals.map(m => m.id === mealId ? { ...m, foods: m.foods.filter(f => f.id !== foodId) } : m));
    setMeals(updated);
    autoSave(updated);
  }


  function updateFoodQty(mealId, foodId, newQty) {
    const q = Math.max(parseFloat(newQty) || 1, 0.1);
    const updated = recalcMeal(meals.map(m => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        foods: m.foods.map(f => {
          if (f.id !== foodId) return f;
          const base = f.perUnit ?? { calories: Math.round(f.calories / (f.quantity || 1)), protein: Math.round(f.protein / (f.quantity || 1)), carbs: Math.round(f.carbs / (f.quantity || 1)), fats: Math.round(f.fats / (f.quantity || 1)) };
          return { ...f, quantity: q, perUnit: base, calories: Math.round(base.calories * q), protein: Math.round(base.protein * q), carbs: Math.round(base.carbs * q), fats: Math.round(base.fats * q) };
        }),
      };
    }));
    setMeals(updated);
    const totals = updated.reduce((acc, m) => ({ calories: acc.calories + m.totals.calories, protein: acc.protein + m.totals.protein, carbs: acc.carbs + m.totals.carbs, fats: acc.fats + m.totals.fats }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    onSaveMeals(updated, totals);
    setEditingFoodId(null);
  }

  const activeMeal = meals.find(m => m.id === activeMealId);
  const dailyTotals = meals.reduce(
    (acc, m) => ({ calories: acc.calories + m.totals.calories, protein: acc.protein + m.totals.protein, carbs: acc.carbs + m.totals.carbs, fats: acc.fats + m.totals.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
  const totalFoods = meals.reduce((s, m) => s + m.foods.length, 0);
  const sq = searchQuery.toLowerCase();
  const favSet = new Set(favoriteFoods);
  const allFoods = [
    ...customFoods.map(f => ({ ...f, isCustom: true })),
    ...FOOD_DATABASE,
  ];
  const matched = allFoods.filter(f => f.name.toLowerCase().includes(sq));
  const filteredDB = [
    ...matched.filter(f => favSet.has(f.name)).map(f => ({ ...f, isFavorite: true })),
    ...matched.filter(f => !favSet.has(f.name) && f.isCustom),
    ...matched.filter(f => !favSet.has(f.name) && !f.isCustom),
  ];

  const recentMeals = Object.entries(nutritionHistory)
    .filter(([key]) => key !== nutKey)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .flatMap(([key, dayData]) =>
      (dayData.meals || [])
        .filter(m => m.foods && m.foods.length > 0)
        .map(m => ({ ...m, dateKey: key }))
    )
    .slice(0, 25);

  function formatDateKey(key) {
    const [, mo, day] = key.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(mo) - 1]} ${parseInt(day)}`;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff10' }}>
          <TouchableOpacity
            onPress={() => { if (view === 'addFood') setView('detail'); else if (view === 'detail') setView('overview'); else onClose(); }}
            style={{ marginRight: 12, paddingVertical: 4, paddingRight: 12 }}
          >
            <Text style={{ color: COLORS.text, fontSize: 44, fontWeight: '700', lineHeight: 48 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>
              {view === 'overview' ? 'Log Meals' : view === 'detail' ? (activeMeal?.icon + ' ' + activeMeal?.name) : 'Add Food'}
            </Text>
            {view === 'overview' && (
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                {totalFoods === 0 ? 'No foods logged yet' : `${totalFoods} food${totalFoods !== 1 ? 's' : ''} logged`}
              </Text>
            )}
          </View>
          {view === 'detail' && (
            <TouchableOpacity onPress={() => { setAddMode('recent'); setView('addFood'); }} style={{ backgroundColor: '#2a2a4a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff20' }}>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 13 }}>+ Add Food</Text>
            </TouchableOpacity>
          )}
          <View style={{ marginLeft: 12 }}>
            <TouchableOpacity onPress={() => setMenuOpen(v => !v)} style={{ padding: 4 }}>
              <Text style={{ color: COLORS.muted, fontSize: 20, letterSpacing: 2 }}>···</Text>
            </TouchableOpacity>
            {menuOpen && (
              <View style={{ position: 'absolute', top: 32, right: 0, backgroundColor: '#1c1c3a', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff15', zIndex: 100, minWidth: 140, overflow: 'hidden' }}>
                <TouchableOpacity onPress={() => { setMenuOpen(false); onSettings?.(); }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff10' }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}>⚙️  Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMenuOpen(false); onLogout?.(); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '600' }}>🚪  Log Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Daily totals bar (always visible) */}
        <View style={{ backgroundColor: '#1a1a2e', paddingBottom: 10, paddingHorizontal: 16 }}>
          <Text style={{ color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', paddingTop: 6, paddingBottom: 4 }}>TODAY'S TOTAL</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[['🔥', dailyTotals.calories, 'kcal'], ['💪', dailyTotals.protein, 'g prot'], ['🍚', dailyTotals.carbs, 'g carbs'], ['🥑', dailyTotals.fats, 'g fats']].map(([icon, val, label]) => (
            <View key={label} style={{ alignItems: 'center' }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{icon} {val}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 1 }}>{label}</Text>
            </View>
          ))}
        </View>
        </View>

        {/* ── OVERVIEW ── */}
        {view === 'overview' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {meals.map(meal => (
              <TouchableOpacity
                key={meal.id}
                onPress={() => { setActiveMealId(meal.id); setView('detail'); }}
                style={{ backgroundColor: '#1c1c3a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ffffff0a' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{meal.icon}</Text>
                    <View>
                      <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15 }}>{meal.name}</Text>
                      <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
                        {meal.foods.length === 0 ? 'No foods logged yet' : `${meal.foods.length} food${meal.foods.length !== 1 ? 's' : ''}`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: meal.totals.calories > 0 ? COLORS.success : COLORS.muted, fontWeight: '800', fontSize: 15 }}>{meal.totals.calories} kcal</Text>
                    {meal.totals.protein > 0 && <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>{meal.totals.protein}g protein</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── MEAL DETAIL ── */}
        {view === 'detail' && activeMeal && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {/* Meal totals */}
            <View style={{ backgroundColor: '#1a1a2e', borderRadius: 12, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, marginBottom: 16 }}>
              <Text style={{ color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 6 }}>THIS MEAL</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[['Cals', activeMeal.totals.calories], ['Prot', activeMeal.totals.protein + 'g'], ['Carbs', activeMeal.totals.carbs + 'g'], ['Fats', activeMeal.totals.fats + 'g']].map(([lbl, val]) => (
                <View key={lbl} style={{ alignItems: 'center' }}>
                  <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15 }}>{val}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 10 }}>{lbl}</Text>
                </View>
              ))}
            </View>
            </View>
            {activeMeal.foods.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: COLORS.muted, fontSize: 15 }}>No foods logged yet</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 6 }}>Tap "+ Add Food" to get started</Text>
              </View>
            ) : (
              activeMeal.foods.map(food => {
                const isEditing = editingFoodId === food.id;
                const qtyNum = food.quantity || 1;
                const qtyStr = qtyNum % 1 === 0 ? String(qtyNum) : qtyNum.toFixed(1);
                const qtyDisplay = food.unit
                  ? `${qtyStr} × ${food.unit}`
                  : qtyNum !== 1 ? `×${qtyStr}` : null;
                return (
                  <View key={food.id} style={{ backgroundColor: isEditing ? '#1e3a2a' : '#1c1c3a', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: isEditing ? '#4ade8040' : 'transparent' }}>
                    {/* Top row: name + qty badge + delete */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ color: isEditing ? COLORS.success : COLORS.text, fontWeight: '700', fontSize: 14 }}>{food.name}</Text>
                        {qtyDisplay && (
                          <View style={{ backgroundColor: '#2a2a4a', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700' }}>{qtyDisplay}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => { setEditingFoodId(isEditing ? null : food.id); setEditQty(String(food.quantity || 1)); }}
                        style={{ marginLeft: 8, padding: 4 }}
                      >
                        <Text style={{ color: isEditing ? COLORS.success : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{isEditing ? 'Done' : 'Edit'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { if (isEditing) setEditingFoodId(null); removeFoodFromMeal(activeMeal.id, food.id); }} style={{ marginLeft: 8, padding: 4 }}>
                        <Text style={{ color: COLORS.accent, fontSize: 18, fontWeight: '700' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 3 }}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fats}g F</Text>
                    {/* Inline qty editor */}
                    {isEditing && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
                        <Text style={{ color: COLORS.muted, fontSize: 12, flex: 1 }}>Quantity</Text>
                        <TouchableOpacity
                          onPress={() => setEditQty(v => String(Math.max(0.5, Math.round((parseFloat(v) || 1) * 2 - 1) / 2)))}
                          style={{ width: 30, height: 30, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 18, lineHeight: 20 }}>−</Text>
                        </TouchableOpacity>
                        <TextInput
                          value={editQty}
                          onChangeText={setEditQty}
                          keyboardType="decimal-pad"
                          style={{ width: 44, textAlign: 'center', color: COLORS.text, fontSize: 13, fontWeight: '700', backgroundColor: '#2a2a4a', borderRadius: 6, paddingVertical: 5 }}
                        />
                        <TouchableOpacity
                          onPress={() => setEditQty(v => String(Math.round((parseFloat(v) || 1) * 2 + 1) / 2))}
                          style={{ width: 30, height: 30, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 18, lineHeight: 20 }}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => updateFoodQty(activeMeal.id, food.id, editQty)}
                          style={{ backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 7, marginLeft: 4 }}
                        >
                          <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Update</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* ── ADD FOOD ── */}
        {view === 'addFood' && (
          <View style={{ flex: 1 }}>
            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', margin: 16, backgroundColor: '#1c1c3a', borderRadius: 12, padding: 4 }}>
              {[['recent', 'Recent'], ['search', 'Search'], ['quick', 'Quick Add']].map(([mode, label]) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setAddMode(mode)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: addMode === mode ? COLORS.accent : 'transparent' }}
                >
                  <Text style={{ color: addMode === mode ? '#fff' : COLORS.muted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {addMode === 'recent' && (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
                {recentMeals.length === 0 ? (
                  <Text style={{ color: COLORS.muted, textAlign: 'center', marginTop: 40 }}>No previous meals logged yet</Text>
                ) : (
                  recentMeals.map((meal, idx) => {
                    const preview = meal.foods.slice(0, 3).map(f => f.name).join(', ');
                    const overflow = meal.foods.length > 3 ? ` +${meal.foods.length - 3} more` : '';
                    return (
                      <View key={idx} style={{ backgroundColor: '#1c1c3a', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ffffff10' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{formatDateKey(meal.dateKey).toUpperCase()}</Text>
                              <Text style={{ color: '#ffffff20', fontSize: 11 }}>·</Text>
                              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '800' }}>{meal.icon} {meal.name}</Text>
                            </View>
                            <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 6 }} numberOfLines={2}>
                              {preview}{overflow}
                            </Text>

                          </View>
                          <TouchableOpacity
                            onPress={() => addAllFoodsFromMeal(meal.foods)}
                            style={{ backgroundColor: COLORS.success, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center' }}
                          >
                            <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Add All</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
            {addMode === 'search' ? (
              <View style={{ flex: 1 }}>
                <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1c1c3a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' }}>
                  <Text style={{ color: COLORS.muted, marginRight: 8 }}>🔍</Text>
                  <TextInput
                    value={searchQuery}
                    onChangeText={v => { setSearchQuery(v); setSelectedFood(null); setQty('1'); }}
                    placeholder="Search foods..."
                    placeholderTextColor={COLORS.muted}
                    style={{ flex: 1, color: COLORS.text, fontSize: 14 }}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedFood(null); setQty('1'); }}>
                      <Text style={{ color: COLORS.muted, fontSize: 16, paddingLeft: 8 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={filteredDB}
                  keyExtractor={item => item.name}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
                  renderItem={({ item: food }) => {
                    const isSelected = selectedFood?.name === food.name;
                    const q = isSelected ? Math.max(parseFloat(qty) || 1, 0.1) : 1;
                    return (
                      <TouchableOpacity
                        activeOpacity={isSelected ? 1 : 0.7}
                        onPress={() => { if (!isSelected) { setSelectedFood(food); setQty('1'); } }}
                        style={{ backgroundColor: isSelected ? '#1e3a2a' : '#1c1c3a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: isSelected ? '#4ade8060' : 'transparent' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => onToggleFavorite?.(food.name)}
                            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
                          >
                            <Text style={{ fontSize: food.isFavorite ? 16 : 13, opacity: food.isFavorite ? 1 : 0.12 }}>⭐</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={{ color: isSelected ? COLORS.success : COLORS.text, fontWeight: '700', fontSize: 14 }}>{food.name}</Text>
                              {food.unit ? <Text style={{ color: COLORS.muted, fontSize: 11 }}>{food.unit}</Text> : null}
                              {food.unit ? (() => { const r = getRelatableUnit(food.unit); return r ? <Text style={{ color: '#ffffff22', fontSize: 10 }}>{r}</Text> : null; })() : null}
                              {food.isCustom && <View style={{ backgroundColor: '#2a1a4a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#a78bfa', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>MY FOOD</Text></View>}
                            </View>
                            <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
                              {isSelected
                                ? `${Math.round(food.calories * q)} kcal · ${Math.round(food.protein * q)}g P · ${Math.round(food.carbs * q)}g C · ${Math.round(food.fats * q)}g F`
                                : `${food.calories} kcal · ${food.protein}g P · ${food.carbs}g C · ${food.fats}g F`}
                            </Text>
                          </View>
                          {isSelected ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 6 }}>
                              <View style={{ alignItems: 'center', gap: 4 }}>
                                <TouchableOpacity
                                  onPress={() => setQty(v => String(Math.round((parseFloat(v) || 1) * 2 + 1) / 2))}
                                  style={{ width: 30, height: 26, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 18 }}>+</Text>
                                </TouchableOpacity>
                                <TextInput
                                  value={qty}
                                  onChangeText={setQty}
                                  keyboardType="decimal-pad"
                                  style={{ width: 38, textAlign: 'center', color: COLORS.text, fontSize: 13, fontWeight: '700', backgroundColor: '#2a2a4a', borderRadius: 6, paddingVertical: 3 }}
                                />
                                <TouchableOpacity
                                  onPress={() => setQty(v => String(Math.max(0.5, Math.round((parseFloat(v) || 1) * 2 - 1) / 2)))}
                                  style={{ width: 30, height: 26, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 18 }}>−</Text>
                                </TouchableOpacity>
                              </View>
                              <TouchableOpacity
                                onPress={() => addFoodToMeal(food, qty)}
                                style={{ width: 36, height: 36, backgroundColor: COLORS.success, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Text style={{ color: '#000', fontSize: 22, fontWeight: '800', lineHeight: 24 }}>+</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => { setSelectedFood(food); setQty('1'); }}
                              style={{ width: 30, height: 30, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}
                            >
                              <Text style={{ color: COLORS.success, fontSize: 20, fontWeight: '300', lineHeight: 22 }}>+</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={<Text style={{ color: COLORS.muted, textAlign: 'center', marginTop: 40 }}>No foods match your search</Text>}
                />
              </View>
            ) : addMode === 'quick' ? (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
                {[['Name', 'name', 'default'], ['Unit (e.g. 100g, scoop, slice)', 'unit', 'default'], ['Quantity', 'quantity', 'decimal-pad'], ['Calories (per serving)', 'calories', 'numeric'], ['Protein (g, per serving)', 'protein', 'numeric'], ['Carbs (g, per serving)', 'carbs', 'numeric'], ['Fats (g, per serving)', 'fats', 'numeric']].map(([label, key, kb]) => (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>{label.toUpperCase()}</Text>
                    <TextInput
                      value={quickMacros[key]}
                      onChangeText={v => setQuickMacros(prev => ({ ...prev, [key]: v }))}
                      keyboardType={kb}
                      placeholder={key === 'quantity' ? '1' : label}
                      placeholderTextColor="#ffffff30"
                      style={{ backgroundColor: '#1c1c3a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: '#ffffff10' }}
                    />
                  </View>
                ))}
                {/* Live preview */}
                {(() => {
                  const q = Math.max(parseFloat(quickMacros.quantity) || 1, 0.1);
                  const cal  = Math.round((parseInt(quickMacros.calories) || 0) * q);
                  const prot = Math.round((parseInt(quickMacros.protein)  || 0) * q);
                  const carbs = Math.round((parseInt(quickMacros.carbs)   || 0) * q);
                  const fats = Math.round((parseInt(quickMacros.fats)    || 0) * q);
                  if (cal + prot + carbs + fats === 0) return null;
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                      {[['🔥', cal, 'kcal'], ['💪', prot, 'g P'], ['🍚', carbs, 'g C'], ['🥑', fats, 'g F']].map(([icon, val, lbl]) => (
                        <View key={lbl} style={{ alignItems: 'center' }}>
                          <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '800' }}>{icon} {val}</Text>
                          <Text style={{ color: COLORS.muted, fontSize: 10 }}>{lbl}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
                <TouchableOpacity
                  onPress={() => {
                    if (!quickMacros.name.trim()) { Alert.alert('Enter a name for this food'); return; }
                    const qty = Math.max(parseFloat(quickMacros.quantity) || 1, 0.1);
                    const customFood = {
                      name: quickMacros.name.trim(),
                      unit: quickMacros.unit.trim(),
                      calories: parseInt(quickMacros.calories) || 0,
                      protein:  parseInt(quickMacros.protein)  || 0,
                      carbs:    parseInt(quickMacros.carbs)    || 0,
                      fats:     parseInt(quickMacros.fats)     || 0,
                    };
                    onSaveCustomFood?.(customFood);
                    addFoodToMeal(customFood, qty);
                  }}
                  style={{ backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
                >
                  <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Add Food</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

function DayCard({ item, currentWeek, logs, completedWorkouts, isNext, onPress, nutritionData, nutritionGoal, expandedNutKey, setExpandedNutKey, nutKey, onLogMeals, mealsCount, onCompleteRest, screenHeight, nutExpandedHeight: nutExpandedHeightProp, customFoods = [], onSaveCustomFood, favoriteFoods = [], onToggleFavorite, nutritionHistory = {}, onSaveMeals, onViewNutritionPlan }) {
  const scale = useRef(new Animated.Value(1)).current;
  const nextPulse = useRef(new Animated.Value(1)).current;
  const nutExpandAnim = useRef(new Animated.Value(0)).current;
  const nutExpanded = expandedNutKey === nutKey;
  const nutHeaderRef = useRef(null);
  const nutExpandedHeight = nutExpandedHeightProp ?? 400;

  // Inline meal log state
  const [mlView, setMlView] = useState('overview'); // 'overview' | 'detail' | 'addFood'
  const [mlActiveMealId, setMlActiveMealId] = useState(null);
  const [mlAddMode, setMlAddMode] = useState('recent');
  const [mlSearch, setMlSearch] = useState('');
  const [mlSelectedFood, setMlSelectedFood] = useState(null);
  const [mlQty, setMlQty] = useState('1');
  const [mlEditingFoodId, setMlEditingFoodId] = useState(null);
  const [mlEditQty, setMlEditQty] = useState('1');
  const [mlQuickMacros, setMlQuickMacros] = useState({ name: '', unit: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' });
  const [mlMeals, setMlMeals] = useState([]);

  // Init meals when nutKey changes or nutritionData changes
  useEffect(() => {
    const base = MEAL_TYPES.map(mt => {
      const existing = nutritionData?.meals?.find(m => m.id === mt.id);
      return existing ? { ...existing } : { id: mt.id, name: mt.name, icon: mt.icon, foods: [], totals: { calories: 0, protein: 0, carbs: 0, fats: 0 } };
    });
    setMlMeals(base);
  }, [nutKey, nutritionData]);

  // Reset sub-view when collapsed
  useEffect(() => {
    if (!nutExpanded) { setMlView('overview'); setMlActiveMealId(null); setMlSearch(''); setMlSelectedFood(null); setMlQty('1'); }
  }, [nutExpanded]);

  function mlRecalc(list) {
    return list.map(m => ({ ...m, totals: m.foods.reduce((acc, f) => ({ calories: acc.calories + f.calories, protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fats: acc.fats + f.fats }), { calories: 0, protein: 0, carbs: 0, fats: 0 }) }));
  }
  function mlAutoSave(updated) {
    const totals = updated.reduce((acc, m) => ({ calories: acc.calories + m.totals.calories, protein: acc.protein + m.totals.protein, carbs: acc.carbs + m.totals.carbs, fats: acc.fats + m.totals.fats }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    onSaveMeals?.(updated, totals);
  }
  function mlAddFood(food, quantity = 1) {
    const q = Math.max(parseFloat(quantity) || 1, 0.1);
    const newFood = { id: `${Date.now()}`, name: food.name, unit: food.unit || '', quantity: q, perUnit: { calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats }, calories: Math.round(food.calories * q), protein: Math.round(food.protein * q), carbs: Math.round(food.carbs * q), fats: Math.round(food.fats * q) };
    const updated = mlRecalc(mlMeals.map(m => m.id === mlActiveMealId ? { ...m, foods: [...m.foods, newFood] } : m));
    setMlMeals(updated); mlAutoSave(updated);
    setMlView('detail'); setMlSearch(''); setMlSelectedFood(null); setMlQty('1');
    setMlQuickMacros({ name: '', unit: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' });
  }
  function mlAddAllFromMeal(foods) {
    const newFoods = foods.map(f => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: f.name, unit: f.unit || '', quantity: f.quantity || 1, perUnit: f.perUnit || { calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats }, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats }));
    const updated = mlRecalc(mlMeals.map(m => m.id === mlActiveMealId ? { ...m, foods: [...m.foods, ...newFoods] } : m));
    setMlMeals(updated); mlAutoSave(updated); setMlView('detail');
  }
  function mlRemoveFood(mealId, foodId) {
    const updated = mlRecalc(mlMeals.map(m => m.id === mealId ? { ...m, foods: m.foods.filter(f => f.id !== foodId) } : m));
    setMlMeals(updated); mlAutoSave(updated);
  }
  function mlUpdateQty(mealId, foodId, newQty) {
    const q = Math.max(parseFloat(newQty) || 1, 0.1);
    const updated = mlRecalc(mlMeals.map(m => {
      if (m.id !== mealId) return m;
      return { ...m, foods: m.foods.map(f => { if (f.id !== foodId) return f; const base = f.perUnit ?? { calories: Math.round(f.calories / (f.quantity || 1)), protein: Math.round(f.protein / (f.quantity || 1)), carbs: Math.round(f.carbs / (f.quantity || 1)), fats: Math.round(f.fats / (f.quantity || 1)) }; return { ...f, quantity: q, perUnit: base, calories: Math.round(base.calories * q), protein: Math.round(base.protein * q), carbs: Math.round(base.carbs * q), fats: Math.round(base.fats * q) }; }) };
    }));
    setMlMeals(updated); mlAutoSave(updated); setMlEditingFoodId(null);
  }

  const mlActiveMeal = mlMeals.find(m => m.id === mlActiveMealId);
  const mlDailyTotals = mlMeals.reduce((acc, m) => ({ calories: acc.calories + m.totals.calories, protein: acc.protein + m.totals.protein, carbs: acc.carbs + m.totals.carbs, fats: acc.fats + m.totals.fats }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  const favSet = new Set(favoriteFoods);
  const allFoods = [...customFoods.map(f => ({ ...f, isCustom: true })), ...FOOD_DATABASE];
  const sq = mlSearch.toLowerCase();
  const matched = allFoods.filter(f => f.name.toLowerCase().includes(sq));
  const filteredDB = [...matched.filter(f => favSet.has(f.name)).map(f => ({ ...f, isFavorite: true })), ...matched.filter(f => !favSet.has(f.name) && f.isCustom), ...matched.filter(f => !favSet.has(f.name) && !f.isCustom)];
  const recentMeals = (() => {
    const all = Object.entries(nutritionHistory).filter(([key]) => key !== nutKey).sort((a, b) => b[0].localeCompare(a[0])).flatMap(([key, dayData]) => (dayData.meals || []).filter(m => m.foods && m.foods.length > 0).map(m => ({ ...m, dateKey: key })));
    const seen = new Set();
    return all.filter(meal => {
      const fp = meal.foods.map(f => f.name).sort().join('|');
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    }).slice(0, 25);
  })();
  function mlFormatKey(key) { const [,w,d] = key.match(/w(\d+)_d(\d+)/) || []; return w && d ? `Week ${w} Day ${d}` : key; }

  const nutAnimatingRef = useRef(false);
  useEffect(() => {
    nutAnimatingRef.current = true;
    if (nutExpanded) {
      Animated.spring(nutExpandAnim, { toValue: 1, useNativeDriver: false, friction: 9, tension: 55 }).start(() => { nutAnimatingRef.current = false; });
    } else {
      Animated.timing(nutExpandAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => { nutAnimatingRef.current = false; });
    }
  }, [nutExpanded]);

  const toggleNut = () => {
    if (nutAnimatingRef.current) return;
    setExpandedNutKey(nutExpanded ? null : nutKey);
  };
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 120, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }).start();

  useEffect(() => {
    if (isNext && !nutExpanded) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(nextPulse, { toValue: 0.97, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(nextPulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      nextPulse.setValue(1);
    }
  }, [isNext, nutExpanded]);

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
  const allLogged = !isRestDay && workoutExs.length > 0 && workoutExs.every(e =>
    (logs[logKeyGlobal(item.day, e)] || []).some(en => en.programWeek === currentWeek)
  );
  const isCompleted = !!completedWorkouts[wKey] && allLogged;
  const isStarted = !isRestDay && !isCompleted && workoutExs.some(e =>
    (logs[logKeyGlobal(item.day, e)] || []).some(en => en.programWeek === currentWeek)
  );
  const accentColor = isCompleted ? '#4ade80' : isStarted ? '#f59e0b' : isToday ? '#e94560' : '#ffffff22';

  // Split "Monday – Upper Body" → dayName="Monday", workoutLabel="Upper Body"
  const parts = item.day.split('–').map(s => s.trim());
  const dayName = parts[0];
  const workoutLabel = parts[1] || '';

  // Status badge (right side)
  let badge;
  if (isCompleted) {
    badge = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e3a2a', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#3acd7060' }}>
        <Text style={{ color: '#7edd9a', fontSize: 10, fontWeight: '700' }}>✓</Text>
        <Text style={{ color: '#7edd9a', fontSize: 10, fontWeight: '700' }}>Done</Text>
      </View>
    );
  } else if (isStarted) {
    badge = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity onPress={onPress} style={{ backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>▶ Continue</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: '#f59e0b18', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#f59e0b44' }}>
          <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>IN PROGRESS</Text>
        </View>
      </View>
    );
  } else if (isToday && !isRestDay) {
    badge = (
      <View style={{ backgroundColor: '#e9456018', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#e9456055' }}>
        <Text style={{ color: '#e94560', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>🔥 TODAY</Text>
      </View>
    );
  } else if (isRestDay) {
    const restDone = !!completedWorkouts[wKey];
    badge = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {restDone && (
          <TouchableOpacity
            onPress={onPress}
            style={{ backgroundColor: '#ffffff0e', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#ffffff18' }}
          >
            <Text style={{ color: '#ffffffcc', fontSize: 10, fontWeight: '700' }}>Details</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onCompleteRest}
          style={{ backgroundColor: restDone ? '#1e3a2a' : '#ffffff0e', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: restDone ? '#3acd7060' : '#ffffff18' }}
        >
          <Text style={{ color: restDone ? '#7edd9a' : '#ffffffcc', fontSize: 10, fontWeight: '700' }}>
            {restDone ? '✓ Done' : 'Mark Complete'}
          </Text>
        </TouchableOpacity>
        {!restDone && <Text style={{ fontSize: 16, opacity: 0.28 }}>💤</Text>}
      </View>
    );
  } else if (isNext) {
    badge = (
      <TouchableOpacity onPress={onPress} style={{ backgroundColor: '#4ade80', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 }}>
        <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>Start Workout</Text>
      </TouchableOpacity>
    );
  } else {
    badge = null;
  }

  const cardBg = isRestDay ? '#3a3a55' : isNext ? '#2a3470' : isToday && !isCompleted ? '#3a2848' : '#343465';
  const cardBorder = isRestDay ? '#ffffff12' : isNext ? '#7b8fff70' : isToday && !isCompleted ? '#e9456020' : '#ffffff08';
  const cardBorderTop = isRestDay ? '#ffffff22' : isNext ? '#7b8fffcc' : isToday && !isCompleted ? '#e9456038' : '#ffffff35';


  const nutBg = '#0a2218';



  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 10 }}>
      <Animated.View style={{ transform: [{ scale: nextPulse }] }}>

        {/* Nutrition card — in normal flow so it sets the wrapper height */}
        <View
          style={{
            backgroundColor: nutBg,
            borderRadius: 14,
            marginHorizontal: 8,
            paddingTop: 57,
            shadowColor: '#4ade80',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          {/* Nutrition summary row — tap to expand */}
          {(() => {
            const workoutDone = isCompleted || (isRestDay && !!completedWorkouts[wKey]);
            const goalCal = nutritionGoal?.cal ?? 0;
            const goalProt = nutritionGoal?.prot ?? 0;
            const calHit = nutritionData && goalCal > 0 && nutritionData.calories >= goalCal * 0.9;
            const protHit = nutritionData && goalProt > 0 && nutritionData.protein >= goalProt;
            const nutWinCount = (workoutDone ? 1 : 0) + (calHit ? 1 : 0) + (protHit ? 1 : 0);
            const totalNutWins = 3;
            return (
              <View ref={nutHeaderRef} style={{ paddingHorizontal: 16, paddingBottom: nutExpanded ? 10 : 5, paddingTop: nutExpanded ? 10 : 4 }}>
                <TouchableOpacity onPress={toggleNut} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* Arrow */}
                  <Text style={{ color: '#4ade8066', fontSize: nutExpanded ? 13 : 10, fontWeight: '700', width: nutExpanded ? 14 : 10 }}>{nutExpanded ? '▲' : '▼'}</Text>
                  {nutExpanded && <Text style={{ color: '#ffffff55', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>Close</Text>}
                  {/* Macros when collapsed */}
                  {!nutExpanded ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                      {nutritionData ? (
                        <>
                          <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600' }}>🔥{nutritionData.calories.toLocaleString()}</Text>
                          <Text style={{ color: '#ffffff20', fontSize: 10 }}>·</Text>
                          <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600' }}>💪{nutritionData.protein}g</Text>
                          {nutritionData.carbs > 0 && <><Text style={{ color: '#ffffff20', fontSize: 10 }}>·</Text><Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600' }}>🍚{nutritionData.carbs}g</Text></>}
                          {nutritionData.fats > 0 && <><Text style={{ color: '#ffffff20', fontSize: 10 }}>·</Text><Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '600' }}>🥑{nutritionData.fats}g</Text></>}
                        </>
                      ) : (
                        <>
                          <Text style={{ color: '#ffffff30', fontSize: 11, fontWeight: '600' }}>🔥0 kcal</Text>
                          <Text style={{ color: '#ffffff20', fontSize: 10 }}>·</Text>
                          <Text style={{ color: '#ffffff30', fontSize: 11, fontWeight: '600' }}>💪0g</Text>
                        </>
                      )}
                    </View>
                  ) : null}
                  {/* Wins — always pushed to right */}
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: nutWinCount === totalNutWins ? '#4ade80' : nutWinCount > 0 ? '#facc15' : '#ffffff55', fontSize: nutExpanded ? 18 : 10, fontWeight: '900', letterSpacing: nutExpanded ? 0.5 : 0.3 }}>Wins: {nutWinCount}/{totalNutWins}</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Expandable meal log area */}
          <Animated.View style={{ height: nutExpandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, nutExpandedHeight] }), overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: '#0a1a10' }}>
              {/* Sub-nav header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff0a' }}>
                {mlView !== 'overview' && (
                  <TouchableOpacity onPress={() => { if (mlView === 'addFood') setMlView('detail'); else setMlView('overview'); }} style={{ marginRight: 12, paddingVertical: 4, paddingRight: 10, paddingLeft: 2 }}>
                    <Text style={{ color: COLORS.text, fontSize: 32, fontWeight: '600', lineHeight: 36 }}>‹</Text>
                  </TouchableOpacity>
                )}
                <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '800', flex: 1 }}>
                  {mlView === 'overview' ? 'Log Meals' : mlView === 'detail' ? `${mlActiveMeal?.icon} ${mlActiveMeal?.name}` : 'Add Food'}
                </Text>
                {mlView === 'overview' && onViewNutritionPlan && (
                  <TouchableOpacity onPress={onViewNutritionPlan} style={{ backgroundColor: '#2a2a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ffffff20' }}>
                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 12 }}>Nutrition Plan</Text>
                  </TouchableOpacity>
                )}
                {mlView === 'detail' && (
                  <TouchableOpacity onPress={() => { setMlAddMode('recent'); setMlView('addFood'); }} style={{ backgroundColor: '#2a2a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ffffff20' }}>
                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 12 }}>+ Add Food</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Daily totals + progress */}
              {(() => {
                const goalCal = nutritionGoal?.cal ?? 0;
                const goalProt = nutritionGoal?.prot ?? 0;
                const rows = [
                  { icon: '🔥', label: 'Calories', val: mlDailyTotals.calories, goal: goalCal, unit: 'kcal' },
                  { icon: '💪', label: 'Protein',  val: mlDailyTotals.protein,  goal: goalProt, unit: 'g' },
                  { icon: '🍚', label: 'Carbs',    val: mlDailyTotals.carbs,    goal: 0, unit: 'g' },
                  { icon: '🥑', label: 'Fats',     val: mlDailyTotals.fats,     goal: 0, unit: 'g' },
                ];
                return (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff08', backgroundColor: '#071210', gap: 6 }}>
                    {rows.map(({ icon, label, val, goal, unit }) => {
                      const hasGoal = goal > 0;
                      const pct = hasGoal ? Math.min(val / goal, 1.15) : null;
                      const over = hasGoal && val > goal * 1.1;
                      const hit = hasGoal && !over && val >= goal * 0.9;
                      const barColor = over ? '#f87171' : hit ? '#4ade80' : '#facc15';
                      return (
                        <View key={label}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700' }}>{icon} {label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ color: over ? '#f87171' : hit ? '#4ade80' : COLORS.text, fontSize: 11, fontWeight: '800' }}>
                                {val}{hasGoal ? ` / ${goal}` : ''} {unit}
                              </Text>
                              {over && <Text style={{ fontSize: 10 }}>🔴</Text>}
                              {hit && <Text style={{ fontSize: 10 }}>🟢</Text>}
                            </View>
                          </View>
                          {hasGoal && (
                            <View style={{ height: 4, backgroundColor: '#ffffff12', borderRadius: 2 }}>
                              <View style={{ height: 4, backgroundColor: barColor, borderRadius: 2, width: `${Math.min(pct * 100, 100)}%` }} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}

              {/* ── OVERVIEW ── */}
              {mlView === 'overview' && (
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, paddingBottom: 20 }}>
                  {mlMeals.map(meal => (
                    <TouchableOpacity key={meal.id} onPress={() => { setMlActiveMealId(meal.id); setMlView('detail'); }}
                      style={{ backgroundColor: '#1c1c3a', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#ffffff0a' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>{meal.icon}</Text>
                          <View>
                            <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 13 }}>{meal.name}</Text>
                            <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 1 }}>{meal.foods.length === 0 ? 'No foods yet' : `${meal.foods.length} food${meal.foods.length !== 1 ? 's' : ''}`}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {meal.totals.calories > 0 && <Text style={{ color: COLORS.success, fontWeight: '800', fontSize: 12 }}>{meal.totals.calories} kcal</Text>}
                          <TouchableOpacity
                            onPress={() => { setMlActiveMealId(meal.id); setMlAddMode('recent'); setMlView('addFood'); }}
                            style={{ backgroundColor: COLORS.success, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}
                          >
                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 12 }}>+ Add</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* ── DETAIL ── */}
              {mlView === 'detail' && mlActiveMeal && (
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 8, marginBottom: 10 }}>
                    {[['Cals', mlActiveMeal.totals.calories], ['Prot', mlActiveMeal.totals.protein + 'g'], ['Carbs', mlActiveMeal.totals.carbs + 'g'], ['Fats', mlActiveMeal.totals.fats + 'g']].map(([lbl, val]) => (
                      <View key={lbl} style={{ alignItems: 'center' }}>
                        <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 13 }}>{val}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 10 }}>{lbl}</Text>
                      </View>
                    ))}
                  </View>
                  {mlActiveMeal.foods.length === 0 ? (
                    <Text style={{ color: COLORS.muted, textAlign: 'center', marginTop: 20, fontSize: 12 }}>No foods yet — tap + Add Food</Text>
                  ) : mlActiveMeal.foods.map(food => {
                    const isEd = mlEditingFoodId === food.id;
                    const qNum = food.quantity || 1;
                    const qStr = qNum % 1 === 0 ? String(qNum) : qNum.toFixed(1);
                    const qDisp = food.unit ? `${qStr} × ${food.unit}` : qNum !== 1 ? `×${qStr}` : null;
                    return (
                      <View key={food.id} style={{ backgroundColor: isEd ? '#1e3a2a' : '#1c1c3a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: isEd ? '#4ade8040' : 'transparent' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ color: isEd ? COLORS.success : COLORS.text, fontWeight: '700', fontSize: 13 }}>{food.name}</Text>
                            {qDisp && <View style={{ backgroundColor: '#2a2a4a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700' }}>{qDisp}</Text></View>}
                          </View>
                          <TouchableOpacity onPress={() => { setMlEditingFoodId(isEd ? null : food.id); setMlEditQty(String(food.quantity || 1)); }} style={{ marginLeft: 8, padding: 4 }}>
                            <Text style={{ color: isEd ? COLORS.success : COLORS.muted, fontSize: 11, fontWeight: '700' }}>{isEd ? 'Done' : 'Edit'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { if (isEd) setMlEditingFoodId(null); mlRemoveFood(mlActiveMeal.id, food.id); }} style={{ marginLeft: 8, padding: 4 }}>
                            <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '700' }}>×</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 2 }}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fats}g F</Text>
                        {isEd && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 11, flex: 1 }}>Qty</Text>
                            <TouchableOpacity onPress={() => setMlEditQty(v => String(Math.max(0.5, Math.round((parseFloat(v) || 1) * 2 - 1) / 2)))} style={{ width: 28, height: 28, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 18 }}>−</Text>
                            </TouchableOpacity>
                            <TextInput value={mlEditQty} onChangeText={setMlEditQty} keyboardType="decimal-pad" style={{ width: 40, textAlign: 'center', color: COLORS.text, fontSize: 12, fontWeight: '700', backgroundColor: '#2a2a4a', borderRadius: 6, paddingVertical: 4 }} />
                            <TouchableOpacity onPress={() => setMlEditQty(v => String(Math.round((parseFloat(v) || 1) * 2 + 1) / 2))} style={{ width: 28, height: 28, backgroundColor: '#2a2a4a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 18 }}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => mlUpdateQty(mlActiveMeal.id, food.id, mlEditQty)} style={{ backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 4 }}>
                              <Text style={{ color: '#000', fontWeight: '800', fontSize: 11 }}>Update</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* ── ADD FOOD ── */}
              {mlView === 'addFood' && (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', margin: 10, backgroundColor: '#1c1c3a', borderRadius: 10, padding: 3 }}>
                    {[['recent', 'Recent'], ['search', 'Search'], ['quick', 'Quick Add']].map(([mode, label]) => (
                      <TouchableOpacity key={mode} onPress={() => setMlAddMode(mode)} style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', backgroundColor: mlAddMode === mode ? COLORS.accent : 'transparent' }}>
                        <Text style={{ color: mlAddMode === mode ? '#fff' : COLORS.muted, fontWeight: '700', fontSize: 11 }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {mlAddMode === 'recent' && (
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, paddingBottom: 20 }}>
                      {recentMeals.length === 0 ? <Text style={{ color: COLORS.muted, textAlign: 'center', marginTop: 20, fontSize: 12 }}>No previous meals yet</Text> : recentMeals.map((meal, idx) => {
                        const preview = meal.foods.slice(0, 3).map(f => f.name).join(', ') + (meal.foods.length > 3 ? ` +${meal.foods.length - 3} more` : '');
                        return (
                          <View key={idx} style={{ backgroundColor: '#1c1c3a', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#ffffff10' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>{mlFormatKey(meal.dateKey)} · {meal.icon} {meal.name}</Text>
                                <Text style={{ color: COLORS.muted, fontSize: 11 }} numberOfLines={2}>{preview}</Text>
                              </View>
                              <TouchableOpacity onPress={() => { mlAddAllFromMeal(meal.foods); setMlView('overview'); }} style={{ backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                                <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Add All</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}

                  {mlAddMode === 'search' && (
                    <View style={{ flex: 1, minHeight: 0 }}>
                      <View style={{ marginHorizontal: 10, marginBottom: 8, backgroundColor: '#1c1c3a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' }}>
                        <Text style={{ color: COLORS.muted, marginRight: 6, fontSize: 12 }}>🔍</Text>
                        <TextInput value={mlSearch} onChangeText={v => { setMlSearch(v); setMlSelectedFood(null); setMlQty('1'); }} placeholder="Search foods..." placeholderTextColor={COLORS.muted} style={{ flex: 1, color: COLORS.text, fontSize: 13 }} autoFocus />
                        {mlSearch.length > 0 && <TouchableOpacity onPress={() => { setMlSearch(''); setMlSelectedFood(null); setMlQty('1'); }}><Text style={{ color: COLORS.muted, fontSize: 14, paddingLeft: 6 }}>×</Text></TouchableOpacity>}
                      </View>
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        style={{ height: nutExpandedHeight - 140 }}
                        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
                      >
                        {filteredDB.length === 0 && <Text style={{ color: COLORS.muted, textAlign: 'center', marginTop: 20, fontSize: 12 }}>No foods match your search</Text>}
                        {filteredDB.map(food => {
                          const isSel = mlSelectedFood?.name === food.name;
                          const q = isSel ? Math.max(parseFloat(mlQty) || 1, 0.1) : 1;
                          return (
                            <TouchableOpacity key={food.name} activeOpacity={isSel ? 1 : 0.7} onPress={() => { if (!isSel) { setMlSelectedFood(food); setMlQty('1'); } }}
                              style={{ backgroundColor: isSel ? '#1e3a2a' : '#1c1c3a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, borderWidth: 1, borderColor: isSel ? '#4ade8060' : 'transparent' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => onToggleFavorite?.(food.name)} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                                  <Text style={{ fontSize: food.isFavorite ? 13 : 11, opacity: food.isFavorite ? 1 : 0.12 }}>⭐</Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: isSel ? COLORS.success : COLORS.text, fontWeight: '700', fontSize: 13 }}>{food.name}</Text>
                                  <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 1 }}>
                                    {isSel ? `${Math.round(food.calories * q)} kcal · ${Math.round(food.protein * q)}g P · ${Math.round(food.carbs * q)}g C · ${Math.round(food.fats * q)}g F` : `${food.calories} kcal · ${food.protein}g P · ${food.carbs}g C · ${food.fats}g F`}
                                  </Text>
                                </View>
                                {isSel ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, gap: 4 }}>
                                    <View style={{ alignItems: 'center', gap: 3 }}>
                                      <TouchableOpacity onPress={() => setMlQty(v => String(Math.round((parseFloat(v) || 1) * 2 + 1) / 2))} style={{ width: 26, height: 22, backgroundColor: '#2a2a4a', borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 16 }}>+</Text>
                                      </TouchableOpacity>
                                      <TextInput value={mlQty} onChangeText={setMlQty} keyboardType="decimal-pad" style={{ width: 34, textAlign: 'center', color: COLORS.text, fontSize: 12, fontWeight: '700', backgroundColor: '#2a2a4a', borderRadius: 5, paddingVertical: 2 }} />
                                      <TouchableOpacity onPress={() => setMlQty(v => String(Math.max(0.5, Math.round((parseFloat(v) || 1) * 2 - 1) / 2)))} style={{ width: 26, height: 22, backgroundColor: '#2a2a4a', borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 16 }}>−</Text>
                                      </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => mlAddFood(food, mlQty)} style={{ width: 32, height: 32, backgroundColor: COLORS.success, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
                                      <Text style={{ color: '#000', fontSize: 20, fontWeight: '800', lineHeight: 22 }}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity onPress={() => { setMlSelectedFood(food); setMlQty('1'); }} style={{ width: 26, height: 26, backgroundColor: '#2a2a4a', borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
                                    <Text style={{ color: COLORS.success, fontSize: 18, fontWeight: '300', lineHeight: 20 }}>+</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {mlAddMode === 'quick' && (
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, paddingBottom: 20 }}>
                      {[['Name', 'name', 'default'], ['Unit (e.g. 100g)', 'unit', 'default'], ['Quantity', 'quantity', 'decimal-pad'], ['Calories (per serving)', 'calories', 'numeric'], ['Protein (g)', 'protein', 'numeric'], ['Carbs (g)', 'carbs', 'numeric'], ['Fats (g)', 'fats', 'numeric']].map(([label, key, kb]) => (
                        <View key={key} style={{ marginBottom: 8 }}>
                          <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 }}>{label.toUpperCase()}</Text>
                          <TextInput value={mlQuickMacros[key]} onChangeText={v => setMlQuickMacros(p => ({ ...p, [key]: v }))} keyboardType={kb} placeholder={key === 'quantity' ? '1' : label} placeholderTextColor="#ffffff30" style={{ backgroundColor: '#1c1c3a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 13, borderWidth: 1, borderColor: '#ffffff10' }} />
                        </View>
                      ))}
                      <TouchableOpacity onPress={() => {
                        if (!mlQuickMacros.name.trim()) { Alert.alert('Enter a name'); return; }
                        const qv = Math.max(parseFloat(mlQuickMacros.quantity) || 1, 0.1);
                        const cf = { name: mlQuickMacros.name.trim(), unit: mlQuickMacros.unit.trim(), calories: parseInt(mlQuickMacros.calories) || 0, protein: parseInt(mlQuickMacros.protein) || 0, carbs: parseInt(mlQuickMacros.carbs) || 0, fats: parseInt(mlQuickMacros.fats) || 0 };
                        onSaveCustomFood?.(cf); mlAddFood(cf, qv);
                      }} style={{ backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
                        <Text style={{ color: '#000', fontWeight: '800', fontSize: 14 }}>Add Food</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Day card — absolutely positioned on top, rendered last so it paints over nutrition */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={onPress}
          style={{
            position: 'absolute',
            top: -2,
            left: 0,
            right: 0,
            flexDirection: 'row',
            backgroundColor: cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: cardBorder,
            borderTopColor: cardBorderTop,
            elevation: 2,
          }}
        >
          {/* Left accent bar */}
          {!isRestDay && (
            <View style={{ width: 3, backgroundColor: isCompleted ? '#3a3a5a' : accentColor, borderRadius: 2, marginVertical: 14, marginLeft: 12, opacity: isCompleted ? 0.5 : isToday && !isCompleted ? 1 : 0.7 }} />
          )}
          <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 10 }}>
            {/* Top row: name + badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ color: isRestDay ? '#8a8aaa' : '#ffffffcc', fontWeight: '700', fontSize: 16 }}>{dayName}</Text>
                  {workoutLabel ? (
                    <Text style={{ color: isRestDay ? '#6a6a8a' : '#ffffff77', fontSize: 13 }}>– {workoutLabel}</Text>
                  ) : null}
                </View>
                <Text style={{ color: isRestDay ? '#4a4a6a' : '#ffffff44', fontSize: 12, marginTop: 3 }}>
                  {isRestDay ? 'Rest & Recovery' : `${workoutExs.length} exercises`}
                </Text>
              </View>
              {isCompleted && (
                <TouchableOpacity
                  onPress={onPress}
                  style={{ backgroundColor: '#ffffff0e', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#ffffff18', marginLeft: 4 }}
                >
                  <Text style={{ color: '#ffffffcc', fontSize: 10, fontWeight: '700' }}>Details</Text>
                </TouchableOpacity>
              )}
              {badge ? <View style={{ paddingLeft: 4, alignItems: 'center' }}>{badge}</View> : null}
            </View>
            {/* CTA row */}
          </View>
        </TouchableOpacity>

      </Animated.View>
    </Animated.View>
  );
}

// ── Workout Complete celebration modal ────────────────────────
const CONFETTI_COLORS = ['#4ade80', '#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
const CONFETTI_COUNT = 30;

function DayCompleteModal({ visible, selectedDay, logs, currentWeek, onSaveExit, showNutritionNudge, onNutrition }) {
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
          {showNutritionNudge && (
            <TouchableOpacity
              onPress={onNutrition}
              style={{ marginTop: 24, backgroundColor: '#0e2218', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#4ade8040', borderTopColor: '#4ade8070' }}
            >
              <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>Want to maximize results? 🥗</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 18 }}>Let's dial in your nutrition. Your macros are ready — tap to view your personalized plan.</Text>
              <View style={{ marginTop: 12, backgroundColor: '#4ade8022', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 14 }}>View Nutrition Plan →</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onSaveExit}
            style={{ marginTop: 12, backgroundColor: showNutritionNudge ? 'transparent' : '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: showNutritionNudge ? 1 : 0, borderColor: '#ffffff15' }}
          >
            <Text style={{ color: showNutritionNudge ? COLORS.muted : '#000', fontWeight: '800', fontSize: 16 }}>{showNutritionNudge ? 'Maybe later' : 'Save & Exit'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// cfg: [shoulderW, upperTorsoW, waistW, lowerTorsoW, hipW]
const MALE_BODY_TYPES = [
  { bf: 8,  label: 'Athletic',     color: '#4ade80', cfg: [48, 32, 26, 28, 33] },
  { bf: 13, label: 'Fit',          color: '#34d399', cfg: [47, 36, 30, 32, 36] },
  { bf: 18, label: 'Average',      color: '#f59e0b', cfg: [45, 40, 36, 38, 40] },
  { bf: 23, label: 'Soft',         color: '#f97316', cfg: [44, 44, 42, 45, 44] },
  { bf: 28, label: 'Above Avg',    color: '#ef4444', cfg: [43, 48, 48, 53, 48] },
  { bf: 36, label: 'Overweight',   color: '#dc2626', cfg: [41, 52, 55, 62, 54] },
];
const FEMALE_BODY_TYPES = [
  { bf: 16, label: 'Athletic',     color: '#4ade80', cfg: [40, 30, 22, 24, 44] },
  { bf: 21, label: 'Fit',          color: '#34d399', cfg: [40, 33, 26, 28, 46] },
  { bf: 26, label: 'Average',      color: '#f59e0b', cfg: [40, 36, 31, 33, 48] },
  { bf: 31, label: 'Soft',         color: '#f97316', cfg: [41, 40, 37, 40, 50] },
  { bf: 36, label: 'Above Avg',    color: '#ef4444', cfg: [42, 46, 44, 47, 52] },
  { bf: 42, label: 'Overweight',   color: '#dc2626', cfg: [43, 52, 51, 56, 54] },
];

function BodySilhouette({ typeIndex, isFemale, selected, color }) {
  const types = isFemale ? FEMALE_BODY_TYPES : MALE_BODY_TYPES;
  const t = types[typeIndex];
  const [sw, utw, ww, ltw, hw] = t.cfg;
  const fill = selected ? color : color + '60';
  const armW = isFemale ? 5 : 6;
  const legW = Math.round(hw * 0.38);

  return (
    <View style={{ alignItems: 'center', height: 82 }}>
      {/* Head */}
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: fill, marginBottom: 1 }} />
      {/* Neck */}
      <View style={{ width: 5, height: 3, backgroundColor: fill }} />
      {/* Shoulders + arms row */}
      <View style={{ width: sw + armW * 2 + 2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
        {/* Left arm */}
        <View style={{ width: armW, height: 17, backgroundColor: fill, borderRadius: 3, marginTop: 1, transform: [{ rotate: '7deg' }] }} />
        {/* Shoulder bar */}
        <View style={{ width: sw, height: 4, borderRadius: 3, backgroundColor: fill, marginTop: 0, marginHorizontal: 1 }} />
        {/* Right arm */}
        <View style={{ width: armW, height: 17, backgroundColor: fill, borderRadius: 3, marginTop: 1, transform: [{ rotate: '-7deg' }] }} />
      </View>
      {/* Upper torso */}
      <View style={{ width: utw, height: 9, backgroundColor: fill }} />
      {/* Waist */}
      <View style={{ width: ww, height: isFemale ? 5 : 3, backgroundColor: fill }} />
      {/* Lower torso */}
      <View style={{ width: ltw, height: isFemale ? 8 : 10, backgroundColor: fill, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
      {/* Hips */}
      <View style={{ width: hw, height: isFemale ? 9 : 6, borderRadius: isFemale ? 5 : 3, backgroundColor: fill }} />
      {/* Legs */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: legW, height: 19, backgroundColor: fill, borderBottomLeftRadius: 4, borderBottomRightRadius: 2 }} />
        <View style={{ width: legW, height: 19, backgroundColor: fill, borderBottomLeftRadius: 2, borderBottomRightRadius: 4 }} />
      </View>
    </View>
  );
}


function AnimatedBodyCard({ t, i, isFemale, isSelected, onPress }) {
  const scale = useRef(new Animated.Value(isSelected ? 1.06 : 1)).current;
  const glow  = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: isSelected ? 1.06 : 1, tension: 180, friction: 10, useNativeDriver: true }),
      Animated.timing(glow,  { toValue: isSelected ? 1 : 0, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [isSelected]);
  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff0e', t.color] });
  const bgColor     = glow.interpolate({ inputRange: [0, 1], outputRange: [COLORS.surface, t.color + '18'] });
  return (
    <Animated.View style={{
      width: '30%',
      transform: [{ scale }],
      shadowColor: t.color,
      shadowOpacity: isSelected ? 0.45 : 0,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: isSelected ? 6 : 0,
    }}>
      <Animated.View style={{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: bgColor,
        paddingVertical: 7,
        paddingHorizontal: 6,
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', width: '100%' }}>
          <BodySilhouette typeIndex={i} isFemale={isFemale} selected={isSelected} color={t.color} />
          <Text style={{ color: isSelected ? t.color : COLORS.muted, fontSize: 11, fontWeight: isSelected ? '700' : '400', marginTop: 8 }}>{t.label}</Text>
          <Text style={{ color: isSelected ? t.color : COLORS.muted, fontSize: 10, opacity: 0.7 }}>~{t.bf}%</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

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

function ConfettiEffect() {
  const COLORS_CONF = ['#6c80ff', '#4ade80', '#f59e0b', '#ec4899', '#60a5fa', '#a78bfa'];
  const pieces = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: 4 + (i * 5.5) % 92,
      color: COLORS_CONF[i % COLORS_CONF.length],
      size: 5 + (i % 3) * 2,
      delay: i * 55,
      fallDist: 90 + (i % 5) * 28,
      rotateEnd: `${(i * 67) % 360}deg`,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map(p =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: 1300, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: 6,
            width: p.size,
            height: p.size,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.85, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.fallDist] }) },
              { rotate:     p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.rotateEnd] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function ScrollPicker({ items, selectedValue, onValueChange, itemHeight = 46, visibleRows = 5, width, onScrollStart, onScrollEnd }) {
  const scrollRef = useRef(null);
  const containerHeight = itemHeight * visibleRows;
  const centerRow = Math.floor(visibleRows / 2);
  // Track the current committed index so we can avoid unnecessary re-renders
  const committedIdx = useRef(Math.max(0, items.indexOf(selectedValue)));
  // Resolve effective selected value (fall back to first item if empty/missing)
  const effectiveSelected = items.includes(selectedValue) ? selectedValue : items[0];

  // Scroll to initial position after layout
  useEffect(() => {
    const idx = Math.max(0, items.indexOf(effectiveSelected));
    committedIdx.current = idx;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll programmatically if parent changes the value externally
  useEffect(() => {
    const idx = Math.max(0, items.indexOf(effectiveSelected));
    if (idx !== committedIdx.current) {
      committedIdx.current = idx;
      scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
    }
  }, [effectiveSelected]);

  function handleScrollEnd(e) {
    const idx = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.y / itemHeight), items.length - 1));
    if (idx !== committedIdx.current) {
      committedIdx.current = idx;
      onValueChange(items[idx]);
      scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
    }
  }

  return (
    <View style={{ height: containerHeight, width, overflow: 'hidden', borderRadius: 8 }}>
      {/* Selection highlight band */}
      <View pointerEvents="none" style={{ position: 'absolute', top: itemHeight * centerRow, left: 6, right: 6, height: itemHeight, backgroundColor: COLORS.accent + '20', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.accent + '55', borderRadius: 8, zIndex: 1 }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: itemHeight * centerRow }}
        onScrollBeginDrag={() => onScrollStart?.()}
        onMomentumScrollEnd={(e) => { handleScrollEnd(e); onScrollEnd?.(); }}
        onScrollEndDrag={(e) => { handleScrollEnd(e); onScrollEnd?.(); }}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const isSelected = item === effectiveSelected;
          return (
            <View key={i} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: isSelected ? COLORS.text : '#3a3a5a', fontSize: isSelected ? 17 : 13, fontWeight: isSelected ? '800' : '400' }}>{item}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}


function Root() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
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
  const [nutritionHistory, setNutritionHistory] = useState({});
  const [dailyWins, setDailyWins] = useState({});
  const [showNutritionLogModal, setShowNutritionLogModal] = useState(false);
  const [expandedNutKey, setExpandedNutKey] = useState(null);
  const weekCardAnim2 = useRef(new Animated.Value(1)).current;
  const planScrollOffsetRef = useRef(0);
  const planSavedScrollOffsetRef = useRef(0);
  const planSavedScrollIndexRef = useRef(null);
  const planFlatListTopRef = useRef(0); // absolute Y of FlatList on screen
  const planFlatListContainerRef = useRef(null);
  const [mealLogModalKey, setMealLogModalKey] = useState(null); // nutKey when modal is open
  const [customFoods, setCustomFoods] = useState([]);
  const [favoriteFoods, setFavoriteFoods] = useState([]); // array of food names
  const [nutritionLogInput, setNutritionLogInput] = useState({ calories: '', protein: '' });
  const [nutritionLogDate, setNutritionLogDate] = useState('');
  const [stretchImgModal, setStretchImgModal] = useState(null);
  const [user, setUser] = useState(null);
  const [restTimerDuration, setRestTimerDuration] = useState(60);
  const [restTimerRemaining, setRestTimerRemaining] = useState(60);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [restingForExercise, setRestingForExercise] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [previewGoal, setPreviewGoal] = useState(null);
  const [sessionSets, setSessionSets] = useState([]);
  const [weightPickerVisible, setWeightPickerVisible] = useState(false);
  const [weightPickerIndex, setWeightPickerIndex] = useState(null);
  const [tempWeightVal, setTempWeightVal] = useState(null);
  const weightListRef = useRef(null);
  const regNameRef   = useRef(null);
  const regEmailRef  = useRef(null);
  const regPassRef   = useRef(null);
  const [nameSelection, setNameSelection] = useState(undefined);
  const [emailSelection, setEmailSelection] = useState(undefined);
  const [passSelection, setPassSelection] = useState(undefined);
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);
  const ageInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const protAnim = useRef(new Animated.Value(0)).current;
  const calAnim  = useRef(new Animated.Value(0)).current;
  const [repsPickerVisible, setRepsPickerVisible] = useState(false);
  const [repsPickerIndex, setRepsPickerIndex] = useState(null);
  const [authForm, setAuthForm] = useState({ name: 'Test Test', email: 'test@test.com', password: 'Unicycle12!' });
  const [authError, setAuthError] = useState('');
  const [profileStep, setProfileStep] = useState(1);
  const [profileForm, setProfileForm] = useState({
    gender: '', age: '', weightLbs: '', heightFt: '', heightIn: '',
    bodyFatPct: '18', chest: '40', waist: '34', hips: '38', arms: '14', thighs: '22',
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
  const [weekCardExpanded, setWeekCardExpanded] = useState(false);
  const weekCardAnim = useRef(new Animated.Value(0)).current;
  const weekSlideAnim = useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH } = require('react-native').Dimensions.get('window');
  function changeWeek(newWeek) {
    const dir = newWeek > currentWeek ? 1 : -1;
    weekSlideAnim.setValue(0);
    Animated.sequence([
      Animated.timing(weekSlideAnim, { toValue: -dir * SCREEN_WIDTH, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setCurrentWeek(newWeek);
      weekSlideAnim.setValue(dir * SCREEN_WIDTH);
      Animated.timing(weekSlideAnim, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      setTimeout(() => {
        if (!planFlatListRef.current || !plan) return;
        let activeWeek = null;
        for (let w = 1; w <= TOTAL_WEEKS; w++) {
          const hasIncomplete = plan.some(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${w}`]);
          if (hasIncomplete) { activeWeek = w; break; }
        }
        if (newWeek !== activeWeek) {
          planFlatListRef.current.scrollToIndex({ index: 0, animated: false });
        } else {
          const nextIdx = plan.findIndex(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${newWeek}`]);
          if (nextIdx > 0) planFlatListRef.current.scrollToIndex({ index: nextIdx, animated: false, viewPosition: 0.1 });
        }
      }, 50);
    });
  }
  const [nutritionExpanded, setNutritionExpanded] = useState(false);
  const nutritionExpandAnim  = useRef(new Animated.Value(0)).current;
  const nutritionContentAnim = useRef(new Animated.Value(0)).current;
  const nutritionArrowAnim   = useRef(new Animated.Value(0)).current;
  const bmiAnim = useRef(new Animated.Value(0)).current;
  const planHeaderAnim = useRef(new Animated.Value(0)).current;
  const planStatsAnim  = useRef(new Animated.Value(0)).current;
  const planCardAnims  = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current;
  const planEnterAnim      = useRef(new Animated.Value(1)).current;
  const dayEnterAnim       = useRef(new Animated.Value(0)).current;
  const progressEnterAnim  = useRef(new Animated.Value(0)).current;
  const exerciseSlideAnim      = useRef(new Animated.Value(0)).current;
  const pendingSlideDirection  = useRef(0);

  const weightPulseAnim = useRef(new Animated.Value(1)).current;
  const [currentWeek, setCurrentWeek] = useState(1);
  const TOTAL_WEEKS = 8;
  const [planSlideFromLeft, setPlanSlideFromLeft] = useState(false);
  const [daySlideFromLeft, setDaySlideFromLeft] = useState(false);
  const [weekDetailFrom, setWeekDetailFrom] = useState('plan');
  const [settingsFrom, setSettingsFrom] = useState('plan');
  const [restTimerEnabled, setRestTimerEnabled] = useState(true);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showNutritionNudge, setShowNutritionNudge] = useState(false);
  const [weightSetupMode, setWeightSetupMode] = useState('recommended');
  const [userMaxes, setUserMaxes] = useState({ bench: '', squat: '', deadlift: '' });
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [showUpdateWeightsPrompt, setShowUpdateWeightsPrompt] = useState(false);
  const [weightsPromptDismissed, setWeightsPromptDismissed] = useState(false);
  const weightsSeenRef = useRef(false);
  const planFlatListRef = useRef(null);
  const [suggestedWeights, setSuggestedWeights] = useState(null);
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
            if (hasLogs || dayTitle.includes('Rest')) validated[key] = completedRaw[key];
          }
          setCompletedWorkouts(validated);
          if (data.restTimerEnabled !== undefined) setRestTimerEnabled(data.restTimerEnabled);
          if (data.profile) setProfileForm(f => ({ ...f, ...data.profile }));
          if (data.nutritionHistory) setNutritionHistory(data.nutritionHistory);
          if (data.customFoods) setCustomFoods(data.customFoods);
          if (data.favoriteFoods) setFavoriteFoods(data.favoriteFoods);
          if (data.nutritionResult) setNutritionResult(data.nutritionResult);
          if (data.dailyWins) setDailyWins(data.dailyWins);
          if (data.weightsPromptDismissed) setWeightsPromptDismissed(true);
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

  // Show weights prompt on first plan visit if week 1 is not yet complete
  useEffect(() => {
    if (screen === 'plan' && !weightsSeenRef.current) {
      weightsSeenRef.current = true;
      const workoutDays = plan?.filter(d => !d.day.includes('Rest')) || [];
      const week1Complete = workoutDays.length > 0 && workoutDays.every(d => completedWorkouts[`${d.day}|1`]);
      if (!week1Complete) {
        if (suggestedWeights) {
          if (!weightsPromptDismissed) setShowUpdateWeightsPrompt(true);
        } else {
          setShowWeightsModal(true);
        }
      }
    }
  }, [screen]);

  // Default nutrition panel to next day when entering plan screen

  // Trigger plan reveal animations + day screen entrance
  useEffect(() => {
    if (screen === 'plan-preview') {
      planHeaderAnim.setValue(0);
      planStatsAnim.setValue(0);
      planCardAnims.forEach(a => a.setValue(0));
      Animated.sequence([
        Animated.timing(planHeaderAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(planStatsAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.stagger(110, planCardAnims.map(a =>
          Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: true })
        )),
      ]).start();
    }
    if (screen === 'plan') {
      planEnterAnim.setValue(0);
      Animated.timing(planEnterAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setPlanSlideFromLeft(false));
    }
    if (screen === 'day') {
      dayEnterAnim.setValue(0);
      Animated.timing(dayEnterAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setDaySlideFromLeft(false));
    }
    if (screen === 'progress') {
      if (pendingSlideDirection.current === 0) {
        progressEnterAnim.setValue(0);
        exerciseSlideAnim.setValue(0);
        Animated.timing(progressEnterAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
      weightPulseAnim.stopAnimation();
      weightPulseAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(weightPulseAnim, { toValue: 1.08, duration: 550, useNativeDriver: true }),
          Animated.timing(weightPulseAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      ).start();
    } else {
      weightPulseAnim.stopAnimation();
      weightPulseAnim.setValue(1);
    }
  }, [screen]);

  useEffect(() => {
    if (pendingSlideDirection.current !== 0) {
      Animated.timing(exerciseSlideAnim, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      pendingSlideDirection.current = 0;
    }
  }, [selectedExercise]);

  // Auto-apply smart defaults when arriving at each onboarding step
  useEffect(() => {
    if (screen !== 'profile') return;
    if (profileStep === 3) {
      const bf = parseInt(profileForm.bodyFatPct);
      if (!profileForm.primaryGoal && bf) {
        const isFemale = profileForm.gender === 'Female';
        const goal = bf < (isFemale ? 22 : 15) ? 'Build Muscle'
          : bf < (isFemale ? 30 : 25) ? 'Build Muscle & Lose Fat'
          : 'Lose Fat';
        setProfileForm(f => ({ ...f, primaryGoal: goal }));
      }
    }
    if (profileStep === 4) {
      if (!profileForm.trainingDays) setProfileForm(f => ({ ...f, trainingDays: '5' }));
      if (!profileForm.fitnessLevel) setProfileForm(f => ({ ...f, fitnessLevel: 'Intermediate' }));
    }
    if (profileStep === 5) {
      if (!profileForm.activityLevel) {
        const def = profileForm.trainingDays === '5' ? 'Moderately Active' : 'Lightly Active';
        setProfileForm(f => ({ ...f, activityLevel: def }));
      }
      if (!profileForm.sleepQuality) setProfileForm(f => ({ ...f, sleepQuality: 'Good' }));
    }
  }, [profileStep, screen]);

  // Animate BMI card in/out as height+weight are filled
  useEffect(() => {
    const hIn = profileForm.heightFt ? parseInt(profileForm.heightFt) * 12 + (parseInt(profileForm.heightIn) || 0) : 0;
    const hasBmi = hIn > 0 && !!profileForm.weightLbs;
    Animated.spring(bmiAnim, { toValue: hasBmi ? 1 : 0, useNativeDriver: true, tension: 60, friction: 9 }).start();
  }, [profileForm.heightFt, profileForm.heightIn, profileForm.weightLbs]);

  // Auto-advance to the user's current active week on load
  useEffect(() => {
    if (!plan || Object.keys(completedWorkouts).length === 0) return;
    const workoutDays = plan.filter(d => !d.day.includes('Rest'));
    let maxWeek = 1;
    for (const key of Object.keys(completedWorkouts)) {
      const parts = key.split('|');
      const weekNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(weekNum) && weekNum > maxWeek) maxWeek = weekNum;
    }
    const allDoneInMaxWeek = workoutDays.every(d => completedWorkouts[`${d.day}|${maxWeek}`]);
    const activeWeek = allDoneInMaxWeek ? Math.min(maxWeek + 1, TOTAL_WEEKS) : maxWeek;
    setCurrentWeek(activeWeek);
  }, [plan]);

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
    setAuthForm({ name: 'Test Test', email: 'test@test.com', password: 'Unicycle12!' });
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
      setNutritionHistory({});
      setNutritionResult(null);
      setDailyWins({});
      setCustomFoods([]);
      setFavoriteFoods([]);
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
      // Reset all user-specific data before loading new user's data
      setNutritionHistory({});
      setNutritionResult(null);
      setDailyWins({});
      setCustomFoods(found.customFoods || []);
      setFavoriteFoods(found.favoriteFoods || []);
      setSuggestedWeights(null);
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
        if (hasLogs || dayTitle.includes('Rest')) validated[key] = completedRaw[key];
      }
      setCompletedWorkouts(validated);
      if (found.restTimerEnabled !== undefined) setRestTimerEnabled(found.restTimerEnabled);
      if (found.suggestedWeights) setSuggestedWeights(found.suggestedWeights);
      if (found.nutritionHistory) setNutritionHistory(found.nutritionHistory);
      if (found.dailyWins) setDailyWins(found.dailyWins);
      if (found.nutritionResult) {
        setNutritionResult(found.nutritionResult);
      } else if (found.profile) {
        // nutritionResult wasn't saved — recalculate from profile
        const pf = found.profile;
        const age = pf.age; const gender = pf.gender || found.gender;
        const heightFt = pf.heightFt; const heightIn = pf.heightIn || '0';
        const weight = pf.weightLbs; const activityLevel = pf.activityLevel || 'Moderately Active';
        if (age && gender && heightFt && weight) {
          const tdee = calculateTDEE(age, gender, heightFt, heightIn, weight, activityLevel);
          const goalAdj = { 'Build Muscle': 300, 'Lose Fat': -500, 'Build Muscle & Lose Fat': 0, 'Get Stronger': 150 };
          const adj = goalAdj[pf.primaryGoal] ?? 0;
          const nr = { tdee, cut: tdee - 500, bulk: tdee + 300, target: tdee + adj, proteinG: Math.round(parseFloat(weight)), weight: parseFloat(weight) };
          setNutritionResult(nr);
          updateDoc(doc(db, 'users', email), { nutritionResult: nr });
        }
      }
      if (found.goal) {
        // Fully registered — restore plan and route to appropriate screen
        setPlan(WORKOUT_PLANS[found.goal]);
        setAnswers(a => ({ ...a, goal: found.goal }));
        const isFirstTime = Object.keys(foundLogs).length === 0;
        setScreen(isFirstTime ? 'plan-preview' : 'plan');
      } else if (found.profile) {
        // Completed profile setup but never picked a goal — go to quiz
        setScreen('quiz');
      } else {
        // Never finished profile setup — restart from beginning
        setProfileStep(1);
        setProfileForm({ gender: '', age: '', weightLbs: '', heightFt: '', heightIn: '', bodyFatPct: '', chest: '', waist: '', hips: '', arms: '', thighs: '', primaryGoal: '', trainingDays: '', fitnessLevel: '', sleepQuality: '', dailyCalories: '' });
        setScreen('profile-setup');
      }
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
        showNutritionNudge={showNutritionNudge}
        onNutrition={() => {
          setShowDayComplete(false);
          setShowNutritionNudge(false);
          setScreen('plan');
          const idx = plan ? plan.findIndex(d => d.day === selectedDay?.day) : -1;
          if (idx >= 0) {
            const key = `w${currentWeek}_d${idx + 1}`;
            planSavedScrollIndexRef.current = idx;
            setTimeout(() => {
              Animated.timing(weekCardAnim2, { toValue: 0, duration: 200, useNativeDriver: false }).start();
              setExpandedNutKey(key);
            }, 150);
          }
        }}
        onSaveExit={() => { setShowDayComplete(false); setShowNutritionNudge(false); setScreen('plan'); }}
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


    if (key === 'goal' && value.startsWith('Building Muscle')) {
      setPlan(WORKOUT_PLANS[value]);
      if (user) updateDoc(doc(db, 'users', user.email), { goal: value });
      // Auto-calculate nutrition from onboarding data
      const pf = profileForm;
      const age = pf.age;
      const gender = pf.gender || user?.gender;
      const heightFt = pf.heightFt;
      const heightIn = pf.heightIn || '0';
      const weight = pf.weightLbs;
      const activityLevel = pf.activityLevel || 'Moderately Active';
      if (age && gender && heightFt && weight) {
        const tdee = calculateTDEE(age, gender, heightFt, heightIn, weight, activityLevel);
        const goalAdj = { 'Build Muscle': 300, 'Lose Fat': -500, 'Build Muscle & Lose Fat': 0, 'Get Stronger': 150 };
        const adj = goalAdj[pf.primaryGoal] ?? 0;
        const cut = tdee - 500;
        const bulk = tdee + 300;
        const target = tdee + adj;
        const proteinG = Math.round(parseFloat(weight));
        const nr = { tdee, cut, bulk, target, proteinG, weight: parseFloat(weight) };
        setNutritionResult(nr);
        if (user) updateDoc(doc(db, 'users', user.email), { nutritionResult: nr });
      }
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

          <Text style={{ color: COLORS.text, fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>Create Account</Text>
          <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 }}>
            Save your workouts, track progress,{'\n'}and unlock your personalized plan.
          </Text>

          {/* Full Name */}
          <View style={styles.authField}>
            <TouchableOpacity onPress={() => { setNameSelection({ start: 0, end: 0 }); regNameRef.current?.focus(); }}>
              <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>👤</Text>
            </TouchableOpacity>
            <TextInput
              ref={regNameRef}
              style={styles.authInput}
              placeholder="Full Name"
              placeholderTextColor={COLORS.muted}
              value={authForm.name}
              selection={nameSelection}
              onSelectionChange={() => setNameSelection(undefined)}
              onChangeText={v => setAuthForm(f => ({ ...f, name: v }))}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => regEmailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Email */}
          {(() => {
            const emailValid = authForm.email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email);
            const emailTouched = authForm.email.length > 0;
            return (
              <View>
                <View style={[styles.authField, emailTouched && { borderColor: emailValid ? '#4ade8060' : '#e9456060', borderWidth: 1 }]}>
                  <TouchableOpacity onPress={() => { setEmailSelection({ start: 0, end: 0 }); regEmailRef.current?.focus(); }}>
                    <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>✉</Text>
                  </TouchableOpacity>
                  <TextInput
                    ref={regEmailRef}
                    style={styles.authInput}
                    placeholder="Email"
                    placeholderTextColor={COLORS.muted}
                    value={authForm.email}
                    selection={emailSelection}
                    onSelectionChange={() => setEmailSelection(undefined)}
                    onChangeText={v => setAuthForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => regPassRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  {emailTouched && (
                    <Text style={{ fontSize: 14, marginLeft: 6 }}>{emailValid ? '✅' : '❌'}</Text>
                  )}
                </View>
              </View>
            );
          })()}

          {/* Password */}
          {(() => {
            const passLen = authForm.password.length;
            const passTouched = passLen > 0;
            const passValid = passLen >= 8;
            return (
              <View>
                <View style={[styles.authField, passTouched && { borderColor: passValid ? '#4ade8060' : '#e9456060', borderWidth: 1 }]}>
                  <TouchableOpacity onPress={() => { setPassSelection({ start: 0, end: 0 }); regPassRef.current?.focus(); }}>
                    <Text style={{ color: COLORS.muted, fontSize: 16, marginRight: 12 }}>🔒</Text>
                  </TouchableOpacity>
                  <TextInput
                    ref={regPassRef}
                    style={[styles.authInput, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor={COLORS.muted}
                    value={authForm.password}
                    selection={passSelection}
                    onSelectionChange={() => setPassSelection(undefined)}
                    onChangeText={v => setAuthForm(f => ({ ...f, password: v }))}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  {passTouched && (
                    <Text style={{ fontSize: 14, marginLeft: 4, marginRight: 8 }}>{passValid ? '✅' : '❌'}</Text>
                  )}
                  <AnimatedPress
                    style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}
                    onPress={() => setShowPassword(s => !s)}
                    scaleDown={0.88}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </AnimatedPress>
                </View>
                {passTouched && !passValid && (
                  <Text style={{ color: COLORS.accent, fontSize: 11, marginTop: 4, marginLeft: 4, marginBottom: 4 }}>
                    Password must be at least 8 characters
                  </Text>
                )}
              </View>
            );
          })()}

          {authError ? <Text style={[styles.authError, { marginBottom: 12 }]}>{authError}</Text> : null}

          {/* Create Account button */}
          <AnimatedPress
            style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 20, marginTop: 8 }}
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

          {/* Social proof */}
          <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 28, opacity: 0.7 }}>
            🏋️ Join 10,000+ lifters improving their strength
          </Text>

          {/* Dev tool */}
          <TouchableOpacity onPress={deleteTestUsers} style={{ alignItems: 'center', marginTop: 20 }}>
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
            style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 20, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4 }}
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


  function getTodayScore(wins) {
    const today = new Date().toDateString();
    const w = wins[today] || {};
    return (w.workout ? 1 : 0) + (w.protein ? 1 : 0) + (w.calories ? 1 : 0);
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
          <Text style={{ color: config.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 }}>⚡  NEXT WORKOUT</Text>
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
    const TOTAL_STEPS = 5;
    const STEP_HEADLINES = [
      { eyebrow: 'Step 1 of 5', title: "Let's build your plan" },
      { eyebrow: 'Step 2 of 5', title: 'How does your body look?' },
      { eyebrow: 'Step 3 of 5', title: 'What do you want to achieve?' },
      { eyebrow: 'Step 4 of 5', title: 'Your training commitment' },
      { eyebrow: 'Step 5 of 5 — Last one', title: 'Your lifestyle' },
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

    const inputStyle = { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: '#ffffff18', marginBottom: 16 };
    const labelStyle = { color: '#8888b0', fontSize: 13, fontWeight: '600', letterSpacing: 0.2, marginBottom: 8, marginTop: 8 };
    const chipActive = { backgroundColor: COLORS.accent + '22', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 2, borderColor: COLORS.accent };
    const chipInactive = { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#ffffff15' };

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {profileStep > 1 && (
              <TouchableOpacity onPress={() => setProfileStep(s => s - 1)}>
                <Text style={{ color: COLORS.muted, fontSize: 22 }}>‹</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '900' }}>{STEP_HEADLINES[profileStep - 1].title}</Text>
              {profileStep === 1 && <Text style={{ color: '#6668a0', fontSize: 13, marginTop: 4 }}>Tell us a few basics so we can calculate your plan.</Text>}
            </View>
          </View>
          {/* Step label + progress bar — close together */}
          <Text style={{ color: '#7070a0', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 }}>{STEP_HEADLINES[profileStep - 1].eyebrow}</Text>
          <View style={{ height: 5, backgroundColor: '#13132a', borderRadius: 99 }}>
            <View style={{ height: 5, backgroundColor: COLORS.accent, borderRadius: 99, width: `${(profileStep / TOTAL_STEPS) * 100}%`, shadowColor: COLORS.accent, shadowOpacity: 0.5, shadowRadius: 4 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 90 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} scrollEnabled={outerScrollEnabled}>

          {/* ── Step 1: Personal Info ── */}
          {profileStep === 1 && (
            <>
              <Text style={labelStyle}>Gender</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {['Male', 'Female'].map(g => (
                  <TouchableOpacity key={g} style={[pf.gender === g ? chipActive : chipInactive, { flex: 1, alignItems: 'center' }]} onPress={() => setPF('gender', g)}>
                    <Text style={{ color: pf.gender === g ? COLORS.accent : '#6668a0', fontWeight: '800', fontSize: 15 }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>Age</Text>
              <TextInput
                style={inputStyle}
                placeholder="28"
                placeholderTextColor="#4a4a6a"
                keyboardType="numeric"
                value={pf.age}
                onChangeText={v => setPF('age', v.replace(/[^0-9]/g, ''))}
              />

              <Text style={labelStyle}>Weight</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff18', marginBottom: 6, paddingRight: 14 }}>
                <TextInput
                  style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.text, fontSize: 15 }}
                  placeholder="185"
                  placeholderTextColor="#4a4a6a"
                  keyboardType="numeric"
                  value={pf.weightLbs}
                  onChangeText={v => setPF('weightLbs', v.replace(/[^0-9]/g, ''))}
                />
                <Text style={{ color: '#5555a0', fontWeight: '700', fontSize: 13 }}>lbs</Text>
              </View>
              <Text style={{ color: '#4a4a6a', fontSize: 11, marginBottom: 16 }}>Used to calculate your daily calorie target</Text>

              <Text style={labelStyle}>Height</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff18' }}>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: '#5555a0', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>ft</Text>
                  <ScrollPicker
                    items={['4', '5', '6', '7']}
                    selectedValue={pf.heightFt || '5'}
                    onValueChange={v => setPF('heightFt', v)}
                    itemHeight={36}
                    visibleRows={3}
                    width={80}
                  />
                </View>
                <View style={{ width: 1, backgroundColor: '#ffffff10', marginVertical: 12 }} />
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: '#5555a0', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>in</Text>
                  <ScrollPicker
                    items={['0','1','2','3','4','5','6','7','8','9','10','11']}
                    selectedValue={pf.heightIn || '0'}
                    onValueChange={v => setPF('heightIn', v)}
                    itemHeight={36}
                    visibleRows={3}
                    width={80}
                  />
                </View>
              </View>
              <Text style={{ color: '#4a4a6a', fontSize: 11, marginBottom: 12 }}>Scroll to select your height</Text>

              <Animated.View style={{ opacity: bmiAnim, transform: [{ translateY: bmiAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: bmiAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
                {bmi && <AnimatedBmiCard bmi={bmi} />}
              </Animated.View>
            </>
          )}

          {/* ── Step 2: Body Composition ── */}
          {profileStep === 2 && (() => {
            return (
              <>
                <Text style={labelStyle}>Select your body type</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 14, marginTop: -4 }}>Tap the one that looks most like you</Text>
                {(() => {
                  const isFemale = pf.gender === 'Female';
                  const types = isFemale ? FEMALE_BODY_TYPES : MALE_BODY_TYPES;
                  const currentBf = parseInt(pf.bodyFatPct);
                  const selectedIdx = currentBf
                    ? types.reduce((best, t, i) => Math.abs(t.bf - currentBf) < Math.abs(types[best].bf - currentBf) ? i : best, 0)
                    : null;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: selectedIdx !== null ? 10 : 16 }}>
                        {types.map((t, i) => (
                          <AnimatedBodyCard
                            key={i}
                            t={t}
                            i={i}
                            isFemale={isFemale}
                            isSelected={selectedIdx === i}
                            onPress={() => setPF('bodyFatPct', String(t.bf))}
                          />
                        ))}
                      </View>
                      {selectedIdx !== null && (
                        <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', marginBottom: 14, opacity: 0.75 }}>
                          Good choice — we'll fine-tune this later.
                        </Text>
                      )}
                    </>
                  );
                })()}


              <Text style={labelStyle}>Measurements (inches) — optional</Text>
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
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 }}>
                    {[['Chest', 'chest'], ['Waist', 'waist'], ['Hips', 'hips'], ['Arms', 'arms'], ['Thighs', 'thighs']].map(([label, key]) => {
                      const inputRef = React.createRef();
                      return (
                        <TouchableOpacity key={key} activeOpacity={0.7} onPress={() => inputRef.current?.focus()} style={{ width: '47%', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#ffffff08', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TextInput
                              ref={inputRef}
                              style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', textAlign: 'right', minWidth: 36 }}
                              value={pf[key]}
                              placeholder="—"
                              placeholderTextColor={COLORS.muted}
                              keyboardType="decimal-pad"
                              onChangeText={v => setPF(key, v.replace(/[^0-9.]/g, ''))}
                            />
                            {!pf[key] && estimates[key] && (
                              <Text style={{ color: COLORS.muted, fontSize: 11 }}>~{estimates[key]}"</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}
            </>
            );
          })()}

          {/* ── Step 3: Goal ── */}
          {profileStep === 3 && (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
                Pick the one that matches where you want to go. We'll build your programme around it.
              </Text>
              {(() => {
                const bf = parseInt(pf.bodyFatPct);
                const isFemale = pf.gender === 'Female';
                const recommended = bf
                  ? bf < (isFemale ? 22 : 15) ? 'Build Muscle'
                  : bf < (isFemale ? 30 : 25) ? 'Build Muscle & Lose Fat'
                  : 'Lose Fat'
                  : null;
                const recommendedReason = bf
                  ? bf < (isFemale ? 22 : 15) ? 'your body fat is already low'
                  : bf < (isFemale ? 30 : 25) ? 'your body fat is in the ideal recomp range'
                  : 'losing fat first will maximize your results'
                  : null;
                return (
                  <View style={{ gap: 10, marginBottom: 20 }}>
                    {[
                      { key: 'Build Muscle',            icon: '💪', desc: 'Gain size and strength' },
                      { key: 'Lose Fat',                icon: '🔥', desc: 'Burn fat and get leaner' },
                      { key: 'Build Muscle & Lose Fat', icon: '⚖️', desc: 'Improve body composition simultaneously' },
                      { key: 'Get Stronger',            icon: '🏋️', desc: 'Increase your lifts and raw power' },
                    ].map(({ key, icon, desc }) => {
                      const active = pf.primaryGoal === key;
                      const isRecommended = recommended === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setPF('primaryGoal', key)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 14,
                            backgroundColor: active ? '#ffffff0d' : COLORS.surface,
                            borderRadius: 14,
                            padding: 16,
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? '#ffffff35' : '#ffffff10',
                            transform: [{ scale: active ? 1.02 : 1 }],
                            opacity: pf.primaryGoal && !active ? 0.55 : 1,
                          }}
                        >
                          <Text style={{ fontSize: active ? 28 : 24 }}>{icon}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={{ color: active ? COLORS.text : COLORS.muted, fontWeight: '800', fontSize: 15 }}>{key}</Text>
                              {isRecommended && (
                                <View style={{ backgroundColor: COLORS.accent + '20', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.accent + '40' }}>
                                  <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '700' }}>RECOMMENDED</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
                            {isRecommended && active && (
                              <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>Based on {recommendedReason}</Text>
                            )}
                          </View>
                          {active && (
                            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff15', borderWidth: 1.5, borderColor: '#ffffff50', alignItems: 'center', justifyContent: 'center' }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.text }} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}
            </>
          )}

          {/* ── Step 4: Training Commitment ── */}
          {profileStep === 4 && (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20, lineHeight: 19 }}>
                Be honest — consistency beats intensity. We'll design the right programme for your schedule.
              </Text>

              <Text style={labelStyle}>Days per week you can train</Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {[
                  { val: '3', label: '3 days / week', sub: 'Upper · Lower · Full Body', badge: 'Popular' },
                  { val: '5', label: '5 days / week', sub: 'Push · Pull · Legs split', badge: 'Committed' },
                ].map(({ val, label, sub, badge }) => {
                  const active = pf.trainingDays === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setPF('trainingDays', val)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: active ? '#ffffff0d' : COLORS.surface,
                        borderRadius: 14, padding: 16,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? '#ffffff35' : '#ffffff10',
                        transform: [{ scale: active ? 1.02 : 1 }],
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: active ? COLORS.text : COLORS.muted, fontSize: 15, fontWeight: '800' }}>{label}</Text>
                          {badge && (
                            <View style={{ backgroundColor: '#ffffff12', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700' }}>{badge.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>{sub}</Text>
                      </View>
                      {active && (
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff15', borderWidth: 1.5, borderColor: '#ffffff50', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.text }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={labelStyle}>Experience level</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {[
                  { val: 'Beginner',     sub: 'Less than 1 year of consistent training' },
                  { val: 'Intermediate', sub: '1–3 years, know the main lifts' },
                  { val: 'Advanced',     sub: '3+ years, close to natural limits' },
                ].map(({ val, sub }) => {
                  const active = pf.fitnessLevel === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setPF('fitnessLevel', val)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: active ? '#ffffff0d' : COLORS.surface,
                        borderRadius: 14, padding: 14,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? '#ffffff35' : '#ffffff10',
                        opacity: pf.fitnessLevel && !active ? 0.6 : 1,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: active ? COLORS.text : COLORS.muted, fontWeight: '700', fontSize: 14 }}>{val}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
                      </View>
                      {active && (
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff15', borderWidth: 1.5, borderColor: '#ffffff50', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.text }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Step 5: Lifestyle ── */}
          {profileStep === 5 && (
            <>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20, lineHeight: 19 }}>
                This helps us fine-tune your calorie target and recovery recommendations.
              </Text>

              <Text style={labelStyle}>How active are you outside the gym?</Text>
              <View style={{ gap: 8, marginBottom: 24 }}>
                {[
                  { val: 'Sedentary',        sub: 'Desk job, little movement', icon: '🪑' },
                  { val: 'Lightly Active',   sub: 'Light walking, some movement', icon: '🚶' },
                  { val: 'Moderately Active',sub: 'On your feet, regular movement', icon: '🏃' },
                  { val: 'Very Active',      sub: 'Physical job or very active lifestyle', icon: '⚡' },
                ].map(({ val, sub, icon }) => {
                  const active = pf.activityLevel === val;
                  return (
                    <TouchableOpacity key={val} onPress={() => setPF('activityLevel', val)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: active ? 18 : 14, borderRadius: 14, borderWidth: active ? 1.5 : 1, borderColor: active ? COLORS.accent : '#ffffff10', backgroundColor: active ? COLORS.accent + '18' : COLORS.surface, transform: [{ scale: active ? 1.02 : 1 }], opacity: pf.activityLevel && !active ? 0.6 : 1 }}>
                      <Text style={{ fontSize: active ? 26 : 22 }}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: active ? COLORS.accent : COLORS.text, fontWeight: '700', fontSize: 14 }}>{val}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
                      </View>
                      {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={labelStyle}>How well do you sleep?</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 12, marginTop: -4 }}>Sleep affects muscle recovery and hormones</Text>
              {(() => {
                const sleepFeedback = {
                  'Poor':      { text: "We'll factor in extra recovery time for you.",        color: '#f87171' },
                  'Fair':      { text: "Could be improved — even 30 mins more makes a difference.", color: '#f59e0b' },
                  'Good':      { text: "Solid foundation for muscle recovery.",                color: '#4ade80' },
                  'Excellent': { text: "Great for muscle recovery 💪",                        color: '#4ade80' },
                };
                const fb = sleepFeedback[pf.sleepQuality];
                return (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: fb ? 10 : 16, flexWrap: 'wrap' }}>
                      {[
                        { val: 'Poor',      icon: '😴', sub: '< 6 hrs' },
                        { val: 'Fair',      icon: '😐', sub: '6–7 hrs' },
                        { val: 'Good',      icon: '🙂', sub: '7–8 hrs' },
                        { val: 'Excellent', icon: '😄', sub: '8+ hrs' },
                      ].map(({ val, icon, sub }) => {
                        const active = pf.sleepQuality === val;
                        return (
                          <TouchableOpacity
                            key={val}
                            onPress={() => setPF('sleepQuality', val)}
                            style={{ flex: 1, alignItems: 'center', backgroundColor: active ? COLORS.accent + '18' : COLORS.surface, borderRadius: 14, paddingVertical: 14, borderWidth: active ? 1.5 : 1, borderColor: active ? COLORS.accent : '#ffffff10' }}
                          >
                            <Text style={{ fontSize: 22 }}>{icon}</Text>
                            <Text style={{ color: active ? COLORS.accent : COLORS.text, fontWeight: '700', fontSize: 13, marginTop: 6 }}>{val}</Text>
                            <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 2 }}>{sub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {fb && (
                      <Text style={{ color: fb.color, fontSize: 12, marginBottom: 16, textAlign: 'center', opacity: 0.9 }}>
                        {fb.text}
                      </Text>
                    )}
                  </>
                );
              })()}
            </>
          )}

        </ScrollView>

        {/* Bottom nav */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: '#ffffff08' }}>
          {profileStep < TOTAL_STEPS ? (
            <AnimatedPress
              style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              onPress={() => {
                // Apply smart defaults when advancing to next step
                if (profileStep === 2) {
                  // Pre-select goal based on body fat if not yet chosen
                  const bf = parseInt(pf.bodyFatPct);
                  if (!pf.primaryGoal && bf) {
                    const isFemale = pf.gender === 'Female';
                    const goal = bf < (isFemale ? 22 : 15) ? 'Build Muscle'
                      : bf < (isFemale ? 30 : 25) ? 'Build Muscle & Lose Fat'
                      : 'Lose Fat';
                    setProfileForm(f => ({ ...f, primaryGoal: goal }));
                  }
                }
                if (profileStep === 3) {
                  // Pre-select training days and fitness level if not chosen
                  if (!pf.trainingDays) setProfileForm(f => ({ ...f, trainingDays: '5' }));
                  if (!pf.fitnessLevel) setProfileForm(f => ({ ...f, fitnessLevel: 'Intermediate' }));
                }
                if (profileStep === 4) {
                  // Pre-select activity level based on training days if not chosen
                  if (!pf.activityLevel) {
                    const defaultActivity = pf.trainingDays === '5' ? 'Moderately Active' : 'Lightly Active';
                    setProfileForm(f => ({ ...f, activityLevel: defaultActivity }));
                  }
                  // Pre-select sleep quality if not chosen
                  if (!pf.sleepQuality) setProfileForm(f => ({ ...f, sleepQuality: 'Good' }));
                }
                setProfileStep(s => s + 1);
              }}
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
    const goalCalAdj = { 'Build Muscle': 250, 'Lose Fat': -450, 'Build Muscle & Lose Fat': 0, 'Get Stronger': 150 };
    const calories = tdee + (goalCalAdj[pf.primaryGoal] || 0);
    const proteinPerLb = { 'Build Muscle': 0.85, 'Lose Fat': 1.1, 'Build Muscle & Lose Fat': 1.0, 'Get Stronger': 0.8 };
    const protein = Math.round((parseFloat(pf.weightLbs) || 160) * (proteinPerLb[pf.primaryGoal] || 0.85));

    // Split based on training days
    const split = pf.trainingDays === '5' ? 'Push / Pull / Legs' : 'Upper / Lower';
    const splitDays = pf.trainingDays === '5' ? '5x / week' : '3x / week';

    // Progression style based on fitness level
    const progression = pf.fitnessLevel === 'Advanced' ? 'Conservative progression'
      : pf.fitnessLevel === 'Intermediate' ? 'Moderate progression'
      : 'Aggressive progression';

    const goalContext = {
      'Build Muscle':            { tag: '+ Lean muscle focus',         tagColor: '#60a5fa', sub: 'Calories set in a slight surplus to fuel growth without excess fat gain.' },
      'Lose Fat':                { tag: 'Fat loss optimized',           tagColor: '#f87171', sub: 'Moderate deficit to preserve muscle while stripping body fat.' },
      'Build Muscle & Lose Fat': { tag: 'Optimized for recomposition',  tagColor: '#a78bfa', sub: 'Maintenance calories — your body will swap fat for muscle over time.' },
      'Get Stronger':            { tag: 'Strength-first approach',      tagColor: '#f59e0b', sub: 'Slightly elevated calories to support progressive overload and CNS recovery.' },
    };
    const ctx = goalContext[pf.primaryGoal] || goalContext['Build Muscle'];

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
          <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
            This is your{'\n'}transformation plan 💪
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            <View style={{ backgroundColor: ctx.tagColor + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: ctx.tagColor + '40', marginRight: 8 }}>
              <Text style={{ color: ctx.tagColor, fontSize: 11, fontWeight: '700' }}>{ctx.tag}</Text>
            </View>
            <Text style={{ color: COLORS.muted, fontSize: 12, flex: 1 }}>Built for your body & schedule</Text>
          </View>

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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>MACRO SPLIT</Text>
                <View style={{ backgroundColor: ctx.tagColor + '18', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: ctx.tagColor, fontSize: 10, fontWeight: '700' }}>{ctx.tag}</Text>
                </View>
              </View>
              <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 17, marginBottom: 14, opacity: 0.8 }}>{ctx.sub}</Text>
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
        {/* Step indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <View key={n} style={{ height: 3, flex: 1, borderRadius: 2, backgroundColor: n <= 5 ? COLORS.accent : '#2a2a4a' }} />
          ))}
          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Step 5 of 5</Text>
        </View>
        <Text style={styles.title}>Here's your plan</Text>
        <Text style={[styles.subtitle, { marginBottom: 20 }]}>Based on your activity level and goals</Text>
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
              const is3x = opt.endsWith('3x');
              const is5x = !is3x;
              const trainDays = profileForm.trainingDays;
              // Filter by training days if set
              if (trainDays === '3' && is5x) return false;
              if (trainDays === '5' && is3x) return false;
              // Filter by gender
              if ((opt === 'Building Muscle - Men 5x' || opt === 'Building Muscle - Men 3x') && user?.gender === 'Female') return false;
              if ((opt === 'Building Muscle - Women 5x' || opt === 'Building Muscle - Women 3x') && user?.gender === 'Male') return false;
              return true;
            }).map(opt => {
              const meta = GOAL_META[opt];
              const label =
                opt === 'Building Muscle - Men 5x'      ? "Men's Muscle Building Program\n8 Weeks - 5 Days per Week" :
                opt === 'Building Muscle - Women 5x'    ? "Women's Muscle Building Program\n8 Weeks - 5 Days per Week" :
                opt === 'Building Muscle - Men 3x'   ? "Men's Muscle Building Program\n8 Weeks - 3 Days per Week" :
                opt === 'Building Muscle - Women 3x' ? "Women's Muscle Building Program\n8 Weeks - 3 Days per Week" : opt;
              const isRecommended = opt.startsWith('Building Muscle');
              return (
                <React.Fragment key={opt}>
                <AnimatedPress
                  style={[styles.goalCard,
                    isRecommended && { borderColor: COLORS.accent + '40', shadowColor: COLORS.accent, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, padding: 22 },
                    !isRecommended && { opacity: 0.45, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => isRecommended ? setPreviewGoal(opt) : handleAnswer(opt)} scaleDown={0.97}>
                  {isRecommended && (
                    <View style={{ position: 'absolute', top: -1, right: 14, backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, zIndex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>RECOMMENDED</Text>
                    </View>
                  )}
                  {!isRecommended ? (
                    <>
                      <View style={{ width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: '#ffffff10' }}>
                        <Text style={{ fontSize: 26 }}>{meta?.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle}>{label}</Text>
                        {Array.isArray(meta?.subtitle)
                          ? meta.subtitle.map((s, i) => <Text key={i} style={[styles.goalSubtitle, { fontSize: 12, color: COLORS.muted }]}>• {s}</Text>)
                          : <Text style={styles.goalSubtitle}>{meta?.subtitle}</Text>}
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      {/* Title row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff10' }}>
                          <Text style={{ fontSize: 22 }}>{meta?.icon}</Text>
                        </View>
                        <Text style={[styles.goalTitle, { fontSize: 15, flex: 1 }]}>{label}</Text>
                      </View>
                      {/* Split info row */}
                      {(() => {
                        const pf = profileForm;
                        const is3x = opt.endsWith('3x');
                        let kcal = null, proteinG = null;
                        if (pf.age && (pf.gender || user?.gender) && pf.heightFt && pf.weightLbs) {
                          const tdee = calculateTDEE(pf.age, pf.gender || user?.gender, pf.heightFt, pf.heightIn || '0', pf.weightLbs, pf.activityLevel || 'Moderately Active');
                          kcal = tdee + 300;
                          proteinG = Math.round(parseFloat(pf.weightLbs));
                        }
                        return (
                          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                            <View style={{ flex: 1, backgroundColor: '#ffffff08', borderRadius: 10, padding: 10 }}>
                              <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 }}>🏋️ TRAINING</Text>
                              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{is3x ? '3' : '5'} days/week</Text>
                              <Text style={{ color: COLORS.muted, fontSize: 11 }}>8 weeks</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#ffffff08', borderRadius: 10, padding: 10 }}>
                              <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 }}>🥗 NUTRITION</Text>
                              {kcal ? (
                                <>
                                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{kcal.toLocaleString()} kcal</Text>
                                  <Text style={{ color: COLORS.muted, fontSize: 11 }}>{proteinG}g protein</Text>
                                </>
                              ) : (
                                <Text style={{ color: COLORS.muted, fontSize: 11, lineHeight: 16 }}>Add your stats{'\n'}to unlock</Text>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                      {/* Expected results */}
                      <View style={{ backgroundColor: COLORS.accent + '12', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: COLORS.accent + '25' }}>
                        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 }}>YOUR 8-WEEK TRANSFORMATION:</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Text style={{ color: COLORS.text, fontSize: 12 }}>💪 +6–10 lbs muscle</Text>
                          <Text style={{ color: COLORS.text, fontSize: 12 }}>🔥 -2–4% body fat</Text>
                        </View>
                      </View>
                      {/* CTA */}
                      <View style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#000', fontWeight: '800', fontSize: 14 }}>Start Program →</Text>
                      </View>
                    </View>
                  )}
                </AnimatedPress>
                {isRecommended && (
                  <Text style={{ color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
                    ✦ Recommended based on your {profileForm.primaryGoal ? `goal to ${profileForm.primaryGoal.toLowerCase()}` : 'answers'}{profileForm.fitnessLevel ? ` as a ${profileForm.fitnessLevel.toLowerCase()}` : ''}
                  </Text>
                )}
                </React.Fragment>
              );
            })}
          </View>
        )}

      {/* ── Program Preview Modal ── */}
      {previewGoal && (() => {
        const plan = WORKOUT_PLANS[previewGoal];
        const isMen = previewGoal.includes('Men');
        const is3x = previewGoal.endsWith('3x');
        const workoutDays = plan?.filter(d => !d.day.includes('Rest')) || [];
        const exampleDay = workoutDays[0];
        const exs = exampleDay?.exercises?.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk')) || [];
        const DAY_ICONS_P = { 'Upper Body': '💪', 'Lower Body': '🦵', 'Push': '🏋️', 'Pull': '🔙', 'Legs': '🦵', 'Full Body': '⚡', 'Glutes': '🍑' };
        const getDayIconP = s => Object.entries(DAY_ICONS_P).find(([k]) => s.includes(k))?.[1] || '🏃';
        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => setPreviewGoal(null)}>
            <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' }} onPress={() => setPreviewGoal(null)}>
              <TouchableOpacity activeOpacity={1} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, maxHeight: '88%' }} onPress={() => {}}>
                {/* Handle */}
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff20', alignSelf: 'center', marginTop: 14, marginBottom: 16 }} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 8 }}>
                  {/* Header */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '900', marginBottom: 10 }}>
                      {isMen ? "Men's Muscle Building" : "Women's Muscle Building"}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { icon: '📅', label: '8 Weeks' },
                        { icon: '🏋️', label: `${is3x ? '3' : '5'} Days/Week` },
                        { icon: '🥗', label: '+ Nutrition Plan' },
                      ].map(({ icon, label }) => (
                        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffffff0d', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 12 }}>{icon}</Text>
                          <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Weekly Split card */}
                  <View style={{ backgroundColor: '#ffffff08', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 }}>📆  WEEKLY SPLIT</Text>
                    <View style={{ gap: 8 }}>
                      {workoutDays.map((d, i) => {
                        const label = d.day.replace(/^Day \d+ – /, '');
                        return (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.accent + '1a', justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
                            </View>
                            <Text style={{ fontSize: 14 }}>{getDayIconP(label)}</Text>
                            <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
                            <Text style={{ color: COLORS.muted, fontSize: 11, marginLeft: 'auto' }}>{d.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Walk')).length} exercises</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Example Workout card */}
                  <View style={{ backgroundColor: '#ffffff08', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 }}>🎯  EXAMPLE: DAY 1</Text>
                    <View style={{ gap: 7 }}>
                      {exs.slice(0, 4).map((ex, i) => {
                        const clean = cleanExerciseName(ex);
                        const sr = parseSetsReps(ex);
                        return (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', width: 18 }}>{String(i + 1).padStart(2, '0')}</Text>
                            <Text style={{ color: COLORS.text, fontSize: 13, flex: 1 }}>{clean}</Text>
                            {sr && <Text style={{ color: COLORS.muted, fontSize: 11 }}>{sr.sets}×{sr.reps}</Text>}
                          </View>
                        );
                      })}
                    </View>
                    {exs.length > 4 && (
                      <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 8 }}>+{exs.length - 4} more exercises</Text>
                    )}
                  </View>

                  {/* 8-Week Timeline */}
                  <View style={{ backgroundColor: '#ffffff08', borderRadius: 16, padding: 14, marginBottom: 20 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 16 }}>📈  YOUR 8-WEEK TRANSFORMATION:</Text>
                    {/* Timeline track */}
                    {(() => {
                      const milestones = [
                        { week: 1, icon: '🚀', label: 'Foundations',    sub: 'Learn the lifts' },
                        { week: 3, icon: '📈', label: 'Strength',        sub: 'First PR incoming' },
                        { week: 5, icon: '💪', label: isMen ? 'Definition' : 'Tone', sub: 'Shape forming' },
                        { week: 7, icon: '🔥', label: 'Peak intensity', sub: 'Max output' },
                        { week: 8, icon: '🏆', label: 'Transformed',    sub: 'New baseline' },
                      ];
                      return (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, paddingBottom: 4 }}>
                            {milestones.map((m, i) => (
                              <View key={m.week} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                {/* Node */}
                                <View style={{ alignItems: 'center', width: 62 }}>
                                  {/* Week badge */}
                                  <View style={{
                                    width: 34, height: 34, borderRadius: 17,
                                    backgroundColor: m.week === 8 ? COLORS.accent : '#ffffff14',
                                    borderWidth: 1.5,
                                    borderColor: m.week === 8 ? COLORS.accent : '#ffffff25',
                                    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
                                  }}>
                                    <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                                  </View>
                                  <Text style={{ color: COLORS.accent, fontSize: 9, fontWeight: '800', marginBottom: 2 }}>WK {m.week}</Text>
                                  <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{m.label}</Text>
                                  <Text style={{ color: COLORS.muted, fontSize: 9, textAlign: 'center', marginTop: 1 }}>{m.sub}</Text>
                                </View>
                                {/* Connector line */}
                                {i < milestones.length - 1 && (
                                  <View style={{ marginTop: 16, width: 24, height: 2, backgroundColor: '#ffffff15', borderRadius: 1 }} />
                                )}
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      );
                    })()}
                  </View>
                </ScrollView>

                {/* CTA — outside scroll, always visible */}
                <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => { setPreviewGoal(null); handleAnswer(previewGoal); }}
                    style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 16 }}>Start Program →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPreviewGoal(null)} style={{ alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 13 }}>Go back</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        );
      })()}

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
    const goalLabel = { 'Build Muscle': 'Bulk', 'Lose Fat': 'Cut', 'Build Muscle & Lose Fat': 'Maintain', 'Get Stronger': 'Maintain' }[primaryGoal] || 'Maintain';
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
      <View style={[styles.container, { paddingTop: 70 }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={() => { setScreen('plan'); setTimeout(() => planFlatListRef.current?.scrollToOffset({ offset: planSavedScrollOffsetRef.current, animated: false }), 100); }} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { marginTop: 16 }]}>Your Nutrition Plan</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
    const workoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
    const DAY_ICONS = { 'Upper Body': '💪', 'Lower Body': '🦵', 'Push Day': '🏋️', 'Pull Day': '🔙', 'Leg Day': '🦵', 'Glutes': '🍑', 'Back': '🔙' };
    const getDayIcon = (dayStr) => {
      const label = dayStr.split('–')[1]?.trim() || '';
      return Object.entries(DAY_ICONS).find(([k]) => label.includes(k))?.[1] || '🏃';
    };
    const firstName = (user?.name || '').split(' ')[0] || null;
    const goalKey = answers?.goal || '';
    const daysPerWeek = goalKey.endsWith('3x') ? '3' : '5';
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ConfettiEffect />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          {(() => {
            const coachIntro = {
              'Build Muscle':            "We've got your plan dialed in. Every set builds toward the physique you want.",
              'Lose Fat':                "This will challenge you — and that's exactly what you need to see results.",
              'Build Muscle & Lose Fat': "Stay consistent — the recomp process takes time, but the results last.",
              'Get Stronger':            "We've got your plan dialed in. Progressive overload will get you there.",
            };
            const pGoal = profileForm?.primaryGoal || '';
            const intro = coachIntro[pGoal] || "We've got your plan dialed in. Let's build something.";
            return (
              <Animated.View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8, opacity: planHeaderAnim, transform: [{ translateY: planHeaderAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }}>
                <Text style={{ fontSize: 42, marginBottom: 10 }}>💪</Text>
                <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 30 }}>
                  {firstName ? `Your plan is ready,\n${firstName} 💪` : 'Your plan is ready 💪'}
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 19, paddingHorizontal: 8 }}>
                  {intro}
                </Text>
              </Animated.View>
            );
          })()}

          {/* Stats row */}
          <Animated.View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, opacity: planStatsAnim, transform: [{ translateY: planStatsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            {[
              { label: 'Weeks', value: '8', icon: '📅' },
              { label: 'Days / Week', value: daysPerWeek, icon: '🏋️' },
              { label: 'Exercises', value: String(workoutDays.reduce((acc, d) => acc + d.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk')).length, 0)), icon: '⚡' },
            ].map(({ label, value, icon }) => (
              <View key={label} style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff08', borderTopColor: '#ffffff20' }}>
                <Text style={{ fontSize: 16, marginBottom: 4 }}>{icon}</Text>
                <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Week 1 Preview card */}
          {(() => {
            const day1 = workoutDays[0];
            if (!day1) return null;
            const day1Label = day1.day.split('–')[1]?.trim() || day1.day;
            const day1Exs = day1.exercises.filter(e => !e.includes('Stretching') && !e.includes('Foam') && !e.includes('Incline Walk'));
            const estMins = day1Exs.length * 8;
            const difficultyLabel = (profileForm?.fitnessLevel || 'Intermediate') === 'Beginner' ? 'Moderate' : (profileForm?.fitnessLevel || 'Intermediate') === 'Advanced' ? 'Intense' : 'Challenging';
            const diffColor = difficultyLabel === 'Moderate' ? '#4ade80' : difficultyLabel === 'Intense' ? '#f87171' : '#f59e0b';
            return (
              <View style={{ backgroundColor: '#12122a', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.accent + '25', borderTopColor: COLORS.accent + '50' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>🚀  WEEK 1 — DAY 1 PREVIEW</Text>
                  <View style={{ backgroundColor: diffColor + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: diffColor + '40' }}>
                    <Text style={{ color: diffColor, fontSize: 10, fontWeight: '800' }}>{difficultyLabel}</Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{day1Label}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>⏱ ~{estMins} min</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>🏋️ {day1Exs.length} exercises</Text>
                </View>
                <View style={{ gap: 4 }}>
                  {day1Exs.slice(0, 3).map((e, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.accent + '60' }} />
                      <Text style={{ color: COLORS.muted, fontSize: 12 }}>{cleanExerciseName(e)}</Text>
                    </View>
                  ))}
                  {day1Exs.length > 3 && (
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2, marginLeft: 13, opacity: 0.7 }}>+ {day1Exs.length - 3} more exercises</Text>
                  )}
                </View>
              </View>
            );
          })()}

          {/* Workout day cards */}
          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 }}>WEEKLY SPLIT</Text>
          {workoutDays.map((d, i) => (
            <ExpandablePreviewCard
              key={i}
              d={d}
              cardAnim={planCardAnims[Math.min(i, planCardAnims.length - 1)]}
              getDayIcon={getDayIcon}
            />
          ))}

          {/* Rest days note */}
          <View style={{ backgroundColor: '#0c0c1e', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ffffff06', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>💤</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>
              Wednesday & Sunday are rest days with optional light stretching and foam rolling.
            </Text>
          </View>

        </ScrollView>

        {/* CTA pinned to bottom */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: '#ffffff08' }}>
          {/* Commitment trigger */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' }} />
            <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center' }}>
              Ready to commit to <Text style={{ color: COLORS.text, fontWeight: '700' }}>{daysPerWeek} days/week</Text> for 8 weeks?
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setScreen('plan')}
            style={{ backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Start Day 1 Streak 🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={restart} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Nutrition expanded content (no outer card wrapper) ───
  function NutritionExpandedContent({ onLog }) {
    if (!nutritionResult) return null;
    const goalCal  = nutritionResult.target ?? nutritionResult.tdee;
    const goalProt = nutritionResult.proteinG;
    const DAY_NAMES_NEC = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayName = DAY_NAMES_NEC[new Date().getDay()];
    const todayPlanIdx = plan?.findIndex(d => d.day.startsWith(todayName)) ?? -1;
    const todayNutKey = todayPlanIdx !== -1 ? `w${currentWeek}_d${todayPlanIdx + 1}` : null;
    const log = (todayNutKey && nutritionHistory[todayNutKey]) || { calories: 0, protein: 0 };
    const calPct   = Math.min(1, goalCal  > 0 ? log.calories / goalCal  : 0);
    const protPct  = Math.min(1, goalProt > 0 ? log.protein  / goalProt : 0);
    const hasData  = log.calories > 0 || log.protein > 0;
    const protLeft = Math.max(0, goalProt - log.protein);
    const todayW   = (dailyWins || {})[todayNutKey] || {};
    const score    = (todayW.workout ? 1 : 0) + (todayW.protein ? 1 : 0) + (todayW.calories ? 1 : 0);
    let insight, insightColor;
    if (!hasData)                         { insight = 'Log your meals to track progress';                             insightColor = '#ffffff35'; }
    else if (protPct >= 1 && calPct >= 1) { insight = `✅ Goals hit — ${score}/3 wins today`;                        insightColor = '#4ade80';   }
    else if (protPct >= 1)                { insight = `✅ Protein goal hit — ${score}/3 today`;                       insightColor = '#4ade80';   }
    else if (protPct >= 0.75)             { insight = 'On track — keep it up 💪';                                    insightColor = '#4ade80';   }
    else if (protPct >= 0.4)              { insight = `${protLeft}g protein left — spread across meals`;              insightColor = '#fbbf24';   }
    else                                  { insight = `Aim for ${Math.min(protLeft, 60)}g protein in your next meal`; insightColor = '#f87171';   }
    useEffect(() => {
      if (barWidth === 0) return;
      Animated.parallel([
        Animated.timing(protAnim, { toValue: protPct * barWidth, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(calAnim,  { toValue: calPct  * barWidth, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }, [barWidth, protPct, calPct]);
    return (
      <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
        {/* Header + big numbers */}
        <View style={{ marginBottom: 16, marginTop: 12 }}>
          <Text style={{ color: '#ffffff40', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Today's Target</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 20 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>💪 <Text style={{ color: hasData ? COLORS.text : '#ffffff55' }}>{hasData ? log.protein : goalProt}</Text><Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '400' }}>g / {goalProt}g protein</Text></Text>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>🔥 <Text style={{ color: hasData ? COLORS.text : '#ffffff55' }}>{hasData ? log.calories.toLocaleString() : goalCal.toLocaleString()}</Text><Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '400' }}> / {goalCal.toLocaleString()} kcal</Text></Text>
          </View>
        </View>
        <View style={{ gap: 14, marginBottom: 14 }} onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
          {[
            { label: 'Protein',  animVal: protAnim, logged: `${log.protein}g`,              goal: `${goalProt}g`,              color: '#60a5fa' },
            { label: 'Calories', animVal: calAnim,  logged: log.calories.toLocaleString(),   goal: goalCal.toLocaleString(),    color: '#f97316' },
          ].map(({ label, animVal, logged, goal, color }) => (
            <View key={label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#ffffff55', fontSize: 12, fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: '#ffffff40', fontSize: 12 }}>{hasData ? `${logged} / ${goal}` : goal}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: '#ffffff0d', borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={{ width: animVal, height: '100%', backgroundColor: color, borderRadius: 3 }} />
              </View>
            </View>
          ))}
        </View>
        <Text style={{ color: insightColor, fontSize: 12, fontWeight: '600', marginBottom: 14 }}>{insight}</Text>
        <TouchableOpacity onPress={onLog} style={{ borderRadius: 10, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: '#ffffff14', paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>+ Log Food</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Plan Overview Screen ─────────────────────────────────
  function navigateToDay(item) {
    planSavedScrollOffsetRef.current = planScrollOffsetRef.current;
    setSelectedDay(item);
    setActiveExerciseIndex(0);
    setRestTimerRunning(false);
    setRestingForExercise(null);
    setScreen('day');
  }

  if (screen === 'plan') {
    return (
      <Animated.View style={[styles.container, { paddingTop: 70 }, { transform: [{ translateX: planEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [planSlideFromLeft ? -screenWidth : screenWidth, 0] }) }] }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={restart} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        {(() => {
          const totalDoneCheck = Object.keys(completedWorkouts).length;
          const fn = (user?.name || '').split(' ')[0] || null;
          if (totalDoneCheck === 0) {
            return (
              <View style={{ marginTop: 16, marginBottom: 4 }}>
                <Text style={[styles.title, { marginBottom: 2 }]}>{fn ? `${fn}'s Plan` : 'Your Plan'}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 18 }}>
                  Day 1 starts now — let's build momentum 💪
                </Text>
              </View>
            );
          }
          return <Text style={[styles.title, { marginTop: 16 }]}>Your Workout Plan</Text>;
        })()}

        {/* Program progress + coach tagline */}
        {(() => {
          const workoutDayCount = (plan || []).filter(d => !d.day.includes('Rest')).length;
          const totalPossible = workoutDayCount * TOTAL_WEEKS;
          const totalDone = Object.keys(completedWorkouts).length;
          const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
          const coach =
            totalDone === 0 ? "" :
            pct < 20 ? "You're building momentum. Stay consistent." :
            pct < 40 ? "The habit is forming. Keep showing up." :
            pct < 60 ? "Halfway there. The gains are real." :
            pct < 80 ? "You're in the zone. Don't stop now." :
            pct < 100 ? "Almost there. Finish what you started." :
            "Programme complete. You did it. 💪";
          return (
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>{coach}</Text>
                <Text style={{ color: pct > 0 ? COLORS.accent : COLORS.muted, fontSize: 11, fontWeight: '800' }}>{pct}%</Text>
              </View>
              <AnimatedProgressBar
                progress={totalDone / Math.max(totalPossible, 1)}
                height={3}
                color={COLORS.accent}
                trackColor="#1e1e3a"
              />
            </View>
          );
        })()}

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

        {/* Next Workout — sticky top action */}
        <NextActionCard />

        {/* Week Tracker Card */}
        {/* Week Tracker — inlined as IIFE so AnimatedProgressBar keeps stable identity across re-renders */}
        {(() => {
          const workoutDays = (plan || []).filter(d => !d.day.includes('Rest'));
          const completedDays = workoutDays.filter(d =>
            d.exercises.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek))
          ).length;
          const progress = workoutDays.length > 0 ? completedDays / workoutDays.length : 0;
          const weekComplete = completedDays === workoutDays.length && workoutDays.length > 0 &&
            workoutDays.every(d => {
              const wk = `${d.day}|${currentWeek}`;
              const dayExs = d.exercises.filter(e =>
                !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
              );
              const hasLog = dayExs.some(e => (logs[logKey(d.day, e)] || []).some(en => en.programWeek === currentWeek));
              return !!completedWorkouts[wk] && hasLog;
            });
          const nextDay = plan?.find(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${currentWeek}`]);
          const nextDayStarted = nextDay ? nextDay.exercises.some(e => (logs[logKey(nextDay.day, e)] || []).some(en => en.programWeek === currentWeek)) : false;
          return (
            <Animated.View style={{ marginBottom: weekCardAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }), opacity: weekCardAnim2, maxHeight: weekCardAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }), overflow: 'hidden' }}>
              <LinearGradient
                colors={['#1e1040', '#0e1630', '#0a0a1a']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderColor: '#ffffff12' }}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View>
                    <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Week {currentWeek} of {TOTAL_WEEKS}</Text>
                    <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '900' }}>
                      {weekComplete ? '🏆 Week Complete!' : `${completedDays} / ${workoutDays.length} sessions done`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <TouchableOpacity onPress={() => { if (currentWeek > 1) changeWeek(currentWeek - 1); }} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek > 1 ? 1 : 0.3 }}>
                      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', lineHeight: 20 }}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { if (currentWeek < TOTAL_WEEKS) changeWeek(currentWeek + 1); }} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: currentWeek < TOTAL_WEEKS ? 1 : 0.3 }}>
                      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', lineHeight: 20 }}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginBottom: 14 }}>
                  <AnimatedProgressBar key={`${screen}_${currentWeek}`} progress={progress} height={5} color="#4ade80" trackColor="#2a2a4a" glowColor="#4ade80" delay={200} />
                </View>

                {/* CTAs */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {weekComplete ? (
                    <View style={{ flex: 1, backgroundColor: '#0d2e1e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4ade8040' }}>
                      <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 14 }}>🏆 Week Complete</Text>
                    </View>
                  ) : nextDay ? (
                    <TouchableOpacity
                      onPress={() => navigateToDay(nextDay)}
                      style={{ flex: 1, backgroundColor: '#4ade80', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>{nextDayStarted ? '▶  Resume Workout' : '▶  Start Workout'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff12' }}>
                      <Text style={{ color: COLORS.muted, fontWeight: '700', fontSize: 14 }}>No workouts left</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => planFlatListRef.current?.scrollToIndex({ index: 0, animated: true, viewPosition: 0 })}
                    style={{ paddingHorizontal: 18, backgroundColor: '#ffffff0a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff15' }}
                  >
                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 14 }}>View Plan</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })()}

        {/* Expandable Nutrition Bar */}
        {false && nutritionResult && (() => {
          const DAY_NAMES_NB = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          const todayNameNB = DAY_NAMES_NB[new Date().getDay()];
          const todayPlanIdxNB = plan?.findIndex(d => d.day.startsWith(todayNameNB)) ?? -1;
          const todayNutKeyNB = todayPlanIdxNB !== -1 ? `w${currentWeek}_d${todayPlanIdxNB + 1}` : null;
          const log = (todayNutKeyNB && nutritionHistory[todayNutKeyNB]) || { calories: 0, protein: 0 };
          const hasLogged = log.calories > 0 || log.protein > 0;
          const goalCal  = nutritionResult.target ?? nutritionResult.tdee;
          const goalProt = nutritionResult.proteinG;
          const score    = getTodayScore(dailyWins);
          const calPct   = Math.min(1, goalCal  > 0 ? log.calories / goalCal  : 0);
          const protPct  = Math.min(1, goalProt > 0 ? log.protein  / goalProt : 0);
          const headerInsight = !hasLogged ? null
            : protPct >= 1 && calPct >= 1 ? { text: `Goals hit — ${score}/3 ✅`, color: '#4ade80' }
            : protPct >= 1                 ? { text: `Protein hit — ${score}/3`,  color: '#4ade80' }
            : score > 0                    ? { text: `${score}/3 wins today`,      color: '#fbbf24' }
            : null;
          return (
            <View style={{ marginBottom: 16, borderRadius: 14, backgroundColor: '#0a2218', borderWidth: 1, borderColor: '#4ade8020', overflow: 'hidden' }}>
              {/* Header — tappable */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  const toVal = nutritionExpanded ? 0 : 1;
                  setNutritionExpanded(!nutritionExpanded);
                  Animated.parallel([
                    Animated.spring(nutritionExpandAnim,  { toValue: toVal, useNativeDriver: false, friction: 9, tension: 55 }),
                    Animated.timing(nutritionContentAnim, { toValue: toVal, duration: toVal ? 320 : 150, delay: toVal ? 120 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                    Animated.timing(nutritionArrowAnim,   { toValue: toVal, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                  ]).start();
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 14 }}
              >
                {/* Row 1: label + score/arrow */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#ffffff80', fontSize: 12, fontWeight: '700' }}>🥗 Nutrition Today</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {headerInsight && !nutritionExpanded && <Text style={{ color: headerInsight.color, fontSize: 11, fontWeight: '600' }}>{headerInsight.text}</Text>}
                    <Animated.Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '700', transform: [{ rotate: nutritionArrowAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-90deg'] }) }] }}>→</Animated.Text>
                  </View>
                </View>
                {/* Row 2: numbers — hidden when expanded */}
                {!nutritionExpanded && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800' }}>🔥 <Text style={{ color: hasLogged ? COLORS.text : '#ffffff55' }}>{hasLogged ? log.calories.toLocaleString() : goalCal.toLocaleString()}</Text><Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '400' }}> kcal</Text></Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800' }}>💪 <Text style={{ color: hasLogged ? COLORS.text : '#ffffff55' }}>{hasLogged ? log.protein : goalProt}</Text><Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '400' }}>g</Text></Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Expandable content — same card, no gap */}
              <Animated.View style={{ maxHeight: nutritionExpandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }), overflow: 'hidden' }}>
                <Animated.View style={{ opacity: nutritionContentAnim, transform: [{ translateY: nutritionContentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                <View style={{ height: 1, backgroundColor: '#ffffff08' }} />
                <NutritionExpandedContent
                  onLog={() => {
                    const DAY_NAMES_OL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                    const todayNameOL = DAY_NAMES_OL[new Date().getDay()];
                    const todayIdxOL = plan?.findIndex(d => d.day.startsWith(todayNameOL)) ?? -1;
                    const key = todayIdxOL !== -1 ? `w${currentWeek}_d${todayIdxOL + 1}` : `w${currentWeek}_d1`;
                    const l = nutritionHistory[key] || { calories: 0, protein: 0 };
                    setNutritionLogDate(key);
                    setNutritionLogInput({ calories: l.calories > 0 ? String(l.calories) : '', protein: l.protein > 0 ? String(l.protein) : '' });
                    setShowNutritionLogModal(true);
                  }}
                />
                </Animated.View>
              </Animated.View>
            </View>
          );
        })()}

        <View
          ref={planFlatListContainerRef}
          style={{ flex: 1 }}
          onLayout={() => {
            planFlatListContainerRef.current?.measure?.((x, y, w, h, px, py) => {
              planFlatListTopRef.current = py;
            });
          }}
        >
        <Animated.View style={{ flex: 1, transform: [{ translateX: weekSlideAnim }] }} pointerEvents={expandedNutKey ? 'box-none' : 'auto'}>
        <FlatList
          ref={planFlatListRef}
          data={expandedNutKey ? (plan || []).filter((_, i) => expandedNutKey === `w${currentWeek}_d${i + 1}`) : plan}
          keyExtractor={(item) => item.day}
          getItemLayout={(_, index) => ({ length: 116, offset: 116 * index, index })}
          onScroll={(e) => { planScrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={expandedNutKey ? { paddingTop: 2 } : undefined}
          scrollEnabled={!expandedNutKey}
          onScrollToIndexFailed={() => {}}
          onLayout={() => {
            if (!plan || !planFlatListRef.current || expandedNutKey) return;
            let activeWeek = null;
            for (let w = 1; w <= TOTAL_WEEKS; w++) {
              const hasIncomplete = plan.some(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${w}`]);
              if (hasIncomplete) { activeWeek = w; break; }
            }
            const nextIdx = plan.findIndex(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${activeWeek}`]);
            if (nextIdx > 0) {
              planFlatListRef.current.scrollToIndex({ index: nextIdx, animated: false, viewPosition: 0.1 });
            }
          }}
          ListHeaderComponent={
            !expandedNutKey ? (
              <View style={{ marginBottom: 8, marginTop: 0 }}>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Weekly Schedule</Text>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 32 }} />}
          renderItem={({ item, index }) => {
            // Find the actual next workout globally (lowest week with an incomplete day)
            let activeWeek = null;
            for (let w = 1; w <= TOTAL_WEEKS; w++) {
              const hasIncomplete = plan?.some(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${w}`]);
              if (hasIncomplete) { activeWeek = w; break; }
            }
            const nextDay = plan?.find(d => !d.day.includes('Rest') && !completedWorkouts[`${d.day}|${activeWeek}`]);
            const isNext = !!nextDay && activeWeek === currentWeek && item.day === nextDay.day;
            return (() => {
              const planDayIdx = plan ? plan.findIndex(d => d.day === item.day) : -1;
              const nutKey = planDayIdx !== -1 ? `w${currentWeek}_d${planDayIdx + 1}` : null;
              const nutritionData = (nutKey && nutritionHistory[nutKey]) || null;
              const handleSetExpandedNutKey = (newKey) => {
                if (newKey !== null) {
                  planSavedScrollIndexRef.current = index;
                  Animated.timing(weekCardAnim2, { toValue: 0, duration: 400, useNativeDriver: false }).start();
                  setExpandedNutKey(newKey);
                } else {
                  setExpandedNutKey(null);
                  const savedIdx = planSavedScrollIndexRef.current ?? index;
                  // Wait for full plan data to be restored before scrolling
                  setTimeout(() => {
                    planFlatListRef.current?.scrollToIndex({ index: savedIdx, animated: false, viewPosition: 0.3 });
                  }, 600);
                  setTimeout(() => {
                    Animated.timing(weekCardAnim2, { toValue: 1, duration: 250, useNativeDriver: false }).start();
                  }, 700);
                }
              };
              return (
                <DayCard
                  item={item}
                  currentWeek={currentWeek}
                  logs={logs}
                  completedWorkouts={completedWorkouts}
                  isNext={isNext}
                  nutritionData={nutritionData}
                  nutKey={nutKey}
                  nutritionGoal={{ cal: nutritionResult?.target ?? nutritionResult?.tdee ?? 0, prot: nutritionResult?.proteinG ?? 0 }}
                  expandedNutKey={expandedNutKey}
                  setExpandedNutKey={handleSetExpandedNutKey}
                  screenHeight={screenHeight}
                  nutExpandedHeight={screenHeight - 310}
                  mealsCount={nutritionData?.meals ? nutritionData.meals.reduce((s, m) => s + m.foods.length, 0) : 0}
                  onLogMeals={() => nutKey && setMealLogModalKey(nutKey)}
                  onViewNutritionPlan={() => setScreen('nutritionResults')}
                  onCompleteRest={() => {
                    const key = `${item.day}|${currentWeek}`;
                    const newVal = !completedWorkouts[key];
                    const updatedCW = { ...completedWorkouts, [key]: newVal };
                    setCompletedWorkouts(updatedCW);
                    if (nutKey) {
                      setDailyWins(w => {
                        const updated = { ...w, [nutKey]: { ...(w[nutKey] || {}), workout: newVal } };
                        if (user) updateDoc(doc(db, 'users', user.email), { completedWorkouts: updatedCW, dailyWins: updated });
                        return updated;
                      });
                    } else {
                      if (user) updateDoc(doc(db, 'users', user.email), { completedWorkouts: updatedCW });
                    }
                  }}
                  onSaveNutrition={(cal, prot, carbs, fats) => {
                    if (!nutKey) return;
                    const updatedHistory = { ...nutritionHistory, [nutKey]: { ...nutritionHistory[nutKey], calories: cal, protein: prot, carbs, fats } };
                    setNutritionHistory(updatedHistory);
                    if (user) updateDoc(doc(db, 'users', user.email), { nutritionHistory: updatedHistory });
                    const protGoal = nutritionResult?.proteinG || 0;
                    const calGoal = nutritionResult?.target ?? nutritionResult?.tdee ?? 0;
                    setDailyWins(w => {
                      const updated = { ...w, [nutKey]: { ...(w[nutKey] || {}), protein: protGoal > 0 && prot >= protGoal, calories: calGoal > 0 && cal >= calGoal * 0.9 && cal <= calGoal * 1.1 } };
                      if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
                      return updated;
                    });
                  }}
                  onPress={() => navigateToDay(item)}
                  customFoods={customFoods}
                  onSaveCustomFood={(food) => {
                    const exists = customFoods.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase());
                    const updated = exists >= 0 ? customFoods.map((f, i) => i === exists ? food : f) : [...customFoods, food];
                    setCustomFoods(updated);
                    if (user) updateDoc(doc(db, 'users', user.email), { customFoods: updated });
                  }}
                  favoriteFoods={favoriteFoods}
                  onToggleFavorite={(name) => {
                    const updated = favoriteFoods.includes(name) ? favoriteFoods.filter(n => n !== name) : [...favoriteFoods, name];
                    setFavoriteFoods(updated);
                    if (user) updateDoc(doc(db, 'users', user.email), { favoriteFoods: updated });
                  }}
                  nutritionHistory={nutritionHistory}
                  onSaveMeals={(meals, dailyTotals) => {
                    if (!nutKey) return;
                    const updatedHistory = { ...nutritionHistory, [nutKey]: { ...nutritionHistory[nutKey], calories: dailyTotals.calories, protein: dailyTotals.protein, carbs: dailyTotals.carbs, fats: dailyTotals.fats, meals } };
                    setNutritionHistory(updatedHistory);
                    if (user) updateDoc(doc(db, 'users', user.email), { nutritionHistory: updatedHistory });
                    const protGoal = nutritionResult?.proteinG || 0;
                    const calGoal = nutritionResult?.target ?? nutritionResult?.tdee ?? 0;
                    setDailyWins(w => {
                      const updated = { ...w, [nutKey]: { ...(w[nutKey] || {}), protein: protGoal > 0 && dailyTotals.protein >= protGoal, calories: calGoal > 0 && dailyTotals.calories >= calGoal * 0.9 && dailyTotals.calories <= calGoal * 1.1 } };
                      if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
                      return updated;
                    });
                  }}
                />
              );
            })();
          }}
        />
        </Animated.View>
        </View>

        {/* Meal Log Modal */}
        <MealLogModal
          visible={!!mealLogModalKey}
          onClose={() => setMealLogModalKey(null)}
          nutKey={mealLogModalKey}
          mealsData={(mealLogModalKey && nutritionHistory[mealLogModalKey]?.meals) || null}
          nutritionHistory={nutritionHistory}
          customFoods={customFoods}
          favoriteFoods={favoriteFoods}
          onLogout={() => { setMealLogModalKey(null); handleLogout(); }}
          onSettings={() => { setMealLogModalKey(null); setSettingsFrom(screen); setScreen('settings'); }}
          onToggleFavorite={(name) => {
            const updated = favoriteFoods.includes(name)
              ? favoriteFoods.filter(n => n !== name)
              : [...favoriteFoods, name];
            setFavoriteFoods(updated);
            if (user) updateDoc(doc(db, 'users', user.email), { favoriteFoods: updated });
          }}
          onSaveCustomFood={(food) => {
            const exists = customFoods.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase());
            const updated = exists >= 0
              ? customFoods.map((f, i) => i === exists ? food : f)
              : [...customFoods, food];
            setCustomFoods(updated);
            if (user) updateDoc(doc(db, 'users', user.email), { customFoods: updated });
          }}
          onSaveMeals={(meals, dailyTotals) => {
            if (!mealLogModalKey) return;
            const updatedHistory = {
              ...nutritionHistory,
              [mealLogModalKey]: {
                ...nutritionHistory[mealLogModalKey],
                calories: dailyTotals.calories,
                protein: dailyTotals.protein,
                carbs: dailyTotals.carbs,
                fats: dailyTotals.fats,
                meals,
              },
            };
            setNutritionHistory(updatedHistory);
            if (user) updateDoc(doc(db, 'users', user.email), { nutritionHistory: updatedHistory });
            const protGoal = nutritionResult?.proteinG || 0;
            const calGoal = nutritionResult?.target ?? nutritionResult?.tdee ?? 0;
            setDailyWins(w => {
              const updated = { ...w, [mealLogModalKey]: { ...(w[mealLogModalKey] || {}), protein: protGoal > 0 && dailyTotals.protein >= protGoal, calories: calGoal > 0 && dailyTotals.calories >= calGoal * 0.9 && dailyTotals.calories <= calGoal * 1.1 } };
              if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
              return updated;
            });
          }}
        />

        {/* Update Weights Prompt */}
        <Modal visible={showUpdateWeightsPrompt} transparent animationType="fade" onRequestClose={() => setShowUpdateWeightsPrompt(false)}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' }} onPress={() => setShowUpdateWeightsPrompt(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ffffff20', alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>Update starting weights?</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
                  You haven't finished Week 1 yet. Want to update your suggested weights before you start?
                </Text>
                {suggestedWeights && (
                  <View style={{ backgroundColor: '#0e0e22', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20, borderWidth: 1, borderColor: '#ffffff10' }}>
                    <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 }}>CURRENT WEIGHTS</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {[['Bench', suggestedWeights.bench], ['Squat', suggestedWeights.squat], ['Deadlift', suggestedWeights.deadlift], ['OHP', suggestedWeights.ohp]].map(([label, w]) => (
                        <View key={label} style={{ alignItems: 'center' }}>
                          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{w}</Text>
                          <Text style={{ color: COLORS.muted, fontSize: 10 }}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <AnimatedPress
                  style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
                  onPress={() => { setShowUpdateWeightsPrompt(false); setShowWeightsModal(true); }}
                  scaleDown={0.97}
                >
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Yes, update weights</Text>
                </AnimatedPress>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 10 }}>
                  <TouchableOpacity onPress={() => {
                    const next = !weightsPromptDismissed;
                    setWeightsPromptDismissed(next);
                    if (user) updateDoc(doc(db, 'users', user.email), { weightsPromptDismissed: next });
                  }} style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: weightsPromptDismissed ? COLORS.accent : '#ffffff40', backgroundColor: weightsPromptDismissed ? COLORS.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {weightsPromptDismissed && <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', lineHeight: 13 }}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowUpdateWeightsPrompt(false)}>
                    <Text style={{ color: COLORS.muted, fontSize: 14 }}>No, keep current weights</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Weights Setup Modal */}
        <Modal visible={showWeightsModal} transparent animationType="slide" onRequestClose={() => setShowWeightsModal(false)}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' }} onPress={() => setShowWeightsModal(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 0 }}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: screenHeight * 0.9 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
                  {/* Handle */}
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ffffff20', alignSelf: 'center', marginBottom: 10 }} />

                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 }}>Set your starting weights</Text>

                  <View style={{ gap: 6, marginBottom: 10 }}>
                    {[
                      { key: 'recommended', icon: '🔥', title: 'Recommended', desc: "Auto-selected for you", badge: 'DEFAULT' },
                      { key: 'maxes',       icon: '💪', title: 'Enter your maxes', desc: 'Bench · Squat · Deadlift 1RM' },
                    ].map(({ key, icon, title, desc, badge }) => {
                      const active = weightSetupMode === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setWeightSetupMode(key)}
                          style={{ backgroundColor: active ? '#ffffff0d' : COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: active ? 1.5 : 1, borderColor: active ? '#ffffff35' : '#ffffff10', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        >
                          <Text style={{ fontSize: 20 }}>{icon}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                              <Text style={{ color: active ? COLORS.text : COLORS.muted, fontWeight: '700', fontSize: 14 }}>{title}</Text>
                              {badge && <View style={{ backgroundColor: COLORS.accent + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: COLORS.accent, fontSize: 8, fontWeight: '800' }}>{badge}</Text></View>}
                            </View>
                            <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 1 }}>{desc}</Text>
                          </View>
                          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: active ? '#ffffff50' : '#ffffff20', alignItems: 'center', justifyContent: 'center', backgroundColor: active ? '#ffffff15' : 'transparent' }}>
                            {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.text }} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Recommended explanation */}
                  {weightSetupMode === 'recommended' && (() => {
                    const bw = parseFloat(profileForm.weightLbs) || 160;
                    const level = profileForm.fitnessLevel || 'Beginner';
                    const ratioMap = { Beginner: 0.50, Intermediate: 0.85, Advanced: 1.25 };
                    const ratio = ratioMap[level] || 0.50;
                    return (
                      <View style={{ backgroundColor: '#0e0e22', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ffffff10', gap: 8 }}>
                        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>HOW IT'S CALCULATED</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18 }}>
                          Your profile shows <Text style={{ color: COLORS.text, fontWeight: '700' }}>{bw} lbs</Text> bodyweight. We estimate your bench 1-rep max at <Text style={{ color: COLORS.text, fontWeight: '700' }}>{bw} × {ratio} = {Math.round(bw * ratio)} lbs</Text>, then take <Text style={{ color: COLORS.text, fontWeight: '700' }}>70%</Text> as your working weight.
                        </Text>
                        <View>
                          <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 }}>EXPERIENCE LEVEL</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {[
                              { val: 'Beginner',     sub: '< 1 year' },
                              { val: 'Intermediate', sub: '1–3 years' },
                              { val: 'Advanced',     sub: '3+ years' },
                            ].map(({ val, sub }) => {
                              const active = level === val;
                              return (
                                <TouchableOpacity
                                  key={val}
                                  onPress={() => {
                                    setProfileForm(f => ({ ...f, fitnessLevel: val }));
                                    if (user) updateDoc(doc(db, 'users', user.email), { 'profile.fitnessLevel': val });
                                  }}
                                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: active ? COLORS.accent + '20' : '#ffffff08', borderRadius: 10, borderWidth: 1, borderColor: active ? COLORS.accent + '60' : '#ffffff12' }}
                                >
                                  <Text style={{ color: active ? COLORS.accent : COLORS.muted, fontSize: 12, fontWeight: '700' }}>{val}</Text>
                                  <Text style={{ color: active ? COLORS.accent + 'aa' : '#ffffff25', fontSize: 10, marginTop: 2 }}>{sub}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                        <Text style={{ color: '#ffffff30', fontSize: 11, lineHeight: 16 }}>
                          Squat and deadlift use higher multipliers; OHP uses a lower one. Adjust freely before each set.
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Maxes inputs */}
                  {weightSetupMode === 'maxes' && (
                    <View style={{ gap: 6, marginBottom: 10 }}>
                      {[['bench', 'Bench Press'], ['squat', 'Back Squat'], ['deadlift', 'Deadlift']].map(([field, label]) => (
                        <View key={field} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff12' }}>
                          <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', flex: 1 }}>{label}</Text>
                          <TextInput style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', textAlign: 'right', minWidth: 55 }} placeholder="0" placeholderTextColor={COLORS.muted + '80'} keyboardType="numeric" value={userMaxes[field]} onChangeText={v => setUserMaxes(m => ({ ...m, [field]: v }))} />
                          <Text style={{ color: COLORS.muted, fontSize: 12, marginLeft: 5 }}>lbs</Text>
                        </View>
                      ))}
                    </View>
                  )}


                  {/* Suggested starting weights */}
                  {(() => {
                    const bw = parseFloat(profileForm.weightLbs) || 160;
                    const level = profileForm.fitnessLevel || 'Beginner';
                    const round5 = v => Math.max(5, Math.round(v / 5) * 5);

                    const ratios = {
                      Beginner:     { bench: 0.50, squat: 0.65, deadlift: 0.80, ohp: 0.32 },
                      Intermediate: { bench: 0.85, squat: 1.25, deadlift: 1.50, ohp: 0.55 },
                      Advanced:     { bench: 1.25, squat: 1.75, deadlift: 2.00, ohp: 0.80 },
                    };
                    const r = ratios[level] || ratios.Beginner;

                    let bench1rm, squat1rm, dead1rm, ohp1rm, basis;

                    if (weightSetupMode === 'maxes' && (userMaxes.bench || userMaxes.squat || userMaxes.deadlift)) {
                      bench1rm = parseFloat(userMaxes.bench) || bw * r.bench;
                      squat1rm = parseFloat(userMaxes.squat) || bw * r.squat;
                      dead1rm  = parseFloat(userMaxes.deadlift) || bw * r.deadlift;
                      ohp1rm   = bench1rm * 0.62;
                      basis    = 'your 1-rep max';
                    } else {
                      bench1rm = bw * r.bench;
                      squat1rm = bw * r.squat;
                      dead1rm  = bw * r.deadlift;
                      ohp1rm   = bw * r.ohp;
                      basis    = 'your bodyweight & experience';
                    }

                    const lifts = [
                      { label: 'Bench',    w: round5(bench1rm * 0.70) },
                      { label: 'Squat',    w: round5(squat1rm * 0.70) },
                      { label: 'Deadlift', w: round5(dead1rm  * 0.65) },
                      { label: 'OHP',      w: round5(ohp1rm   * 0.70) },
                    ];

                    return (
                      <View style={{ backgroundColor: '#0e0e22', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ffffff10' }}>
                        <Text style={{ color: COLORS.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 }}>🎯  SUGGESTED WEEK 1 STARTING WEIGHTS</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          {lifts.map(({ label, w }) => (
                            <View key={label} style={{ alignItems: 'center' }}>
                              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>{w}</Text>
                              <Text style={{ color: COLORS.muted, fontSize: 10 }}>{label}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 7, opacity: 0.6 }}>Based on {basis} · adjust freely before each set</Text>
                      </View>
                    );
                  })()}

                  <AnimatedPress style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }} onPress={() => {
                    const bw = parseFloat(profileForm.weightLbs) || 160;
                    const level = profileForm.fitnessLevel || 'Beginner';
                    const round5 = v => Math.max(5, Math.round(v / 5) * 5);
                    const ratios = {
                      Beginner:     { bench: 0.50, squat: 0.65, deadlift: 0.80, ohp: 0.32 },
                      Intermediate: { bench: 0.85, squat: 1.25, deadlift: 1.50, ohp: 0.55 },
                      Advanced:     { bench: 1.25, squat: 1.75, deadlift: 2.00, ohp: 0.80 },
                    };
                    const r = ratios[level] || ratios.Beginner;
                    let bench1rm, squat1rm, dead1rm, ohp1rm;
                    if (weightSetupMode === 'maxes' && (userMaxes.bench || userMaxes.squat || userMaxes.deadlift)) {
                      bench1rm = parseFloat(userMaxes.bench) || bw * r.bench;
                      squat1rm = parseFloat(userMaxes.squat) || bw * r.squat;
                      dead1rm  = parseFloat(userMaxes.deadlift) || bw * r.deadlift;
                      ohp1rm   = bench1rm * 0.62;
                    } else {
                      bench1rm = bw * r.bench;
                      squat1rm = bw * r.squat;
                      dead1rm  = bw * r.deadlift;
                      ohp1rm   = bw * r.ohp;
                    }
                    const weights = {
                      bench:    round5(bench1rm * 0.70),
                      squat:    round5(squat1rm * 0.70),
                      deadlift: round5(dead1rm  * 0.65),
                      ohp:      round5(ohp1rm   * 0.70),
                    };
                    setSuggestedWeights(weights);
                    if (user) updateDoc(doc(db, 'users', user.email), { suggestedWeights: weights });
                    setShowWeightsModal(false);
                  }} scaleDown={0.97}>
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                      {weightSetupMode === 'recommended' ? "Let's Go 🚀" : 'Confirm & Start →'}
                    </Text>
                  </AnimatedPress>
                  <TouchableOpacity onPress={() => setShowWeightsModal(false)} style={{ alignItems: 'center' }}>
                    <Text style={{ color: COLORS.muted, fontSize: 13 }}>Skip for now →</Text>
                  </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {/* Quick Nutrition Log Modal */}
        <Modal visible={showNutritionLogModal} transparent animationType="slide" onRequestClose={() => setShowNutritionLogModal(false)}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' }} onPress={() => setShowNutritionLogModal(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 0 }}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 36 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff20', alignSelf: 'center', marginBottom: 20 }} />
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.4, marginBottom: 4 }}>
                    {nutritionLogDate ? `Log intake — ${nutritionLogDate.replace('w', 'Week ').replace('_d', ', Day ')}` : "Log intake"}
                  </Text>
                  <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>Cumulative totals for the day — update any time.</Text>
                  <View style={{ gap: 10, marginBottom: 20 }}>
                    {[
                      { key: 'calories', label: 'Calories', placeholder: '1850', unit: 'kcal', icon: '🔥' },
                      { key: 'protein',  label: 'Protein',  placeholder: '140',  unit: 'g',    icon: '💪' },
                    ].map(({ key, label, placeholder, unit, icon }) => (
                      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e22', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#ffffff12' }}>
                        <Text style={{ fontSize: 18, marginRight: 10 }}>{icon}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', flex: 1 }}>{label}</Text>
                        <TextInput
                          style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'right', minWidth: 70 }}
                          placeholder={placeholder}
                          placeholderTextColor={COLORS.muted + '60'}
                          keyboardType="numeric"
                          value={nutritionLogInput[key]}
                          onChangeText={v => setNutritionLogInput(s => ({ ...s, [key]: v }))}
                        />
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginLeft: 5 }}>{unit}</Text>
                      </View>
                    ))}
                  </View>
                  <AnimatedPress
                    style={{ backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
                    scaleDown={0.97}
                    onPress={() => {
                      const logDate = nutritionLogDate;
                      const cal  = parseInt(nutritionLogInput.calories) || 0;
                      const prot = parseInt(nutritionLogInput.protein)  || 0;
                      const updatedHistory = { ...nutritionHistory, [logDate]: { calories: cal, protein: prot } };
                      setNutritionHistory(updatedHistory);
                      if (user) updateDoc(doc(db, 'users', user.email), { nutritionHistory: updatedHistory });
                      const protGoal = nutritionResult?.proteinG || 0;
                      const calGoal  = nutritionResult?.target ?? nutritionResult?.tdee ?? 0;
                      setDailyWins(w => {
                        const updated = { ...w, [logDate]: { ...(w[logDate] || {}), protein: protGoal > 0 && prot >= protGoal, calories: calGoal > 0 && cal >= calGoal * 0.9 && cal <= calGoal * 1.1 } };
                        if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
                        return updated;
                      });
                      setShowNutritionLogModal(false);
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Save →</Text>
                  </AnimatedPress>
                  <TouchableOpacity onPress={() => setShowNutritionLogModal(false)} style={{ alignItems: 'center' }}>
                    <Text style={{ color: COLORS.muted, fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

      </Animated.View>
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
      <Animated.View style={[styles.container, { paddingTop: 80 }, { transform: [{ translateX: dayEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [daySlideFromLeft ? -screenWidth : screenWidth, 0] }) }] }]}>
        <LogoutBtn />
        <TouchableOpacity onPress={() => { setPlanSlideFromLeft(true); setScreen('plan'); }} style={[styles.backBtn, { position: 'absolute', top: 20, left: 16, zIndex: 10 }]}>
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

          {/* Coach status line */}
          {!isRestDay && progressFraction === 0 && (
            <View>
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>{totalExercises} exercises · ~{estimatedMinutes} min</Text>
              <Text style={{ color: COLORS.muted, fontSize: 14, marginTop: 3 }}>
                {workoutLabel.includes('Upper') ? "Time to build that upper body." :
                 workoutLabel.includes('Lower') || workoutLabel.includes('Leg') ? "Leg day builds champions. Let's go." :
                 workoutLabel.includes('Push') ? "Push day. Leave nothing in the tank." :
                 workoutLabel.includes('Pull') ? "Pull day. Build that back." :
                 workoutLabel.includes('Full') ? "Full body day. Make every rep count." :
                 "We've got you. Let's get to work."}
              </Text>
            </View>
          )}
          {!isRestDay && progressFraction > 0 && progressFraction < 1 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '700' }}>{loggedCount} of {totalExercises} done</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                  {loggedCount === 1 ? "— good start, keep going." :
                   loggedCount >= totalExercises - 1 ? "— almost there, finish strong!" :
                   "— you're in the zone."}
                </Text>
              </View>
              <AnimatedProgressBar progress={progressFraction} height={3} color="#f59e0b" trackColor="#2a2a3a" />
            </View>
          )}
          {!isRestDay && progressFraction >= 1 && (
            <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '600' }}>
              All done. Recovery starts now. 💪
            </Text>
          )}
          {isRestDay && (
            <Text style={{ color: COLORS.muted, fontSize: 14 }}>
              Rest is where the muscle is built.
            </Text>
          )}
        </View>



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
                  style={[styles.exerciseCard, { position: 'relative' }, isLogged && { backgroundColor: '#191932', borderTopColor: '#4ade8028', shadowColor: '#4ade80', shadowOpacity: 0.08, shadowRadius: 8 }, isActive && { borderLeftWidth: 3, borderLeftColor: '#6c80ff', shadowColor: '#6c80ff', shadowOpacity: 0.14, shadowRadius: 10 }, isResting && { borderColor: '#4ade8044', borderWidth: 1, shadowColor: '#4ade80', shadowOpacity: 0.1, shadowRadius: 10 }]}
                  onPress={() => {
                    if (!isStretching && !isFoamRolling && !isRestDay) {
                      setSelectedExercise(item);
                      setActiveExerciseIndex(index);
                      const sr = parseSetsReps(item);
                      const count = sr ? parseInt(sr.sets) : 3;
                      const lastLogs = logs[logKey(selectedDay.day, item)] || [];
                      const lastEntry = lastLogs.length > 0 ? lastLogs[lastLogs.length - 1] : null;
                      const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
                      const suggestedW = calculateSuggestedWeight(cleanExerciseName(item), currentWeek, suggestedWeights, profileForm.fitnessLevel);
                      setSessionSets(Array.from({ length: count }, (_, idx) => ({
                        weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || suggestedW || '',
                        reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
                        completed: false,
                      })));
                      setScreen('progress');
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                          {isActive && !isLogged && <PulsingDot />}
                          <Text style={{ color: isActive && !isLogged ? COLORS.accent : COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, opacity: isActive && !isLogged ? 1 : 0.7 }}>
                            {String(index + 1).padStart(2, '0')}
                          </Text>
                        </View>
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
                          ? null
                          : (() => {
                              if (thisWeekLogs.length === 0) {
                                return (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <View style={{ backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 }}>
                                      <Text style={{ color: '#000', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Start Set →</Text>
                                    </View>
                                  </View>
                                );
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
            contentContainerStyle={{ paddingBottom: restTimerEnabled ? 120 : 24 }}
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
            const dayIdx = plan ? plan.findIndex(d => d.day === selectedDay?.day) : -1;
            const dayNutKey = dayIdx !== -1 ? `w${currentWeek}_d${dayIdx + 1}` : null;
            if (nutritionResult && dayNutKey) {
              const hasNut = nutritionHistory[dayNutKey] && (nutritionHistory[dayNutKey].calories > 0 || nutritionHistory[dayNutKey].protein > 0);
              if (!hasNut) setShowNutritionNudge(true);
            }
            setShowDayComplete(true);
            setRestTimerRunning(false);
            setRestTimerRemaining(0);
            setRestingForExercise(null);
            const winKey = dayNutKey || new Date().toDateString();
            setDailyWins(w => {
              const updated = { ...w, [winKey]: { ...(w[winKey] || {}), workout: true } };
              if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
              return updated;
            });
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

        {/* ── Floating rest/stretch timer bar ── */}
        {((!isRestDay && restTimerEnabled) || (isRestDay && restTimerRunning)) && (() => {
          const activeEx = workoutExercises[activeExerciseIndex] ?? workoutExercises[0];
          const suggested = activeEx ? getRestSuggestion(activeEx) : 60;
          const label = isRestDay
            ? (restingForExercise && restingForExercise !== 'rest' ? restingForExercise : 'Forward Fold')
            : (restingForExercise ? cleanExerciseName(restingForExercise) : activeEx ? cleanExerciseName(activeEx) : '');
          const nextEx = !isRestDay && restTimerRunning
            ? workoutExercises.find((e, i) => i > activeExerciseIndex && !(logs[logKey(selectedDay.day, e)] || []).some(en => en.programWeek === currentWeek))
            : null;
          const displayTime = restTimerRunning ? restTimerRemaining : suggested;
          const pct = restTimerRunning && restTimerDuration > 0 ? (restTimerRemaining / restTimerDuration) * 100 : 0;
          const floatBottom = (!isRestDay && loggedCount === totalExercises && totalExercises > 0) ? 104 : 32;
          return (
            <View style={{
              position: 'absolute', bottom: floatBottom, left: 16, right: 16,
              backgroundColor: '#0e0e22',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: restTimerRunning ? '#4ade8040' : '#ffffff10',
              borderTopColor: restTimerRunning ? '#4ade8070' : '#ffffff18',
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 12,
              shadowColor: restTimerRunning ? '#4ade80' : '#000',
              shadowOpacity: restTimerRunning ? 0.2 : 0.08,
              shadowRadius: restTimerRunning ? 20 : 8,
              elevation: 10,
            }}>
              {/* Progress bar — only visible when running */}
              <View style={{ height: 2, backgroundColor: '#1a3a1a', borderRadius: 1, marginBottom: 10 }}>
                <View style={{ height: 2, backgroundColor: '#4ade80', borderRadius: 1, width: `${pct}%` }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }}>
                    {isRestDay ? 'STRETCH TIMER' : 'REST TIMER'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                    <Text style={{ color: restTimerRunning ? '#4ade80' : COLORS.muted, fontSize: 26, fontWeight: '900', letterSpacing: -1 }}>
                      {formatTime(displayTime)}
                    </Text>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }} numberOfLines={1}>{label}</Text>
                  </View>
                  {nextEx && (
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                      Next: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{cleanExerciseName(nextEx)}</Text>
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {restTimerRunning ? (
                    isRestDay ? (
                      <>
                        <TouchableOpacity
                          style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                          onPress={() => setRestTimerRunning(false)}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Pause</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                          onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(restTimerDuration); }}
                        >
                          <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Reset</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                          onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                          onPress={() => setRestTimerRemaining(r => Math.min(r + 30, restTimerDuration))}
                        >
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>+30s</Text>
                        </TouchableOpacity>
                      </>
                    )
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}
                      onPress={() => {
                        if (isRestDay) {
                          if (!restingForExercise || restingForExercise === 'rest') {
                            setRestingForExercise('Forward Fold');
                            setRestTimerDuration(45);
                            setRestTimerRemaining(45);
                          } else {
                            setRestTimerRemaining(restTimerDuration);
                          }
                        } else {
                          setRestingForExercise(activeEx);
                          setRestTimerDuration(suggested);
                          setRestTimerRemaining(suggested);
                        }
                        setRestTimerRunning(true);
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })()}

      </Animated.View>
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

    function navigateExercise(newIdx, direction = 1) {
      const newEx = dayExercises[newIdx];
      const sr = parseSetsReps(newEx);
      const count = sr ? parseInt(sr.sets) : 3;
      const lastLogs = logs[logKey(selectedDay.day, newEx)] || [];
      const lastEntry = lastLogs.length > 0 ? lastLogs[lastLogs.length - 1] : null;
      const fallbackReps = lastEntry?.reps || (sr ? sr.reps.split('-')[0] : '');
      const suggestedW = calculateSuggestedWeight(cleanExerciseName(newEx), currentWeek, suggestedWeights, profileForm.fitnessLevel);
      pendingSlideDirection.current = direction;
      exerciseSlideAnim.setValue(direction * screenWidth);
      setSessionSets(Array.from({ length: count }, (_, idx) => ({
        weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || suggestedW || '',
        reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
        completed: false,
      })));
      setSelectedExercise(newEx);
      setActiveExerciseIndex(newIdx);
    }

    return (
      <Animated.View style={[styles.container, { transform: [{ translateX: progressEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [screenWidth, 0] }) }] }]}>
        <LogoutBtn />
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => { setDaySlideFromLeft(true); setScreen('day'); }} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>

        {/* Clipping container — clips the sliding content */}
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#0f0f0f', marginTop: -16 }}>
          <Animated.View style={{ flex: 1, backgroundColor: '#0f0f0f', transform: [{ translateX: exerciseSlideAnim }] }}>

            {/* Exercise selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.deep, borderWidth: 1, borderColor: '#ffffff06', borderTopColor: '#ffffff28', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
              <TouchableOpacity onPress={() => exIdx > 0 && navigateExercise(exIdx - 1, -1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: exIdx > 0 ? 1 : 0.35 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 15, flex: 1, textAlign: 'center', paddingHorizontal: 8 }} numberOfLines={1}>
                <Text style={{ color: COLORS.text }}>{cleanExerciseName(selectedExercise)}</Text>
                <Text style={{ color: COLORS.muted, fontWeight: 'normal', fontSize: 13 }}> ({exIdx + 1}/{dayExercises.length})</Text>
              </Text>
              <TouchableOpacity onPress={() => exIdx < dayExercises.length - 1 && navigateExercise(exIdx + 1, 1)} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', opacity: exIdx < dayExercises.length - 1 ? 1 : 0.35 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 }}>›</Text>
              </TouchableOpacity>
            </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120, backgroundColor: '#0f0f0f' }} style={{ backgroundColor: '#0f0f0f' }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.progressHeader}>
            <View style={{ borderWidth: 1, borderColor: '#ffffff30', borderRadius: 10, overflow: 'hidden' }}>
              <ExerciseImage exerciseName={selectedExercise} exerciseDbImages={exerciseDbImages} size={200} />
            </View>
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
                  const allCompleted = sessionSets.length > 0 && sessionSets.every(s => s.completed);
                  const suggestedW = allCompleted
                    ? calculateSuggestedWeight(cleanExerciseName(selectedExercise), currentWeek, suggestedWeights, profileForm.fitnessLevel)
                    : null;
                  setSessionSets(Array.from({ length: count }, (_, idx) => ({
                    weight: lastEntry?.sets?.[idx]?.weight || lastEntry?.weight || suggestedW || '',
                    reps: lastEntry?.sets?.[idx]?.reps || fallbackReps,
                    completed: false,
                    confirmed: false,
                  })));
                }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
            </View>
            {/* Complete Set button — fixed below header */}
            {(() => {
              const activeIndex = sessionSets.findIndex(s => !s.completed);
              if (activeIndex === -1) return null;
              const set = sessionSets[activeIndex];
              return (
                <TouchableOpacity
                  activeOpacity={1}
                  style={{ backgroundColor: '#4ade80', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 }}
                  onPress={() => {
                    if (set.completed) return;
                    if (!set.weight || parseFloat(set.weight) <= 0) {
                      Alert.alert('Enter a Weight', 'Please enter a weight before completing this set.');
                      return;
                    }
                    const s = [...sessionSets];
                    s[activeIndex] = { ...s[activeIndex], completed: true, confirmed: true };
                    const completedWeight = s[activeIndex].weight;
                    for (let i = activeIndex + 1; i < s.length; i++) {
                      if (!s[i].completed) s[i] = { ...s[i], weight: completedWeight };
                    }
                    setSessionSets(s);
                    const isLastSet = activeIndex === s.length - 1;
                    if (isLastSet) {
                      const completed = s.filter(ss => ss.completed);
                      const maxWeight = Math.max(...completed.map(ss => parseFloat(ss.weight) || 0));
                      const bestSet = completed.find(ss => parseFloat(ss.weight) === maxWeight) || completed[completed.length - 1];
                      const key = logKey(selectedDay.day, selectedExercise);
                      const existing = logs[key] || [];
                      const allSets = s.map((ss, idx) => ss.completed ? { weight: ss.weight, reps: ss.reps } : (existing[existing.length - 1]?.sets?.[idx] || { weight: '', reps: '' }));
                      const newEntry = { programWeek: currentWeek, weight: String(maxWeight), reps: bestSet.reps, sets: allSets };
                      const updatedLogs = { ...logs, [key]: [...existing, newEntry] };
                      setLogs(updatedLogs);
                      if (user) updateDoc(doc(db, 'users', user.email), { logs: updatedLogs });
                      const dayExs = (selectedDay?.exercises || []).filter(e => !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk'));
                      const allLogged = dayExs.every(e => (updatedLogs[logKey(selectedDay.day, e)] || []).some(en => en.programWeek === currentWeek));
                      if (allLogged) {
                        Vibration.vibrate([0, 60, 40, 80]);
                        setShowCompleteButton(true);
                        setRestTimerRunning(false);
                        setRestTimerRemaining(0);
                      } else if (restTimerEnabled) {
                        const suggested = getRestSuggestion(selectedExercise);
                        setRestingForExercise(selectedExercise);
                        setRestTimerDuration(suggested);
                        setRestTimerRemaining(suggested);
                        setRestTimerRunning(true);
                      }
                    } else {
                      if (restTimerEnabled) {
                        const suggested = getRestSuggestion(selectedExercise);
                        setRestingForExercise(selectedExercise);
                        setRestTimerDuration(suggested);
                        setRestTimerRemaining(suggested);
                        setRestTimerRunning(true);
                      }
                      const nextIdx = s.findIndex((ss, i) => i > activeIndex && !ss.completed);
                      if (nextIdx !== -1) setActiveExerciseIndex(nextIdx);
                    }
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>{activeIndex === sessionSets.length - 1 ? 'Complete & Save Sets' : `Complete Set ${activeIndex + 1}`}</Text>
                </TouchableOpacity>
              );
            })()}

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
              const coachLine =
                activeIndex === 0 ? "We've got you — first set, go." :
                activeIndex === sessionSets.length - 1 ? "Last set. Make it count." :
                activeIndex === 1 ? "Good start. Stay locked in." :
                "Keep the intensity up.";
              return (
                <View style={{ paddingVertical: 10 }}>
                  {/* Set progress bar */}
                  <View style={{ width: '100%', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                        SET {activeIndex + 1} OF {sessionSets.length}
                      </Text>
                      <Text style={{ color: COLORS.muted, fontSize: 11, fontStyle: 'italic' }}>{coachLine}</Text>
                    </View>
                    <View style={{ height: 3, backgroundColor: '#1e1e3a', borderRadius: 2 }}>
                      <View style={{ height: 3, backgroundColor: COLORS.accent, borderRadius: 2, width: `${(activeIndex / sessionSets.length) * 100}%` }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14, justifyContent: 'center' }}>
                    <Animated.View style={{ transform: [{ scale: set.confirmed ? 1 : weightPulseAnim }] }}>
                      <TouchableOpacity
                        onPress={() => { setWeightPickerIndex(activeIndex); setWeightPickerVisible(true); }}
                        style={{ backgroundColor: '#2a2a4a', borderRadius: 16, width: 120, height: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: set.confirmed ? COLORS.accent : '#6c80ff90' }}>
                        <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>WEIGHT</Text>
                        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800' }}>{set.weight || '—'}</Text>
                        {activeIndex > 0 && sessionSets[activeIndex - 1]?.weight ? (
                          <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600' }}>prev {sessionSets[activeIndex - 1].weight} lbs</Text>
                        ) : (
                          <Text style={{ color: set.confirmed ? COLORS.muted : '#6c80ffcc', fontSize: 11, fontWeight: '600' }}>{set.confirmed ? 'lbs' : 'confirm ✓'}</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
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
          </Animated.View>
        </View>

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
                    onPress={() => setRepsPickerVisible(false)}
                    style={{ width: 220, backgroundColor: '#2a2a4a', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff20', marginBottom: 0 }}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>OK</Text>
                  </TouchableOpacity>
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
                    <View style={{ paddingHorizontal: 24, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ffffff10', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: '600', marginLeft: -8 }}>Select Weight</Text>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => {
                          if (tempWeightVal !== null) {
                            const s = [...sessionSets];
                            const newWeight = String(tempWeightVal);
                            s[weightPickerIndex] = { ...s[weightPickerIndex], weight: newWeight, confirmed: true };
                            for (let i = weightPickerIndex + 1; i < s.length; i++) {
                              if (!s[i].completed) s[i] = { ...s[i], weight: newWeight };
                            }
                            setSessionSets(s);
                          }
                          setTempWeightVal(null);
                          setWeightPickerVisible(false);
                        }} style={{ backgroundColor: '#2a2a4a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff20' }}>
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>OK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          const s = [...sessionSets];
                          const newWeight = String(tempWeightVal ?? selectedVal);
                          s[weightPickerIndex] = { ...s[weightPickerIndex], weight: newWeight, confirmed: true, completed: true };
                          for (let i = weightPickerIndex + 1; i < s.length; i++) {
                            if (!s[i].completed) s[i] = { ...s[i], weight: newWeight };
                          }
                          setSessionSets(s);
                          setTempWeightVal(null);
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
                            const dayExs = (selectedDay?.exercises || []).filter(e =>
                              !e.includes('Full Body Stretching') && !e.includes('Full Body Foam Rolling') && !e.includes('Incline Walk')
                            );
                            const allLogged = dayExs.every(e =>
                              (updatedLogs[logKey(selectedDay.day, e)] || []).some(en => en.programWeek === currentWeek)
                            );
                            if (allLogged) {
                              Vibration.vibrate([0, 60, 40, 80]);
                              setShowCompleteButton(true);
                              setRestTimerRunning(false);
                              setRestTimerRemaining(0);
                            }
                          }
                        }} style={{ backgroundColor: '#4ade80', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
                          <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>{weightPickerIndex === sessionSets.length - 1 ? 'Complete & Save' : 'Complete'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          if (tempWeightVal !== null) {
                            const s = [...sessionSets];
                            s[weightPickerIndex] = { ...s[weightPickerIndex], weight: String(tempWeightVal), confirmed: true };
                            setSessionSets(s);
                          }
                          setTempWeightVal(null);
                          setWeightPickerVisible(false);
                          setRepsPickerIndex(weightPickerIndex);
                          setRepsPickerVisible(true);
                        }} style={{ backgroundColor: '#2a2a4a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff20' }}>
                          <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>Adjust Reps</Text>
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
                          style={{ height: 260 }}
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
                          renderItem={({ item: w, index }) => {
                            const isSelected = Math.abs(w - (tempWeightVal ?? selectedVal)) < 0.01;
                            const label = `${w % 1 === 0 ? w : w.toFixed(1)} lbs`;
                            const milestone = milestones[w];
                            return (
                              <TouchableOpacity
                                onPress={() => { setTempWeightVal(w); weightListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); }}
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
            const dayIdx = plan ? plan.findIndex(d => d.day === selectedDay?.day) : -1;
            const dayNutKey = dayIdx !== -1 ? `w${currentWeek}_d${dayIdx + 1}` : null;
            if (nutritionResult && dayNutKey) {
              const hasNut = nutritionHistory[dayNutKey] && (nutritionHistory[dayNutKey].calories > 0 || nutritionHistory[dayNutKey].protein > 0);
              if (!hasNut) setShowNutritionNudge(true);
            }
            setShowDayComplete(true);
            setRestTimerRunning(false);
            setRestTimerRemaining(0);
            setRestingForExercise(null);
            const winKey = dayNutKey || new Date().toDateString();
            setDailyWins(w => {
              const updated = { ...w, [winKey]: { ...(w[winKey] || {}), workout: true } };
              if (user) updateDoc(doc(db, 'users', user.email), { dailyWins: updated });
              return updated;
            });
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

        {/* ── Floating rest timer bar (progress screen) ── */}
        {restTimerEnabled && (() => {
          const suggested = getRestSuggestion(selectedExercise);
          const displayTime = restTimerRunning ? restTimerRemaining : suggested;
          const pct = restTimerRunning && restTimerDuration > 0 ? (restTimerRemaining / restTimerDuration) * 100 : 0;
          const nextExProgress = exIdx < dayExercises.length - 1 ? cleanExerciseName(dayExercises[exIdx + 1]) : null;
          const floatBottom = (shouldShowCompleteBtn || showCompleteButton) ? 104 : 32;
          return (
            <View style={{
              position: 'absolute', bottom: floatBottom, left: 16, right: 16,
              backgroundColor: '#0e0e22',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: restTimerRunning ? '#4ade8040' : '#ffffff10',
              borderTopColor: restTimerRunning ? '#4ade8070' : '#ffffff18',
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 12,
              shadowColor: restTimerRunning ? '#4ade80' : '#000',
              shadowOpacity: restTimerRunning ? 0.2 : 0.08,
              shadowRadius: restTimerRunning ? 20 : 8,
              elevation: 10,
            }}>
              <View style={{ height: 2, backgroundColor: '#1a3a1a', borderRadius: 1, marginBottom: 10 }}>
                <View style={{ height: 2, backgroundColor: '#4ade80', borderRadius: 1, width: `${pct}%` }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }}>REST TIMER</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                    <Text style={{ color: restTimerRunning ? '#4ade80' : COLORS.muted, fontSize: 26, fontWeight: '900', letterSpacing: -1 }}>
                      {formatTime(displayTime)}
                    </Text>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }} numberOfLines={1}>{cleanExerciseName(selectedExercise)}</Text>
                  </View>
                  {nextExProgress && restTimerRunning && (
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                      Next: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{nextExProgress}</Text>
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {restTimerRunning ? (
                    <>
                      <TouchableOpacity
                        style={{ backgroundColor: '#2a2a3e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                        onPress={() => { setRestTimerRunning(false); setRestTimerRemaining(0); setRestingForExercise(null); }}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Skip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
                        onPress={() => setRestTimerRemaining(r => Math.min(r + 30, restTimerDuration))}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>+30s</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: '#4ade80', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}
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
            </View>
          );
        })()}

        {renderDayCompleteModal()}

      </Animated.View>
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
  exImgBox: { width: 120, height: 76, borderRadius: 8, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
          <Root />
        </View>
      </TouchableWithoutFeedback>
    </ErrorBoundary>
  );
}
