// Startup diagnostic check
console.log("🔍 Running startup diagnostics...");

// 1. Check environment variables
console.log("\n1️⃣ Environment Variables:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("   PORT:", process.env.PORT || "not set");
console.log("   DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
console.log("   SUPABASE_DATABASE_URL:", process.env.SUPABASE_DATABASE_URL ? "✅ Set" : "❌ Not set");
console.log("   JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Not set");
console.log("   OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Not set");

// 2. Check database connection
console.log("\n2️⃣ Database Connection:");
try {
  const { isDatabaseInitialized, getDatabaseError } = require("./db-check");
  if (isDatabaseInitialized()) {
    console.log("   ✅ Database initialized");
  } else {
    console.log("   ❌ Database NOT initialized");
    const error = getDatabaseError();
    console.log("   Error:", error.error);
    console.log("   Details:", JSON.stringify(error.details, null, 2));
  }
} catch (error) {
  console.log("   ❌ Failed to check database:", (error as any).message);
}

// 3. Check if we can import critical modules
console.log("\n3️⃣ Module Imports:");
const modules = [
  { name: "db", path: "./db" },
  { name: "storage", path: "./storage" },
  { name: "simpleAuth", path: "./simpleAuth" },
  { name: "routes", path: "./routes" }
];

for (const mod of modules) {
  try {
    require(mod.path);
    console.log(`   ✅ ${mod.name} loaded successfully`);
  } catch (error) {
    console.log(`   ❌ ${mod.name} failed:`, (error as any).message);
  }
}

console.log("\n✅ Startup diagnostics complete");