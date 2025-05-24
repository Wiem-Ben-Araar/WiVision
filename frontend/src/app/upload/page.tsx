"use client";

import axios from 'axios';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from 'next/link';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/hooks/use-auth'; // Import the auth hook

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  
  // Use the auth hook to get current user information
  const { user } = useAuth();

  const handleFileUpload = async () => {
    if (!selectedFile || !projectId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      
      // Add user email to request if available
      if (user?.email) {
        formData.append('userEmail', user.email);
      }

      // Send the request with credentials
      const response = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true // Include cookies with the request
      });

      console.log('Upload successful:', response.data);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Upload error:', error);
      
      // Display more detailed error information
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          "Upload failed. Please check your connection.";
      
      setError(errorMessage);
      
      // Log authentication status
      if (error.response?.status === 401) {
        console.error('Authentication failed. Please log in again.');
        // You might want to redirect to login page
        // router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check for authentication when component loads
  useEffect(() => {
    if (!user) {
      console.log('No user is logged in');
      // Consider redirecting to login page if user is required
    }
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Upload an IFC File</CardTitle>
          <CardDescription className="text-center">
            Select an IFC file to upload for your project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="file">IFC File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".ifc"
              disabled={isLoading || !projectId || projectId === 'undefined'}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleFileUpload} 
            disabled={isLoading || !selectedFile || !projectId || projectId === 'undefined'} 
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href={projectId && projectId !== 'undefined' ? `/projects/${projectId}` : "/"}>
              Cancel
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UploadPage;