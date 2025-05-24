import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { createProject, deleteProject, getProjectById, getProjectFiles, getProjectMembers, getProjects, getUserRole, updateProject,  getProjectInvitations} from '../controllers/projectController';
import { inviteMembers } from '../controllers/invitationController';

const router = express.Router();

// Routes pour les projets
router.post('/', authenticate, createProject);
router.get('/', authenticate, getProjects);

router.get('/:id', authenticate, getProjectById);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);
router.get('/:id/members',authenticate, getProjectMembers);
router.get('/:id/role',authenticate, getUserRole);
router.get('/:id/files', authenticate, getProjectFiles);
router.get('/:id/invitations', authenticate, getProjectInvitations);
router.post('/:id/invite', authenticate, inviteMembers);

export default router;