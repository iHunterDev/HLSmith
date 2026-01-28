import { Router } from 'express';
import {
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
} from '../controllers/collectionItemController';

const router: Router = Router();

router.post('/', createCollectionItem);
router.patch('/:id', updateCollectionItem);
router.delete('/:id', deleteCollectionItem);

export default router;
