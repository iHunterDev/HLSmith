import { Router } from 'express';
import {
  getCollections,
  getCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collectionController';

const router: Router = Router();

// Public: list collections
router.get('/', getCollections);
router.get('/:id', getCollectionDetail);
router.post('/', createCollection);
router.patch('/:id', updateCollection);
router.delete('/:id', deleteCollection);

export default router;
