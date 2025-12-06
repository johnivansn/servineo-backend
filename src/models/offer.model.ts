// modelo official para offertas de trabajo
import { Schema, model, models } from 'mongoose';

const offerSchema = new Schema(
  {
    fixerName: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
      index: true,
    },
    tags: [{ type: String }],
    price: { type: Number, required: true },
    city: {
      type: String,
      required: true,
      enum: [
        'Beni',
        'Chuquisaca',
        'Cochabamba',
        'La Paz',
        'Oruro',
        'Pando',
        'Potosí',
        'Santa Cruz',
        'Tarija',
      ],
      index: true,
    },
    contactPhone: { type: String, required: true },
    photos: {
      type: [String],
      validate: {
        validator: function (v: string[]) {
          return v && v.length >= 1 && v.length <= 5;
        },
        message: 'Debe subir entre 1 y 5 fotos.',
      },
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    status: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    strict: false,
  },
);

// Índices compuestos para mejorar rendimiento de filtros
offerSchema.index({ city: 1, category: 1 });
offerSchema.index({ fixerName: 1, city: 1 });

// Evitar recompilación del modelo
const OfferModel = models.Offer || model('Offer', offerSchema, 'offers');

export const Offer = OfferModel;
