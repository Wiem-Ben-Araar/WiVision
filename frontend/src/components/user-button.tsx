"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const UserButton = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();

  if (!user) {
    return (
      <Button onClick={() => router.push("/sign-in")} size="sm">
        Connexion
      </Button>
    );
  }

  const handleLogout = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      
      setUser(null);
      toast.success("Déconnecté avec succès");
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error); 
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setLoading(false);
    }
  };

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";
    console.log("User:", user);
    console.log("image",user.image)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
   <Avatar className="cursor-pointer">
  <AvatarImage src={user.image} alt={user.name} className="object-cover" />
  <AvatarFallback>{userInitials}</AvatarFallback>
</Avatar>

      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex flex-col space-y-1 p-2">
          {user.name && (
            <p className="font-medium text-sm">{user.name}</p>
          )}
          {user.email && (
            <p className="text-xs text-muted-foreground truncate w-40">
              {user.email}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="cursor-pointer"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loading}
          className="cursor-pointer text-red-600"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {loading ? "Déconnexion..." : "Déconnexion"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};