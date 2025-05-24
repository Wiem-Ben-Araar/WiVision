import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Project from "../models/project";
import User from "../models/user";
import Invitation from "../models/invitation";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "../middleware/auth";
import { sendEmail } from "../config/email";

export const verifyInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("projectId", "name")
      .populate("invitedBy.id", "name email");

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invitation non valide ou expirée" });
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    res.json({
      invitation: {
        ...invitation.toObject(),
        projectName: project.name,
        invitedBy: invitation.invitedBy.id,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'invitation:", error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const acceptInvitation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { token } = req.params;
    const user = req.user;

    if (!user) return res.status(401).json({ message: "Non autorisé" });

    const invitation = await Invitation.findOne({ token }).populate(
      "projectId"
    );

    if (!invitation)
      return res.status(404).json({ message: "Invitation non trouvée" });

    const invitationEmail = invitation.email.toLowerCase().trim();
    const userEmail = user.email.toLowerCase().trim();

    if (userEmail !== invitationEmail) {
      return res.status(403).json({
        message: `Cette invitation est destinée à ${invitationEmail}`,
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message: `Invitation déjà ${invitation.status}`,
      });
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) return res.status(404).json({ message: "Projet non trouvé" });

    const isMember = project.members.some(
      (m: { userId?: Types.ObjectId }) =>
        m.userId?.toString() === user.userId.toString()
    );

    if (isMember) {
      invitation.status = "accepted";
      await invitation.save();
      return res.json({ projectId: project._id });
    }

    project.members.push({
      userId: new mongoose.Types.ObjectId(user.userId),
      role: "Member",
      joinedAt: new Date(),
    });

    await project.save();
    invitation.status = "accepted";
    await invitation.save();

    res.json({ projectId: project._id });
  } catch (error) {
    console.error("Erreur acceptInvitation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

export const declineInvitation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { token } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invitation non valide ou expirée" });
    }

    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Invitation déjà ${invitation.status}` });
    }

    if (user.email !== invitation.email) {
      return res
        .status(403)
        .json({ message: "Cette invitation est pour un autre email" });
    }

    invitation.status = "declined";
    await invitation.save();

    res.json({ message: "Invitation refusée" });
  } catch (error) {
    console.error("Erreur lors de la gestion de l'invitation:", error);
    res
      .status(500)
      .json({ error: "Erreur serveur, veuillez réessayer plus tard." });
  }
};

export const inviteMembers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { emails, message, projectName } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    if (!emails?.length) {
      return res.status(400).json({ error: "Au moins un email requis" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const isAllowed =
      project.createdBy.toString() === user.userId.toString() ||
      project.members.some(
        (m: { userId: mongoose.Types.ObjectId }) =>
          m.userId.toString() === user.userId.toString()
      );

    if (!isAllowed) {
      return res.status(403).json({ error: "Permissions insuffisantes" });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const invitations = [];

    for (const email of emails) {
      try {
        const existingInvitation = await Invitation.findOne({
          projectId: id,
          email: email.toLowerCase(),
          status: "pending",
        });

        if (existingInvitation) {
          invitations.push(existingInvitation);
          continue;
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
          const isMember = project.members.some(
            (m: { userId: mongoose.Types.ObjectId }) =>
              m.userId?.toString() === existingUser._id?.toString()
          );

          if (isMember) {
            console.log(`Utilisateur ${email} déjà membre`);
            continue;
          }
        }

        const token = uuidv4();

        const newInvitation = new Invitation({
          projectId: id,
          email: email.toLowerCase(),
          token,
          status: "pending",
          invitedBy: {
            id: user.userId,
            name: (user as any).name || "Inviteur",
          },

          userExists: !!existingUser,
          userId: existingUser?._id,
        });

        await newInvitation.save();
        invitations.push(newInvitation);
        const signupUrl = `${baseUrl}/signup?invitationToken=${token}`;
        const acceptUrl = `${baseUrl}/invitation/${token}`;

        const emailContent = existingUser
          ? `<p style="font-size: 16px;">👉 <a href="${acceptUrl}" style="color: #005CA9; text-decoration: none;">Cliquez ici pour rejoindre le projet</a></p>`
          : `<p style="font-size: 16px;">📝 <a href="${signupUrl}" style="color: #005CA9; text-decoration: none;">Créez un compte pour nous rejoindre</a></p>`;

        const textContent = existingUser
          ? `Acceptez l'invitation ici : ${acceptUrl}`
          : `Inscrivez-vous ici : ${signupUrl}`;

        await sendEmail({
          to: email,
          subject: `Invitation à rejoindre le projet ${
            project.name || projectName
          }`,
          text: `${
            message || "Vous êtes invité(e) à rejoindre un projet."
          }\n\n${textContent}\n\n— L'équipe WiVision`,
          html: `
              <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                <p style="font-size: 16px; color: #005CA9;"><strong>${
                  message || "Vous êtes invité(e) à rejoindre un projet !"
                }</strong></p>
                ${emailContent}
                <p style="font-size: 14px; margin-top: 20px;">— L'équipe WiVision</p>
              </div>
            `,
        });
      } catch (error) {
        console.error(`Erreur avec ${email}:`, error);
      }
    }

    res.json({
      success: true,
      invitations: invitations.map((i) => ({
        id: i._id,
        email: i.email,
        status: i.status,
      })),
    });
  } catch (error) {
    console.error("Erreur de la base de données:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

export const checkInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("projectId", "name");

    if (!invitation) {
      return res.status(404).json({
        valid: false,
        message: "Invitation invalide ou expirée",
      });
    }

    res.json({
      valid: true,
      email: invitation.email,
      projectName: invitation.projectId.name,
      userExists: invitation.userExists,
    });
  } catch (error) {
    console.error("Erreur de la base de données:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};
