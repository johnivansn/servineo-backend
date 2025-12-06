import { Request, Response } from 'express';
import { Activity } from '../../models/activities.model';

const getSessionChartByType = async (
  req: Request,
  res: Response,
  sessionType: 'session_start' | 'session_end',
) => {
  try {
    const { date, enddate } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar el parámetro 'date'",
      });
    }

    const startDate = new Date(date as string);
    let rangeEnd: Date;

    if (enddate) {
      rangeEnd = new Date(enddate as string);
      // Incluir el día final completo
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else {
      // Solo un día
      rangeEnd = new Date(startDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }

    // Buscar solo actividades del tipo sessionType
    const matchStage = {
      type: sessionType,
      date: { $gte: startDate, $lt: rangeEnd }, // Usamos el campo `date` para evitar problemas de hora
    };

    let groupStage;

    if (!enddate) {
      // Agrupar por hora
      groupStage = {
        _id: { hour: { $hour: '$date' } },
        count: { $sum: 1 },
      };
    } else {
      // Agrupar por día
      groupStage = {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        },
        count: { $sum: 1 },
      };
    }

    const data = await Activity.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      from: startDate,
      to: rangeEnd,
      groupedBy: enddate ? 'day' : 'hour',
      data,
    });
  } catch (error) {
    console.error(`Error en getSessionChart (${sessionType}):`, error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

export const getSessionStartChart = (req: Request, res: Response) =>
  getSessionChartByType(req, res, 'session_start');

export const getSessionEndChart = (req: Request, res: Response) =>
  getSessionChartByType(req, res, 'session_end');
