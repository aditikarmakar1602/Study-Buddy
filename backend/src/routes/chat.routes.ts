import { Router } from 'express';
import { chatWithDocument, getChatHistory, clearChatHistory } from '../controllers/chat.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // Require JWT for chat
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);
router.post('/', chatWithDocument);

export default router;