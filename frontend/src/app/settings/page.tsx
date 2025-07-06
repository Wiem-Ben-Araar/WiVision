"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  Shield, 
  Trash2, 
  Download,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectVisibility, setProjectVisibility] = useState(true);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
  };

  const handleNotificationToggle = (type: string, value: boolean) => {
    if (type === 'general') {
      setNotifications(value);
      toast.success(`Notifications ${value ? 'activées' : 'désactivées'}`);
    } else if (type === 'email') {
      setEmailNotifications(value);
      toast.success(`Notifications email ${value ? 'activées' : 'désactivées'}`);
    }
  };

  const handleExportData = () => {
    toast.success("Export des données en cours...");
    // Ici vous pouvez ajouter la logique d'export
  };

  const handleDeleteAccount = () => {
    toast.error("Suppression du compte en cours...");
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

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Contrôlez quand et comment vous recevez les notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications">Notifications générales</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des notifications pour les mises à jour importantes
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={(value) => handleNotificationToggle('general', value)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notifications">Notifications email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des notifications par email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(value) => handleNotificationToggle('email', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confidentialité
            </CardTitle>
            <CardDescription>
              Contrôlez qui peut voir vos informations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="project-visibility">Projets publics</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux autres de voir vos projets
                </p>
              </div>
              <Switch
                id="project-visibility"
                checked={projectVisibility}
                onCheckedChange={setProjectVisibility}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Gestion des données
            </CardTitle>
            <CardDescription>
              Exportez ou supprimez vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Exporter mes données</Label>
                <p className="text-sm text-muted-foreground">
                  Téléchargez une copie de toutes vos données
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Exporter
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-red-600">Supprimer mon compte</Label>
                <p className="text-sm text-muted-foreground">
                  Supprimez définitivement votre compte et toutes vos données
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Êtes-vous absolument sûr ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Cela supprimera définitivement votre compte
                      et toutes vos données de nos serveurs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Oui, supprimer mon compte
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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