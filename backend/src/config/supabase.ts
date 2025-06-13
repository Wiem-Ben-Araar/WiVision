import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL et SUPABASE_ANON_KEY requis !")
  console.error("📝 Va sur supabase.com créer un compte GRATUIT (pas de carte !)")
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ CRÉATION AUTOMATIQUE DU BUCKET AU DÉMARRAGE
const initializeStorage = async (): Promise<void> => {
  try {
    console.log("🔄 Initialisation Supabase Storage...")

    // Vérifier les buckets existants
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("❌ Erreur liste buckets:", listError.message)
      return
    }

    console.log("✅ Connexion Supabase réussie !")
    console.log(`📦 Buckets existants: ${buckets?.map((b) => b.name).join(", ") || "aucun"}`)

    // Vérifier si le bucket ifc-files existe
    const ifcBucket = buckets?.find((b) => b.name === "ifc-files")

    if (!ifcBucket) {
      console.log("🔄 Création du bucket ifc-files...")

      const { data: newBucket, error: createError } = await supabase.storage.createBucket("ifc-files", {
        public: false, // Bucket privé pour sécurité
        allowedMimeTypes: ["application/octet-stream", "application/ifc"],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB max par fichier
      })

      if (createError) {
        console.error("❌ Erreur création bucket:", createError.message)
        console.error("🔧 Solution: Cr��ez manuellement le bucket dans Supabase Console")
        console.error("   1. Allez sur https://supabase.com/dashboard")
        console.error("   2. Sélectionnez votre projet")
        console.error("   3. Allez dans Storage")
        console.error("   4. Cliquez 'New bucket'")
        console.error("   5. Nom: ifc-files")
        console.error("   6. Public: false")
      } else {
        console.log("✅ Bucket ifc-files créé avec succès !")

        // Test d'upload pour vérifier que tout fonctionne
        const testPath = `test/init-test-${Date.now()}.txt`
        const testData = new TextEncoder().encode("Test initialisation")

        const { error: testError } = await supabase.storage.from("ifc-files").upload(testPath, testData)

        if (testError) {
          console.error("❌ Test upload échoué:", testError.message)
        } else {
          console.log("✅ Test upload réussi !")

          // Nettoyer le fichier test
          await supabase.storage.from("ifc-files").remove([testPath])
          console.log("🧹 Fichier test nettoyé")
        }
      }
    } else {
      console.log("✅ Bucket ifc-files déjà existant")
    }
  } catch (err: any) {
    console.error("❌ Erreur initialisation Supabase:", err.message)
  }
}

// Exécuter l'initialisation après démarrage du serveur
setTimeout(initializeStorage, 2000)

export { supabase }
export default supabase