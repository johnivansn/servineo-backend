// ruta official para offertas de trabajo

import { Router } from 'express';
import multer from 'multer';
import * as jobOfferController from '../controllers/job_offer.controller';

const jobOfficial = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   POST /api/job-offers
 * @desc    Crear nueva oferta de trabajo
 * @access  Private (requiere autenticación)
 */
jobOfficial.post('/', upload.array('photos', 5), jobOfferController.createJobOffer);

/**
 * @route   GET /api/job-offers
 * @desc    Obtener todas las ofertas con filtros y paginación
 * @access  Public
 */
jobOfficial.get('/', jobOfferController.getAllJobOffers);

/**
 * @route   GET /api/job-offers/fixer/:fixerId
 * @desc    Obtener ofertas de un fixer específico
 * @access  Public
 */
jobOfficial.get('/fixer/:fixerId', jobOfferController.getJobOffersByFixerId);

/**
 * @route   GET /api/job-offers/:id
 * @desc    Obtener una oferta por ID
 * @access  Public
 */
jobOfficial.get('/:id', jobOfferController.getJobOfferById);

/**
 * @route   PUT /api/job-offers/:id
 * @desc    Actualizar una oferta
 * @access  Private (debe ser el dueño)
 */
jobOfficial.put('/:id', upload.array('photos', 5), jobOfferController.updateJobOffer);

/**
 * @route   PATCH /api/job-offers/:id
 * @desc    Actualizar una oferta
 * @access  Private (debe ser el dueño)
 */
jobOfficial.patch('/:id', upload.array('photos', 5), jobOfferController.updateJobOffer);

/**
 * @route   PATCH /api/job-offers/:id/toggle-status
 * @desc    Alternar estado activo/inactivo de una oferta
 * @access  Private (debe ser el dueño)
 */
jobOfficial.patch('/:id/toggle-status', jobOfferController.toggleJobOfferStatus);

/**
 * @route   DELETE /api/job-offers/:id
 * @desc    Eliminar una oferta
 * @access  Private (debe ser el dueño)
 */
jobOfficial.delete('/:id', jobOfferController.deleteJobOffer);

export default jobOfficial;
//ACABADO
