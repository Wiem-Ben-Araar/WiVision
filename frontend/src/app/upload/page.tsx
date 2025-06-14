"use client";

import axios from 'axios';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from 'next/link';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/hooks/use-auth';

interface UploadError {
  fileName: string;
  error: string;
}

// Separate component that uses useSearchParams
const UploadContent = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const { user } = useAuth();

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0 || !projectId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Ajouter tous les fichiers
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('projectId', projectId);
      
      if (user?.email) {
        formData.append('userEmail', user.email);
      }

      const response = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      console.log('Upload réussi:', response.data);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Erreur upload:', error);
      
      let errorMessage = "Échec de l'upload";
      
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        
        if (responseData?.errors && Array.isArray(responseData.errors)) {
          errorMessage = responseData.errors.map((e: UploadError) =>
            `${e.fileName}: ${e.error}`
          ).join(", ");
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.error) {
          errorMessage = responseData.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      console.log('Aucun utilisateur connecté');
    }
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Upload de fichiers IFC</CardTitle>
          <CardDescription className="text-center">
            Sélectionnez un ou plusieurs fichiers IFC à uploader pour votre projet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="files">Fichiers IFC</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={(e) => 
                setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])
              }
              accept=".ifc"
              disabled={isLoading || !projectId || projectId === 'undefined'}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleFileUpload} 
            disabled={isLoading || selectedFiles.length === 0 || !projectId || projectId === 'undefined'} 
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {`Upload en cours (${selectedFiles.length} fichier(s))...`}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {`Uploader ${selectedFiles.length} fichier(s)`}
              </>
            )}
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href={projectId && projectId !== 'undefined' ? `/projects/${projectId}` : "/"}>
              Annuler
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Loading fallback component
const UploadPageFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </CardContent>
    </Card>
  </div>
);

// Main component wrapped in Suspense
const UploadPage = () => {
  return (
    <Suspense fallback={<UploadPageFallback />}>
      <UploadContent />
    </Suspense>
  );
};

export default UploadPage;