"use client";


import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";


import { 
  Settings, 
  Moon, 
  Sun, 

} from "lucide-react";
import { toast } from "sonner";


export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();


  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
  };



  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 mt-16">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Paramètres
          </h1>
          <p className="text-muted-foreground">Gérez vos préférences et paramètres de compte</p>
        </div>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l&apos;apparence de l&apos;application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle">Thème</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Clair
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Sombre
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

  

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Email</Label>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <Label>Membre depuis</Label>
                <p className="text-muted-foreground">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <Label>Dernière connexion</Label>
                <p className="text-muted-foreground">Aujourd&apos;hui</p>
              </div>
              <div>
                <Label>Statut du compte</Label>
                <p className="text-green-600 font-medium">Actif</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}