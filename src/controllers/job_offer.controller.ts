//controller offecial para ofertas trabajo
import { Request, Response } from 'express';
import { Offer } from '../models/offer.model';
import { uploadFileToDrive, deleteFileFromDrive } from '../services/drive.service';
import mongoose from 'mongoose';

/**
 * CREATE - Crear nueva oferta de trabajo
 * POST /api/job-offers
 *
 * Body (multipart/form-data):
 * - title: string (requerido) - Título de la oferta
 * - description: string (requerido) - Descripción detallada
 * - category: string (requerido) - Categoría del servicio
 * - city: string (requerido) - Ciudad
 * - price: number (requerido) - Precio en Bs.
 * - contactPhone: string (requerido) - Teléfono de contacto
 * - fixerId: string (opcional, se obtiene del usuario autenticado)
 * - fixerName: string (opcional, se obtiene del usuario autenticado)
 * - photos: File[] (requerido) - 1 a 5 imágenes
 * - tags: string (opcional) - JSON array de tags
 */
export const createJobOffer = async (req: Request, res: Response) => {
  try {
    const files = (req as any).files as Express.Multer.File[];
    const user = (req as any).user;

    // ============ VALIDACIONES ============

    // 1. Validar que existan imágenes
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe subir al menos 1 imagen',
      });
    }

    if (files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 5 imágenes permitidas',
      });
    }

    // 2. Validar campos requeridos
    const { title, description, category, city, price, contactPhone } = req.body;

    if (!title || !description || !category || !city || !price || !contactPhone) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos requeridos: title, description, category, city, price, contactPhone',
      });
    }

    // 3. Validar que el precio sea válido
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser un número mayor a 0',
      });
    }

    // 4. Validar categoría
    const validCategories = [
      'Albañil',
      'Carpintero',
      'Fontanero',
      'Electricista',
      'Pintor',
      'Soldador',
      'Jardinero',
      'Cerrajero',
      'Mecánico',
      'Vidriero',
      'Yesero',
      'Fumigador',
      'Limpiador',
      'Instalador',
      'Montador',
      'Decorador',
      'Pulidor',
      'Techador',
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`,
      });
    }

    // 5. Validar ciudad
    const validCities = [
      'Beni',
      'Chuquisaca',
      'Cochabamba',
      'La Paz',
      'Oruro',
      'Pando',
      'Potosí',
      'Santa Cruz',
      'Tarija',
    ];

    if (!validCities.includes(city)) {
      return res.status(400).json({
        success: false,
        message: `Ciudad inválida. Debe ser una de: ${validCities.join(', ')}`,
      });
    }

    // ============ SUBIR IMÁGENES A DRIVE ============

    const imageUrls: string[] = [];
    const uploadPromises = files.map((file, index) => {
      const fileName = `offer-${Date.now()}-${index}-${file.originalname}`;
      return uploadFileToDrive(file, fileName);
    });

    try {
      const urls = await Promise.all(uploadPromises);
      imageUrls.push(...urls);
    } catch (uploadError) {
      console.error('Error uploading images:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Error al subir las imágenes a Drive',
      });
    }

    // ============ CREAR OFERTA ============

    // Parsear tags si existen
    let parsedTags: string[] = [];
    if (req.body.tags) {
      try {
        parsedTags = JSON.parse(req.body.tags);
      } catch {
        parsedTags = [category]; // Fallback a la categoría
      }
    } else {
      parsedTags = [category];
    }

    const jobOfferData = {
      fixerId: user?._id || req.body.fixerId,
      fixerName: user?.name || req.body.fixerName,
      contactPhone: contactPhone,
      title: title,
      description: description,
      category: category,
      city: city,
      price: parsedPrice,
      photos: imageUrls,
      tags: parsedTags,
      rating: 5, // Rating por defecto para nuevas ofertas
      status:
        req.body.status !== undefined
          ? req.body.status === 'true' || req.body.status === true
          : true,
    };

    const jobOffer = new Offer(jobOfferData);
    await jobOffer.save();

    return res.status(201).json({
      success: true,
      message: 'Oferta creada exitosamente',
      data: jobOffer,
    });
  } catch (error: any) {
    console.error('Error creating job offer:', error);

    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};

/**
 * GET ALL - Obtener todas las ofertas con filtros
 * GET /api/job-offers
 *
 * Query params:
 * - category: string (opcional) - Filtrar por categoría
 * - city: string (opcional) - Filtrar por ciudad
 * - minPrice: number (opcional) - Precio mínimo
 * - maxPrice: number (opcional) - Precio máximo
 * - search: string (opcional) - Búsqueda en título, descripción y nombre del fixer
 * - fixerId: string (opcional) - Filtrar por ID del fixer
 * - page: number (opcional, default: 1) - Número de página
 * - limit: number (opcional, default: 10) - Registros por página
 * - sortBy: string (opcional, default: -createdAt) - Campo para ordenar
 */
export const getAllJobOffers = async (req: Request, res: Response) => {
  try {
    const {
      category,
      city,
      minPrice,
      maxPrice,
      search,
      fixerId,
      sortBy = '-createdAt',
      page = '1',
      limit = '10',
    } = req.query;

    // Construir filtro
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (city) {
      filter.city = city;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { fixerName: { $regex: search, $options: 'i' } },
      ];
    }

    if (fixerId) {
      filter.fixerId = fixerId;
    }

    // Paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Ejecutar queries
    const [jobOffers, total] = await Promise.all([
      Offer.find(filter)
        .sort(sortBy as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: jobOffers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching job offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las ofertas',
      error: error.message,
    });
  }
};

/**
 * GET BY FIXER ID - Obtener ofertas de un fixer específico
 * GET /api/job-offers/fixer/:fixerId
 *
 * Params:
 * - fixerId: string (requerido) - ID del fixer
 */
export const getJobOffersByFixerId = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;

    // Validar que el fixerId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(fixerId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de fixer inválido',
      });
    }

    const jobOffers = await Offer.find({ fixerId }).sort('-createdAt');

    return res.status(200).json({
      success: true,
      count: jobOffers.length,
      data: jobOffers,
    });
  } catch (error: any) {
    console.error('Error fetching fixer job offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las ofertas del fixer',
      error: error.message,
    });
  }
};

/**
 * GET BY ID - Obtener una oferta específica
 * GET /api/job-offers/:id
 *
 * Params:
 * - id: string (requerido) - ID de la oferta
 */
export const getJobOfferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de oferta inválido',
      });
    }

    const jobOffer = await Offer.findById(id);

    if (!jobOffer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta no encontrada',
      });
    }

    return res.status(200).json({
      success: true,
      data: jobOffer,
    });
  } catch (error: any) {
    console.error('Error fetching job offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la oferta',
      error: error.message,
    });
  }
};

/**
 * UPDATE - Actualizar una oferta
 * PUT /api/job-offers/:id
 *
 * Params:
 * - id: string (requerido) - ID de la oferta
 *
 * Body (multipart/form-data):
 * - Cualquier campo del modelo (todos opcionales)
 * - photos: File[] (opcional) - Si se envían nuevas fotos, reemplazan las anteriores
 */
export const updateJobOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = (req as any).files as Express.Multer.File[];

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de oferta inválido',
      });
    }

    // Buscar oferta existente
    const existingOffer = await Offer.findById(id);

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta no encontrada',
      });
    }

    // Preparar datos de actualización
    const updateData: any = { ...req.body };

    // Convertir price a número si viene
    if (updateData.price) {
      updateData.price = Number(updateData.price);
      if (isNaN(updateData.price) || updateData.price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El precio debe ser un número mayor a 0',
        });
      }
    }

    // Parsear tags si vienen
    if (updateData.tags && typeof updateData.tags === 'string') {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch {
        // Si falla el parse, ignorar
        delete updateData.tags;
      }
    }

    // Si hay nuevas imágenes, procesarlas
    if (files && files.length > 0) {
      if (files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Máximo 5 imágenes permitidas',
        });
      }

      // Eliminar imágenes antiguas de Drive
      for (const oldPhotoUrl of existingOffer.photos) {
        try {
          await deleteFileFromDrive(oldPhotoUrl);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // Subir nuevas imágenes
      const imageUrls: string[] = [];
      const uploadPromises = files.map((file, index) => {
        const fileName = `offer-${Date.now()}-${index}-${file.originalname}`;
        return uploadFileToDrive(file, fileName);
      });

      try {
        const urls = await Promise.all(uploadPromises);
        imageUrls.push(...urls);
        updateData.photos = imageUrls;
      } catch (uploadError) {
        console.error('Error uploading new images:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error al subir las nuevas imágenes',
        });
      }
    }

    // Actualizar oferta
    const updatedOffer = await Offer.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Oferta actualizada exitosamente',
      data: updatedOffer,
    });
  } catch (error: any) {
    console.error('Error updating job offer:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la oferta',
      error: error.message,
    });
  }
};

/**
 * TOGGLE STATUS - Cambiar el estado de una oferta (activo/inactivo)
 * PATCH /api/job-offers/:id/toggle-status
 *
 * Params:
 * - id: string (requerido) - ID de la oferta
 */
export const toggleJobOfferStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de oferta inválido',
      });
    }

    // Buscar oferta
    const jobOffer = await Offer.findById(id);

    if (!jobOffer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta no encontrada',
      });
    }

    // Alternar el status
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { status: !jobOffer.status },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: `Oferta ${updatedOffer?.status ? 'activada' : 'desactivada'} exitosamente`,
      data: updatedOffer,
    });
  } catch (error: any) {
    console.error('Error toggling job offer status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la oferta',
      error: error.message,
    });
  }
};

/**
 * DELETE - Eliminar una oferta
 * DELETE /api/job-offers/:id
 *
 * Params:
 * - id: string (requerido) - ID de la oferta
 */
export const deleteJobOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de oferta inválido',
      });
    }

    // Buscar oferta
    const jobOffer = await Offer.findById(id);

    if (!jobOffer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta no encontrada',
      });
    }

    // Eliminar imágenes de Drive
    for (const photoUrl of jobOffer.photos) {
      try {
        await deleteFileFromDrive(photoUrl);
      } catch (error) {
        console.error('Error deleting image from Drive:', error);
      }
    }

    // Eliminar oferta de la base de datos
    await Offer.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Oferta eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting job offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la oferta',
      error: error.message,
    });
  }
};
