import { ObjectId } from 'mongodb';
import { connectDB } from '../../config/db/mongoClient';

export async function updateOfferState(offerId: string, state: 'active' | 'inactive') {
  if (!ObjectId.isValid(offerId)) throw new Error('ID inválido');

  const db = await connectDB();
  const result = await db
    .collection('offers')
    .updateOne({ _id: new ObjectId(offerId) }, { $set: { state } });

  if (result.matchedCount === 0) throw new Error('Oferta no encontrada');

  return { offerId, newState: state };
}
