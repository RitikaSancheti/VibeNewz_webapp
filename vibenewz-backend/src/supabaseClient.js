// ============================================================
// supabaseClient.js
//
// One shared connection to your Supabase (Postgres) database.
// Every other file that needs the database imports this.
//
// We use the SECRET (service role) key here, not the public "anon" key,
// because this code only ever runs on YOUR server, never in the app on
// someone's phone. The secret key can read/write everything, so it must
// never be shipped inside the React Native app.
// ============================================================

const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Did you create a .env file? " +
      "See .env.example for what's needed."
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = supabase;
