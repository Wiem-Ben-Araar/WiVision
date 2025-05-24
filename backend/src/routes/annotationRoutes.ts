import { Router } from 'express';
import { 
  getAnnotations, 
  createAnnotation, 
  updateAnnotation,
  deleteAllAnnotations, 
   
} from '../controllers/annotationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAnnotations);
router.post('/', authenticate, createAnnotation);
router.put('/', authenticate, updateAnnotation);
router.delete('/all', authenticate, deleteAllAnnotations);

export default router;