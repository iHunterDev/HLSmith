import { Router } from 'express';
import { getCollections, getCollectionDetail } from '../controllers/collectionController';

const router: Router = Router();

// Public: list collections
router.get('/', getCollections);
router.get('/:id', getCollectionDetail);

export default router;
