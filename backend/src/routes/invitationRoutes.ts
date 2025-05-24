// src/routes/invitationRoutes.ts
import express from 'express';
import { 
  acceptInvitation, 
  declineInvitation, 
  verifyInvitation 
} from '../controllers/invitationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/:token/accept', authenticate, acceptInvitation);
router.post('/:token/decline', authenticate, declineInvitation);
router.get('/:token/verify',authenticate, verifyInvitation);

export default router;