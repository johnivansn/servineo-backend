import { Request, Response } from 'express';
import { updateOfferState } from './offerUpdate.service';

export async function handleUpdateOffer(req: Request, res: Response) {
  try {
    const { offerId } = req.params;
    const { state } = req.body;

    if (!['active', 'inactive'].includes(state)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const updatedOffer = await updateOfferState(offerId, state as 'active' | 'inactive');
    res.status(200).json({ success: true, ...updatedOffer });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'ID inválido' || err.message === 'Oferta no encontrada') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
