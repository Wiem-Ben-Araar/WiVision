import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL et SUPABASE_ANON_KEY requis !")
  console.error("📝 Va sur supabase.com créer un compte GRATUIT (pas de carte !)")
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Important pour les environnements serveur
  },
})

// Test connexion et initialisation améliorés
const initSupabase = async () => {
  try {
    console.log("🔄 Test Supabase...")
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("❌ Erreur Supabase:", error.message)
      return false
    }

    console.log("✅ Supabase connecté !")
    console.log(`📊 Buckets trouvés: ${data?.length || 0}`)

    if (data) {
      // Afficher tous les buckets pour debug
      data.forEach((bucket) => {
        console.log(`📦 Bucket: ${bucket.name} (${bucket.public ? "public" : "privé"})`)
      })
    }

    // Vérifier si le bucket ifc-files existe
    const ifcBucket = data?.find((b) => b.name === "ifc-files")

    if (!ifcBucket) {
      console.log("⚠️ Bucket 'ifc-files' non trouvé, création...")

      try {
        const { data: newBucket, error: createError } = await supabase.storage.createBucket("ifc-files", {
          public: false,
          fileSizeLimit: 100 * 1024 * 1024, // 100MB
        })

        if (createError) {
          console.error("❌ Erreur création bucket:", createError.message)
          console.log("📋 SOLUTION: Créez manuellement le bucket dans Supabase Console")
          return false
        }

        console.log("✅ Bucket 'ifc-files' créé avec succès!")
        return true
      } catch (createErr: any) {
        console.error("❌ Exception création bucket:", createErr.message)
        return false
      }
    } else {
      console.log("✅ Bucket 'ifc-files' déjà existant")
      return true
    }
  } catch (err: any) {
    console.error("❌ Erreur test Supabase:", err.message)
    return false
  }
}

// Exécuter l'initialisation après démarrage du serveur
setTimeout(() => {
  initSupabase().then((success) => {
    if (success) {
      console.log("✅ Supabase Storage prêt pour les uploads!")
    } else {
      console.error("⚠️ Supabase Storage non configuré correctement")
    }
  })
}, 3000)

export { supabase, initSupabase }
export default supabase
