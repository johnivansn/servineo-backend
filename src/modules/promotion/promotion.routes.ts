import { Router } from 'express';
import * as controller from './promotion.controller';

const router = Router();

router.get('/', controller.getAllPromotions);
router.get('/:id', controller.getPromotionById);
router.post('/', controller.createPromotion);
router.put('/:id', controller.updatePromotion);
router.delete('/:id', controller.deletePromotion);
router.get('/offer/:offerId', controller.getPromotionsByOfferId);
router.patch('/:id', controller.updatePromotion);

export default router;
