import { Response } from 'express';
import { Types } from 'mongoose';
import Notification from './notification.model';
import { AuthenticatedRequest } from '../../api/middleware/auth.middleware';

const buildUserFilter = (userId?: string) => {
  if (!userId) {
    return null;
  }

  const normalizedId = userId.trim();
  const filters: Array<Record<string, unknown>> = [
    {
      $expr: {
        $eq: [
          {
            $cond: [
              { $eq: [{ $type: '$users_id' }, 'objectId'] },
              { $toString: '$users_id' },
              '$users_id',
            ],
          },
          normalizedId,
        ],
      },
    },
  ];

  if (Types.ObjectId.isValid(normalizedId)) {
    filters.unshift({ users_id: new Types.ObjectId(normalizedId) });
  }

  return filters.length === 1 ? filters[0] : { $or: filters };
};

/**
 * Obtiene todas las notificaciones
 */
export async function getAllNotificationsController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const userFilter = buildUserFilter(req.userId);
    if (!userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const notifications = await Notification.find(userFilter).sort({ creado: -1, createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({
      message: 'Error al obtener notificaciones',
      error: error.message,
    });
  }
}

/**
 * Obtiene notificaciones por su tipo
 */
export async function getNotificationsByTypeController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const { notification_type } = req.params;
    const userFilter = buildUserFilter(req.userId);

    if (!userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const notifications = await Notification.find({
      ...userFilter,
      notification_type: notification_type,
    }).sort({
      creado: -1,
      createdAt: -1,
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        message: `No se encontraron notificaciones del tipo '${notification_type}'.`,
      });
    }

    return res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Error al obtener notificaciones por tipo:', error);
    return res.status(500).json({
      message: 'Error al obtener notificaciones por tipo',
      error: error.message,
    });
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsReadController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const { id } = req.params;
    const userFilter = buildUserFilter(req.userId);

    if (!userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Identificador inválido' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, ...userFilter },
      { leido: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    return res.status(200).json(notification);
  } catch (error: any) {
    console.error('Error al marcar la notificación como leída:', error);
    return res.status(500).json({
      message: 'Error al marcar la notificación como leída',
      error: error.message,
    });
  }
}
