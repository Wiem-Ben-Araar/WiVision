"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";

interface InvitationDetails {
  projectName?: string;
  email: string;
  invitedBy?: {
    name?: string;
    email?: string;
  };
}

interface AxiosErrorResponse {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

export default function InvitationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get(`${apiUrl}/invitations/${token}/verify`, {
          withCredentials: true
        });
        setInvitationDetails(data.invitation);
        
        if (user) {
          const userEmail = user.email?.toLowerCase().trim() || '';
          const invitationEmail = data.invitation.email.toLowerCase().trim();
          
          if (userEmail !== invitationEmail) {
            setError(`Cette invitation est destinée à ${data.invitation.email}. Veuillez vous connecter avec ce compte.`);
            sessionStorage.removeItem("pendingInvitation");
          }
        }
      } catch (err) {
        const error = err as AxiosErrorResponse;
        console.error('Erreur lors de la vérification:', error);
        if (error.response?.status === 401) {
          try {
            const { data } = await axios.get(`${apiUrl}/invitations/${token}/verify`);
            setInvitationDetails(data.invitation);
          } catch (publicError) {
            const publicErr = publicError as AxiosErrorResponse;
            setError(publicErr.response?.data?.message || "Invitation invalide ou expirée");
          }
        } else {
          setError(error.response?.data?.message || "Invitation invalide ou expirée");
        }
      } finally {
        setIsLoading(false);
      }
    };
  
    if (token) verifyInvitation();
  }, [token, user, apiUrl]);

  useEffect(() => {
    const handlePostAuth = async () => {
      const pendingToken = sessionStorage.getItem("pendingInvitation");
      if (user && pendingToken) {
        try {
          const { data } = await axios.post(
            `${apiUrl}/invitations/${pendingToken}/accept`,
            {},
            { withCredentials: true }
          );
          sessionStorage.removeItem("pendingInvitation");
          toast.success("Invitation acceptée avec succès");
          router.push(`/projects/${data.projectId}`);
        } catch (err) {
          const error = err as AxiosErrorResponse;
          console.error('Erreur acceptation auto:', error);
          setError("Échec de l'acceptation automatique");
        }
      }
    };
  
    if (!loading) handlePostAuth();
  }, [user, loading, apiUrl, router]);

  const handleInvitationAction = async (action: 'accept' | 'decline') => {
    if (!user && action === 'accept') {
      sessionStorage.setItem("pendingInvitation", token);
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(`/invitations/${token}`)}`);
      return;
    }

    setIsProcessing(true);
    try {
      const { data } = await axios.post(
        `${apiUrl}/invitations/${token}/${action}`, 
        {},
        { withCredentials: true }
      );
      
      if (action === 'accept') {
        toast.success("Invitation acceptée avec succès");
        router.push(`/projects/${data.projectId}`);
      } else {
        toast.success("Invitation refusée");
        router.push("/");
      }
    } catch (err) {
      const error = err as AxiosErrorResponse;
      console.error(`Erreur ${action}:`, error);
      const errorMessage = error.response?.data?.message || "Une erreur est survenue";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || isLoading || isProcessing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Traitement en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Erreur d&apos;invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg">{error}</p>
            <p className="text-muted-foreground mt-2">Cette invitation peut être invalide ou expir&eacute;e.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Retour à l&apos;accueil</Button>
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
              </div>
              
              {user && invitationDetails?.email?.toLowerCase() !== user.email?.toLowerCase() && (
                <div className="text-red-500 p-3 bg-red-50 rounded-md">
                  <p>Cette invitation est destinée à {invitationDetails.email}</p>
                  <Button 
                    variant="link"
                    onClick={() => {
                      sessionStorage.removeItem("pendingInvitation");
                      router.push("/logout");
                    }}
                  >
                    Changer de compte
                  </Button>
                </div>
              )}
              
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
            disabled={isProcessing || !!(user && invitationDetails?.email?.toLowerCase() !== user.email?.toLowerCase())}
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