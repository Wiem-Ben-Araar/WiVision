"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";

export default function InvitationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const { data } = await axios.get(`/api/invitations/${token}/verify`);
        setInvitationDetails(data.invitation);
        
        if (user) {
          // Normalisation des emails
          const userEmail = user.email?.toLowerCase().trim();
          const invitationEmail = data.invitation.email.toLowerCase().trim();
          
          if (userEmail !== invitationEmail) {
            setError(`Cette invitation est destinée à ${data.invitation.email}`);
            sessionStorage.removeItem("pendingInvitation");
          }
        }
      } catch (error: any) {
        setError(error.response?.data?.message || "Invitation invalide ou expirée");
      }
    };
  
    if (token) verifyInvitation();
  }, [token, user]);
  useEffect(() => {
    const handlePostAuth = async () => {
      const pendingToken = sessionStorage.getItem("pendingInvitation");
      if (user && pendingToken) {
        try {
          const { data } = await axios.post(`/api/invitations/${pendingToken}/accept`);
          sessionStorage.removeItem("pendingInvitation");
          router.push(`/projects/${data.projectId}`);
        } catch (error) {
          setError("Échec de l'acceptation automatique");
        }
      }
    };
  
    if (!loading) handlePostAuth();
  }, [user, loading]);
  const handleInvitationAction = async (action: 'accept' | 'decline') => {
    if (!user && action === 'accept') {
      sessionStorage.setItem("pendingInvitation", token);
      router.push(`/sign-in?callbackUrl=/projects`);
      return;
    }

    setIsProcessing(true);
    try {
      const { data } = await axios.post(`/api/invitations/${token}/${action}`);
      
      if (action === 'accept') {
        toast.success("Invitation acceptée avec succès");
        router.push(`/projects/${data.projectId}`);
      } else {
        toast.success("Invitation refusée");
        router.push("/");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Une erreur est survenue";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Erreur d'invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg">{error}</p>
            <p className="text-muted-foreground mt-2">Cette invitation peut être invalide ou expirée.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Retour à l'accueil</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Invitation au projet</CardTitle>
          <CardDescription className="text-center">Vous avez été invité à rejoindre un projet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitationDetails && (
            <>
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Invitation à collaborer sur un projet</p>
              </div>
              <div className="space-y-2 bg-muted p-4 rounded-md">
                <div>
                  <span className="font-medium">Projet : </span>
                  <span>{invitationDetails.projectName || "Projet BIM"}</span>
                </div>
                <div>
                  <span className="font-medium">Invité par : </span>
                  <span>
        {invitationDetails.invitedBy?.name || 
         invitationDetails.invitedBy?.email || 
         "Équipe du projet"}
      </span>
                </div>
                <div>
                  <span className="font-medium">Email : </span>
                  <span>{invitationDetails.email}</span>
                </div>
              </div>
              {!user && (
                <p className="text-sm text-muted-foreground">
                  Vous devez vous connecter pour accepter cette invitation.
                </p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => handleInvitationAction('decline')} 
            disabled={isProcessing}
          >
            Refuser
          </Button>
          <Button 
            onClick={() => handleInvitationAction('accept')} 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : !user ? (
              "Se connecter et accepter"
            ) : (
              "Accepter l'invitation"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}