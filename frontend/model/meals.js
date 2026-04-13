/**
 * model/meals.js
 * ──────────────────────────────────────────────────────────────
 * Meal dataset + JS ML scoring engine
 * Ported from meal_model.py (Random Forest feature logic re-implemented
 * as weighted scoring — runs 100% in-browser, no server needed).
 *
 * Exports (via window.*):
 *   MEALS_DB       — full 40+ meal dataset array
 *   CUISINE_ICON   — emoji map by cuisine string
 *   scoreMeals(diet, tdee, bodyType, topK) → ranked meal array
 */

'use strict';

// ── Dataset (mirrors MEALS list in meal_model.py) ─────────────
const MEALS_DB = [
  // VEGAN
  { name: "Chickpea Curry", diet: "vegan", ings: ["chickpea", "tomato", "onion", "garlic", "spices"], cal: 380, pro: 15, carb: 52, fat: 10, cuisine: "indian" },
  { name: "Tofu Stir Fry", diet: "vegan", ings: ["tofu", "broccoli", "carrot", "soy_sauce", "garlic"], cal: 320, pro: 22, carb: 28, fat: 9, cuisine: "asian" },
  { name: "Lentil Soup", diet: "vegan", ings: ["lentil", "tomato", "onion", "carrot", "spices"], cal: 290, pro: 18, carb: 48, fat: 4, cuisine: "mediterranean" },
  { name: "Quinoa Buddha Bowl", diet: "vegan", ings: ["quinoa", "chickpea", "spinach", "avocado", "lemon"], cal: 430, pro: 18, carb: 52, fat: 16, cuisine: "fusion" },
  { name: "Black Bean Tacos", diet: "vegan", ings: ["black_bean", "corn_tortilla", "avocado", "salsa", "lime"], cal: 370, pro: 14, carb: 54, fat: 12, cuisine: "mexican" },
  { name: "Dal Tadka", diet: "vegan", ings: ["lentil", "tomato", "onion", "garlic", "spices"], cal: 300, pro: 16, carb: 46, fat: 6, cuisine: "indian" },
  { name: "Avocado Toast", diet: "vegan", ings: ["bread", "avocado", "lemon", "tomato", "spices"], cal: 340, pro: 10, carb: 40, fat: 16, cuisine: "western" },
  { name: "Sweet Potato Salad", diet: "vegan", ings: ["sweet_potato", "kale", "walnut", "tahini"], cal: 410, pro: 12, carb: 58, fat: 18, cuisine: "fusion" },
  { name: "Mushroom Tacos", diet: "vegan", ings: ["mushroom", "corn", "onion", "lime"], cal: 310, pro: 8, carb: 42, fat: 14, cuisine: "mexican" },
  { name: "Falafel Platter", diet: "vegan", ings: ["chickpea", "tahini", "cucumber", "pita"], cal: 480, pro: 16, carb: 62, fat: 22, cuisine: "mediterranean" },

  // VEGETARIAN
  { name: "Mushroom Risotto", diet: "vegetarian", ings: ["mushroom", "rice", "onion", "garlic", "parmesan"], cal: 450, pro: 14, carb: 62, fat: 13, cuisine: "italian" },
  { name: "Paneer Tikka", diet: "vegetarian", ings: ["paneer", "yogurt", "tomato", "spices", "onion"], cal: 410, pro: 22, carb: 18, fat: 26, cuisine: "indian" },
  { name: "Caprese Pasta", diet: "vegetarian", ings: ["pasta", "mozzarella", "tomato", "basil", "olive_oil"], cal: 520, pro: 20, carb: 68, fat: 18, cuisine: "italian" },
  { name: "Veggie Omelette", diet: "vegetarian", ings: ["egg", "spinach", "mushroom", "cheese", "onion"], cal: 310, pro: 22, carb: 10, fat: 20, cuisine: "western" },
  { name: "Greek Salad Wrap", diet: "vegetarian", ings: ["feta", "cucumber", "tomato", "olive", "flatbread"], cal: 380, pro: 14, carb: 46, fat: 16, cuisine: "mediterranean" },
  { name: "Palak Paneer", diet: "vegetarian", ings: ["paneer", "spinach", "onion", "garlic", "cream"], cal: 420, pro: 20, carb: 22, fat: 28, cuisine: "indian" },
  { name: "Pesto Pasta", diet: "vegetarian", ings: ["pasta", "basil", "parmesan", "garlic", "olive_oil"], cal: 520, pro: 16, carb: 66, fat: 20, cuisine: "italian" },
  { name: "Veggie Burger", diet: "vegetarian", ings: ["veggie_patty", "bread", "lettuce", "tomato", "cheese"], cal: 450, pro: 18, carb: 56, fat: 16, cuisine: "western" },
  { name: "Eggplant Parmesan", diet: "vegetarian", ings: ["eggplant", "tomato", "mozzarella", "basil"], cal: 390, pro: 15, carb: 34, fat: 24, cuisine: "italian" },
  { name: "Veggie Lasagna", diet: "vegetarian", ings: ["pasta", "zucchini", "ricotta", "tomato"], cal: 510, pro: 24, carb: 58, fat: 22, cuisine: "italian" },
  { name: "Spinach & Feta Pie", diet: "vegetarian", ings: ["spinach", "feta", "pastry", "onion"], cal: 460, pro: 14, carb: 42, fat: 28, cuisine: "mediterranean" },

  // NON-VEG
  { name: "Grilled Chicken Salad", diet: "non-veg", ings: ["chicken", "lettuce", "tomato", "cucumber", "olive_oil"], cal: 350, pro: 36, carb: 14, fat: 14, cuisine: "western" },
  { name: "Chicken Fried Rice", diet: "non-veg", ings: ["chicken", "rice", "egg", "carrot", "soy_sauce"], cal: 490, pro: 30, carb: 58, fat: 12, cuisine: "asian" },
  { name: "Salmon with Veggies", diet: "non-veg", ings: ["salmon", "broccoli", "lemon", "garlic", "olive_oil"], cal: 420, pro: 38, carb: 18, fat: 20, cuisine: "western" },
  { name: "Egg Curry", diet: "non-veg", ings: ["egg", "tomato", "onion", "garlic", "spices"], cal: 360, pro: 20, carb: 24, fat: 20, cuisine: "indian" },
  { name: "Chicken Biryani", diet: "non-veg", ings: ["chicken", "rice", "onion", "yogurt", "spices"], cal: 580, pro: 32, carb: 70, fat: 16, cuisine: "indian" },
  { name: "Tuna Pasta", diet: "non-veg", ings: ["tuna", "pasta", "tomato", "garlic", "olive_oil"], cal: 470, pro: 30, carb: 60, fat: 10, cuisine: "mediterranean" },
  { name: "Beef Stir Fry", diet: "non-veg", ings: ["beef", "broccoli", "soy_sauce", "garlic", "ginger"], cal: 430, pro: 34, carb: 22, fat: 20, cuisine: "asian" },
  { name: "Shrimp Tacos", diet: "non-veg", ings: ["shrimp", "corn_tortilla", "avocado", "salsa", "lime"], cal: 390, pro: 26, carb: 48, fat: 12, cuisine: "mexican" },
  { name: "Fish Curry", diet: "non-veg", ings: ["fish", "tomato", "onion", "garlic", "spices"], cal: 370, pro: 30, carb: 24, fat: 14, cuisine: "indian" },
  { name: "Chicken Caesar Wrap", diet: "non-veg", ings: ["chicken", "lettuce", "parmesan", "flatbread", "caesar"], cal: 470, pro: 34, carb: 44, fat: 16, cuisine: "western" },
  { name: "Turkey Meatballs", diet: "non-veg", ings: ["turkey", "onion", "garlic", "parsley"], cal: 340, pro: 32, carb: 12, fat: 18, cuisine: "italian" },
  { name: "Lamb Chops", diet: "non-veg", ings: ["lamb", "rosemary", "garlic", "olive_oil"], cal: 520, pro: 36, carb: 4, fat: 42, cuisine: "mediterranean" },
  { name: "Chicken Alfredo", diet: "non-veg", ings: ["chicken", "pasta", "cream", "parmesan"], cal: 680, pro: 42, carb: 72, fat: 34, cuisine: "italian" },
  { name: "Mutton Rogan Josh", diet: "non-veg", ings: ["mutton", "yogurt", "onion", "spices"], cal: 620, pro: 38, carb: 14, fat: 48, cuisine: "indian" },
  { name: "Cod with Asparagus", diet: "non-veg", ings: ["cod", "asparagus", "lemon", "butter"], cal: 280, pro: 32, carb: 8, fat: 14, cuisine: "western" },
  { name: "Steak & Mashed Potato", diet: "non-veg", ings: ["beef", "potato", "butter", "garlic"], cal: 720, pro: 48, carb: 58, fat: 38, cuisine: "western" },
  { name: "Teriyaki Salmon", diet: "non-veg", ings: ["salmon", "soy_sauce", "sugar", "ginger"], cal: 480, pro: 36, carb: 32, fat: 22, cuisine: "asian" },
  { name: "BBQ Chicken Pizza", diet: "non-veg", ings: ["chicken", "dough", "bbq_sauce", "onion"], cal: 840, pro: 44, carb: 110, fat: 24, cuisine: "fusion" },
  { name: "Seafood Paella", diet: "non-veg", ings: ["shrimp", "mussel", "rice", "saffron"], cal: 560, pro: 34, carb: 78, fat: 12, cuisine: "mediterranean" },
  { name: "Butter Chicken", diet: "non-veg", ings: ["chicken", "tomato", "cream", "butter", "spices"], cal: 640, pro: 38, carb: 18, fat: 46, cuisine: "indian" },
];

// ── Cuisine emoji map ─────────────────────────────────────────
const CUISINE_ICON = {
  indian: "🍛",
  asian: "🥢",
  mediterranean: "🫒",
  western: "🍽️",
  italian: "🍝",
  mexican: "🌮",
  fusion: "🥗",
};

// ── Body-type feature weights (Updated for 4-class system) ─────
const BTYPE_BOOST = {
  underweight: { cuisines: ["indian", "western", "italian"], highPro: true, highCarb: true, lowCal: false },
  normal: { cuisines: ["western", "asian", "mediterranean"], highPro: true, highCarb: false, lowCal: false },
  overweight: { cuisines: ["mediterranean", "asian", "mexican"], highPro: true, highCarb: false, lowCal: true },
  obese: { cuisines: ["mediterranean", "asian", "fusion"], highPro: true, highCarb: false, lowCal: true },
};

/**
 * scoreMeals(diet, tdee, bodyType, topK)
 * JS implementation of the Random Forest scoring from meal_model.py.
 */
function scoreMeals(diet, tdee, bodyType, topK = 6) {
  console.log(`🤖 [Model] Ranking meals for phenotype: ${bodyType} (${diet})...`);
  const perMealTarget = tdee / 5; // assume ~5 meals/day
  const bt = BTYPE_BOOST[bodyType] || BTYPE_BOOST.normal;

  const scored = MEALS_DB
    .filter(m => m.diet === diet)
    .map(m => {
      // Start with a small random jitter to ensure different top picks for users with same TDEE
      let score = 85 + (Math.random() * 10);

      // Feature 1 — calorie proximity (highest weight)
      const calDiff = Math.abs(m.cal - perMealTarget);
      score -= calDiff / 6;

      // Feature 2 — cuisine preference per body type
      if (bt.cuisines.includes(m.cuisine)) score += 15;

      // Feature 3 — protein priority
      if (bt.highPro && m.pro >= 25) score += 12;
      if (bt.highPro && m.pro >= 35) score += 8;

      // Feature 4 — carb boost (for underweight gain or active lifestyle)
      if (bt.highCarb && m.carb >= 50) score += 12;

      // Feature 5 — low calorie preference (for loss goals)
      if (bt.lowCal && m.cal < 400) score += 15;
      if (bt.lowCal && m.cal > 550) score -= 25;

      // Specific penalties
      if ((bodyType === 'overweight' || bodyType === 'obese') && m.fat > 25) score -= 15;

      return { ...m, score: Math.round(Math.max(1, Math.min(99, score))) };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Expose to global scope (used by app.js) ───────────────────
window.MEALS_DB = MEALS_DB;
window.CUISINE_ICON = CUISINE_ICON;
window.scoreMeals = scoreMeals;