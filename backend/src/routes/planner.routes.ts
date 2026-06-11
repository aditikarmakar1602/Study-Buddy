import { Router } from 'express';
import { createStudyPlan, getLatestStudyPlan } from '../controllers/planner.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
router.use(protect);
router.post('/', createStudyPlan);
router.get('/latest', getLatestStudyPlan);

export default router;