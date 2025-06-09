"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, UserPlus, Mail, Shield, Clock, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Alert } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Textarea } from "@/components/ui/textarea"
import axios from "axios"
import { motion } from "framer-motion"

interface Member {
  id: string
  name?: string
  email?: string
  role?: string
  image?: string
}

interface ProjectMembersProps {
  projectId: string
  projectName: string
  userRole: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur";
  onMemberInvite?: (email: string) => void
}

export default function ProjectMembers({ projectId, projectName, userRole, onMemberInvite }: ProjectMembersProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [emails, setEmails] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingInvites, setSendingInvites] = useState(false)
const [selectedRole, setSelectedRole] = useState("BIM Modeleur");
  // Vérifier si l'utilisateur peut inviter des membres
  // On vérifie aussi le rôle dans les membres du projet pour l'utilisateur actuel
  const currentUserMember = members.find(member => member.email === user?.email);
  const actualUserRole = currentUserMember?.role || userRole;
  const canInviteMembers = actualUserRole === "BIM Manager" || userRole === "BIM Manager";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL


  // Listen for external trigger to open invite dialog
  useEffect(() => {
    if (!canInviteMembers) return;
    
    const inviteTrigger = document.getElementById("invite-member-trigger")
    if (inviteTrigger) {
      const handleClick = () => setInviteDialogOpen(true)
      inviteTrigger.addEventListener("click", handleClick)
      return () => inviteTrigger.removeEventListener("click", handleClick)
    }
  }, [canInviteMembers])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, invitationsRes] = await Promise.all([
          axios.get(`${apiUrl}/projects/${projectId}/members`, {
            withCredentials: true
          }),
          axios.get(`${apiUrl}/projects/${projectId}/invitations`, {
            withCredentials: true
          }),
        ])

        setMembers(membersRes.data.members)
        setInvitations(invitationsRes.data.invitations)
      } catch (error: any) {
        setError(error.response?.data?.error || "Échec du chargement des données")
      } finally {
        setIsLoading(false)
      }
    }

    projectId && fetchData()
  }, [projectId])

  const handleInvite = async () => {
    setSendingInvites(true)
    const emailList = emails
      .split(/[,;\n]/)
      .map((email) => email.trim())
      .filter((email) => email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))

    if (!emailList.length) {
      toast.error("Veuillez entrer au moins un email valide")
      setSendingInvites(false)
      return
    }

    try {
      const { data } = await axios.post(`${apiUrl}/projects/${projectId}/invite`, {
        emails: emailList,
        message,
        projectName,
        role: selectedRole
      }, {
        withCredentials: true
      })

      setInvitations((prev) => [...prev, ...data.invitations])
      setInviteDialogOpen(false)
      setEmails("")
      setMessage("")
      toast.success(`${emailList.length} invitation(s) envoyée(s)`)

      // Notify parent component about the invite
      if (onMemberInvite) {
        emailList.forEach((email) => onMemberInvite(email))
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Échec de l'envoi des invitations")
    } finally {
      setSendingInvites(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#005CA9] dark:text-blue-400 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres du projet
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gestion des collaborateurs pour <span className="font-semibold">{projectName}</span>
          </p>
        </div>

        {/* Bouton d'invitation - vérifie le rôle réel dans les membres */}
        {canInviteMembers && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2">
                <UserPlus className="h-4 w-4" />
                Inviter des membres
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#005CA9] dark:text-blue-400">
                  Inviter des collaborateurs
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  Envoyez des invitations par email
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="emails" className="text-gray-700 dark:text-gray-300 font-medium">
                    Emails des destinataires
                  </Label>
                  <Textarea
                    id="emails"
                    placeholder="exemple@entreprise.com, collaborateur@partenaire.com..."
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    className="min-h-[100px] resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Séparer les adresses par des virgules ou retours à la ligne
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-gray-700 dark:text-gray-300 font-medium">
                    Message personnalisé (optionnel)
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Bonjour, je vous invite à rejoindre notre projet..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[80px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
<div className="space-y-2">
  <Label htmlFor="role" className="text-gray-700 dark:text-gray-300 font-medium">
    Rôle du membre
  </Label>
  <select
    id="role"
    value={selectedRole}
    onChange={(e) => setSelectedRole(e.target.value)}
    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
  > 
    <option value="BIM Modeleur">BIM Modeleur (visualisation seule)</option>
    <option value="BIM Coordinateur">BIM Coordinateur</option>
    <option value="BIM Manager">BIM Manager</option>
  </select>
</div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    disabled={sendingInvites}
                    className="dark:border-gray-700 dark:text-gray-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={sendingInvites || !emails.trim()}
                    className="bg-[#005CA9] hover:bg-[#004A87] dark:bg-blue-600 dark:hover:bg-blue-700 gap-2"
                  >
                    {sendingInvites ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Contenu principal */}
      {error && (
        <Alert className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 mb-4">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#005CA9] dark:text-blue-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section Membres */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="rounded-lg border-gray-200 dark:border-gray-800 dark:bg-gray-900">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-semibold text-[#005CA9] dark:text-blue-400 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Membres actifs ({members.length})
                </h2>
              </div>
              <div className="p-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {members.length > 0 ? (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <Avatar className="h-10 w-10">
                        {member.image && (
                          <AvatarImage
                            src={member.image || "/placeholder.svg"}
                            alt={member.name || "Utilisateur"}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-[#005CA9]/10 text-[#005CA9] dark:bg-blue-900/30 dark:text-blue-300">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {member.name || `Utilisateur ${member.id.substring(0, 5)}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.email || "Email non disponible"}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[#005CA9] dark:text-blue-300 font-normal dark:border-blue-800"
                        >
                          {member.role || "Membre"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-4 text-center text-gray-500 dark:text-gray-400">
                    Aucun membre actif
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Section Invitations - visible pour tous mais avec contexte */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="rounded-lg border-gray-200 dark:border-gray-800 dark:bg-gray-900">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-semibold text-[#005CA9] dark:text-blue-400 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Invitations en attente ({invitations.length})
                </h2>
              </div>
              <div className="p-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {invitations.length > 0 ? (
                  invitations.map((invitation) => (
                    <div
                      key={invitation.id || invitation._id}
                      className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-[#005CA9]/10 dark:bg-blue-900/30 rounded-full">
                        <Mail className="h-5 w-5 text-[#005CA9] dark:text-blue-300" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{invitation.email}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {invitation.createdAt
                            ? new Date(invitation.createdAt).toLocaleDateString("fr-FR")
                            : "À l'instant"}
                        </p>

                        <Badge
                          variant="outline"
                          className={`mt-1 font-normal ${
                            invitation.status === "pending"
                              ? "text-amber-600 dark:text-amber-400 dark:border-amber-800"
                              : "text-green-600 dark:text-green-400 dark:border-green-800"
                          }`}
                        >
                          {invitation.status === "pending" ? "En attente" : "Acceptée"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-4 text-center text-gray-500 dark:text-gray-400">
                    Aucune invitation en attente
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}