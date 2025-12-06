import { Request, Response } from 'express';
import { Certification } from '../models/certification.model';
import { Types } from 'mongoose';

const isValidObjectId = (id?: string) => {
  return !!id && Types.ObjectId.isValid(id);
};

/**
 * CREATE - Crear nueva certificación
 * ---------------------------------------------------
 * MÉTODO: POST
 * RUTA:   /api/certifications
 * BODY:
 * {
 * "fixerId": "64b...",       // (Requerido) ID del usuario/fixer
 * "name": "Curso JS",        // (Requerido) Nombre de la certificación
 * "institution": "Udemy",    // (Requerido) Institución
 * "issueDate": "2023-01-01", // (Requerido) Fecha de emisión
 * "expiryDate": "2025-01-01",// (Opcional) Fecha de expiración
 * "credentialId": "AB-123",  // (Opcional) ID de la credencial
 * "credentialUrl": "https..."// (Opcional) URL de la imagen
 * }
 */
export const createCertification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fixerId, name, institution, issueDate, expiryDate, credentialId, credentialUrl } =
      req.body;

    if (!fixerId || !name || !institution || !issueDate) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: fixerId, name, institution, issueDate',
      });
      return;
    }

    const parsedIssueDate = new Date(issueDate);
    if (isNaN(parsedIssueDate.getTime())) {
      res.status(400).json({ success: false, message: 'Fecha de emisión inválida' });
      return;
    }

    const certification = new Certification({
      fixerId,
      name,
      institution,
      issueDate: parsedIssueDate,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      credentialId,
      credentialUrl,
    });

    await certification.save();

    res.status(201).json({
      success: true,
      message: 'Certificación creada exitosamente',
      data: certification,
    });
  } catch (error: any) {
    console.error('Error creating certification:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

/**
 * GET BY FIXER ID - Obtener todas las certificaciones de un usuario
 * ---------------------------------------------------
 * MÉTODO: GET
 * RUTA:   /api/certifications/fixer/:fixerId
 * BODY:   No requiere body.
 * EJEMPLO URL: /api/certifications/fixer/64b5f7a1c8e1a...
 */
export const getCertificationsByFixerId = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;

    if (!isValidObjectId(fixerId)) {
      return res.status(400).json({ success: false, message: 'ID de fixer inválido' });
    }

    const certifications = await Certification.find({
      fixerId: new Types.ObjectId(fixerId),
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: certifications.length,
      data: certifications,
    });
  } catch (error: any) {
    console.error('Error fetching certifications:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener certificaciones', error: error.message });
  }
};

/**
 * GET BY ID - Obtener una certificación específica
 * ---------------------------------------------------
 * MÉTODO: GET
 * RUTA:   /api/certifications/:id
 * BODY:   No requiere body.
 * EJEMPLO URL: /api/certifications/65a1b2c3d4e5...
 */
export const getCertificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID de certificación inválido' });
    }

    const certification = await Certification.findById(id);
    if (!certification) {
      return res.status(404).json({ success: false, message: 'Certificación no encontrada' });
    }

    return res.status(200).json({ success: true, data: certification });
  } catch (error: any) {
    console.error('Error fetching certification:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener la certificación', error: error.message });
  }
};

/**
 * UPDATE - Actualizar certificación
 * ---------------------------------------------------
 * MÉTODO: PUT
 * RUTA:   /api/certifications/:id
 * BODY:   (Enviar solo los campos que quieres cambiar)
 * {
 * "name": "Nombre Actualizado",
 * "institution": "Nueva Institución"
 * }
 */
export const updateCertification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Validar ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID de certificación inválido' });
    }

    // 2. Actualizar directamente
    // { new: true } retorna el documento ya actualizado
    const updatedCertification = await Certification.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedCertification) {
      return res.status(404).json({ success: false, message: 'Certificación no encontrada' });
    }

    return res.status(200).json({
      success: true,
      message: 'Certificación actualizada exitosamente',
      data: updatedCertification,
    });
  } catch (error: any) {
    console.error('Error updating certification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la certificación',
      error: error.message,
    });
  }
};

/**
 * DELETE - Eliminar certificación
 * ---------------------------------------------------
 * MÉTODO: DELETE
 * RUTA:   /api/certifications/:id
 * BODY:   No requiere body.
 * EJEMPLO URL: /api/certifications/65a1b2c3d4e5...
 */
export const deleteCertification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Aquí recibimos el ID de la certificación

    // 1. Validar ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID de certificación inválido' });
    }

    // 2. Eliminar directamente
    const deletedCertification = await Certification.findByIdAndDelete(id);

    if (!deletedCertification) {
      return res.status(404).json({ success: false, message: 'Certificación no encontrada' });
    }

    return res.status(200).json({
      success: true,
      message: 'Certificación eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting certification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la certificación',
      error: error.message,
    });
  }
};
