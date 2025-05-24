import mongoose from "mongoose";

// Configuration optimisée pour les connexions MongoDB
const mongooseOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout après 5 secondes
  socketTimeoutMS: 45000, // Fermer les sockets inactifs après 45s
  family: 4, // Forcer IPv4 (résout certains problèmes DNS)
};

const connectToDatabase = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("MONGO_URI non défini dans les variables d'environnement");
    }

    // Validation basique de l'URI
    if (!mongoURI.startsWith("mongodb+srv://")) {
      throw new Error("Format d'URI MongoDB invalide - doit commencer par mongodb+srv://");
    }

    await mongoose.connect(mongoURI, mongooseOptions);
    
    // Événements de connexion
    mongoose.connection.on("connected", () => {
      console.log(`Connecté à MongoDB (${mongoose.connection.host})`);
    });

    mongoose.connection.on("error", (err) => {
      console.error("Erreur de connexion MongoDB:", err);
    });

  } catch (error) {
    console.error("\n--- ERREUR CRITIQUE DE CONNEXION MONGODB ---");
    
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack?.split("\n")[1]}`);
    }

    console.error("\nSolutions possibles :");
    console.log("1. Vérifiez votre connexion internet");
    console.log("2. Vérifiez les règles de réseau dans MongoDB Atlas");
    console.log("3. Testez votre URI avec mongosh en ligne de commande");
    console.log("4. Vérifiez les logs MongoDB Atlas\n");

    process.exit(1); // Arrêt propre de l'application
  }
};

export default connectToDatabase;