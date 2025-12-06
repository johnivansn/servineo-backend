// src/controllers/portfolio.controller.ts
import { Request, Response } from 'express';
import { Portfolio } from '../models/portfolio.model';
import { bucket } from '../config/firebase.config';

/**
 * 🔹 Crear item de portafolio (imagen o video)
 * SIN autenticación obligatoria mientras estás en desarrollo.
 */
export const createPortfolioItem = async (req: Request, res: Response) => {
  try {
    // 🔓 Antes validaba req.user (esto causaba el 403)
    // Ahora lo quitamos temporalmente para que funcione sin token.
    // const user = (req as any).user;

    // 🔹 Determinamos fixerId desde:
    // 1) req.user (si en el futuro activas JWT)
    // 2) req.body.fixerId enviado desde el front
    // 3) "fixer1" como valor de prueba
    const fixerId = (req as any).user?._id || req.body.fixerId || 'fixer1';

    let url = '';

    // 🔹 Si viene un archivo (imagen) lo subimos a Firebase
    if ((req as any).file) {
      const file = (req as any).file;
      const fileName = `portfolio/${Date.now()}-${Math.round(Math.random() * 1000)}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      await new Promise<void>((resolve, reject) => {
        blobStream.on('error', (error: any) => reject(error));
        blobStream.on('finish', async () => {
          await fileUpload.makePublic();
          url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          resolve();
        });
        blobStream.end((req as any).file?.buffer);
      });
    }

    // 🔹 Datos que se guardarán en MongoDB
    const portfolioData = {
      ...req.body,
      fixerId,
      url: url || req.body.url, // si no hay archivo, usa la URL del body
    };

    const portfolioItem = new Portfolio(portfolioData);
    await portfolioItem.save();

    res.status(201).json(portfolioItem);
  } catch (error) {
    console.error('🔥 Error en createPortfolioItem:', error);
    res.status(400).json({ message: 'Error creating portfolio item', error });
  }
};

/**
 * 🔹 Obtener portafolio de un fixer
 */
export const getPortfolioByFixerId = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;
    const portfolioItems = await Portfolio.find({ fixerId });
    res.status(200).json(portfolioItems);
  } catch (error) {
    console.error('🔥 Error en getPortfolioByFixerId:', error);
    res.status(500).json({ message: 'Error fetching portfolio items', error });
  }
};

/**
 * 🔹 Eliminar item de portafolio
 */
export const deletePortfolioItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const portfolioItem = await Portfolio.findByIdAndDelete(id);

    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    res.status(200).json({ message: 'Portfolio item deleted successfully' });
  } catch (error) {
    console.error('🔥 Error en deletePortfolioItem:', error);
    res.status(500).json({ message: 'Error deleting portfolio item', error });
  }
};

/**
 * 🔹 Actualizar item de portafolio
 */
export const updatePortfolioItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const portfolioItem = await Portfolio.findByIdAndUpdate(id, req.body, { new: true });

    if (!portfolioItem) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    res.status(200).json(portfolioItem);
  } catch (error) {
    console.error('🔥 Error en updatePortfolioItem:', error);
    res.status(400).json({ message: 'Error updating portfolio item', error });
  }
};
