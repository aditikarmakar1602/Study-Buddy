import { Router } from 'express';
import { generateSmartNotes, getSmartNotesByDocument } from '../controllers/smartNote.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
router.use(protect);
router.post('/:documentId', generateSmartNotes);
router.get('/:documentId', getSmartNotesByDocument);

export default router;