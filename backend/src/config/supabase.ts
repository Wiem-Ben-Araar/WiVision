import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL et SUPABASE_ANON_KEY requis !")
  console.error("📝 Va sur supabase.com créer un compte GRATUIT (pas de carte !)")
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test connexion
setTimeout(async () => {
  try {
    console.log("🔄 Test Supabase...")
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("❌ Erreur Supabase:", error.message)
    } else {
      console.log("✅ Supabase connecté !")

      // Créer bucket si pas existant
      if (!data?.find((b) => b.name === "ifc-files")) {
        const { error: createError } = await supabase.storage.createBucket("ifc-files", {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        })

        if (!createError) {
          console.log("✅ Bucket ifc-files créé !")
        }
      }
    }
  } catch (err: any) {
    console.error("❌ Erreur test:", err.message)
  }
}, 3000)

export { supabase }
export default supabase
