import { Request, Response } from 'express';
import { User } from '../models/user.model';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const updates = req.body;

    // Prevent updating role directly via this endpoint if needed,
    // or allow it if the logic permits requester -> fixer transition here.
    // For now, we allow updating everything passed in body.

    // If user is becoming a fixer, we might want to validate required fields here
    // but the model validation should handle most of it.

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating profile', error });
  }
};

export const getFixerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Fixer not found' });
    }

    if (user.role !== 'fixer') {
      return res.status(404).json({ message: 'User is not a fixer' });
    }

    // Return only public info? For now returning full object as requested by context implies full model access
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fixer', error });
  }
};

export const postDescriptionFixer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // Validar que se proporcionó una descripción
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'Description is required and must be a string' });
    }

    // Validar que el usuario existe y es un fixer
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'fixer') {
      return res.status(400).json({ message: 'User is not a fixer' });
    }

    // Actualizar la descripción
    user.description = description;
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Fixer description updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating fixer description', error });
  }
};

export const updateWorkLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workLocation } = req.body;

    // Validar que se proporcionó la ubicación
    if (!workLocation || typeof workLocation !== 'object') {
      return res.status(400).json({ message: 'workLocation is required and must be an object' });
    }

    const { lat, lng, direccion, departamento, pais } = workLocation;

    // Validar coordenadas
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    // Validar que el usuario existe y es un fixer
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'fixer') {
      return res.status(400).json({ message: 'User is not a fixer' });
    }

    // Actualizar la ubicación de trabajo
    user.workLocation = {
      lat,
      lng,
      direccion: direccion || '',
      departamento: departamento || '',
      pais: pais || '',
    };

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Work location updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating work location:', error);
    res.status(500).json({ message: 'Error updating work location', error });
  }
};
