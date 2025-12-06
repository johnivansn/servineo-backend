import { Types } from 'mongoose';
import { FAQModel, IFAQ } from '../models/faq.model';

export async function getAllFAQs(): Promise<IFAQ[]> {
  const faqs = await FAQModel.find({ activo: true }).sort({ orden: 1, createdAt: 1 }).lean().exec();

  return faqs as unknown as IFAQ[];
}

export async function searchFAQs(query: string): Promise<IFAQ[]> {
  if (!query || !query.trim()) {
    return getAllFAQs();
  }

  const q = query.trim();

  const faqs = await FAQModel.find({
    activo: true,
    $or: [
      { pregunta: { $regex: q, $options: 'i' } },
      { respuesta: { $regex: q, $options: 'i' } },
      { palabrasClave: { $regex: q, $options: 'i' } },
    ],
  })
    .sort({ orden: 1, createdAt: 1 })
    .lean()
    .exec();

  return faqs as unknown as IFAQ[];
}

export async function getFAQById(id: string | Types.ObjectId): Promise<IFAQ | null> {
  const _id = typeof id === 'string' ? new Types.ObjectId(id) : id;

  const faq = await FAQModel.findById(_id).lean().exec();

  return faq as unknown as IFAQ | null;
}
