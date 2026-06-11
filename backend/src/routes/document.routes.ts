import { Router } from 'express';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/document.controller';
import { protect } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(protect); // Require JWT for all document routes

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);

export default router;