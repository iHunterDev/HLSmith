import { Router } from 'express';
import {
  getCollections,
  getCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
  uploadCollectionCover,
} from '../controllers/collectionController';
import { coverUpload, handleCoverMulterError } from '../middleware/coverUpload';

const router: Router = Router();

// Public: list collections
router.get('/', getCollections);
router.get('/:id', getCollectionDetail);
router.post('/', createCollection);
router.post('/cover', coverUpload.single('cover'), handleCoverMulterError, uploadCollectionCover);
router.patch('/:id', updateCollection);
router.delete('/:id', deleteCollection);

export default router;
