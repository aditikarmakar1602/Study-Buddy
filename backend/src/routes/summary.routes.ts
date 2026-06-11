import { Router } from 'express';
import { generateSummary, getSummaryByDocument } from '../controllers/summary.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
router.use(protect);
router.post('/:documentId', generateSummary);
router.get('/:documentId', getSummaryByDocument);

export default router;