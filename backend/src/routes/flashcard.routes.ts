import { Router } from 'express';
import { generateFlashcards, getFlashcardsByDocument } from '../controllers/flashcard.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
router.use(protect);
router.post('/:documentId', generateFlashcards);
router.get('/:documentId', getFlashcardsByDocument);

export default router;