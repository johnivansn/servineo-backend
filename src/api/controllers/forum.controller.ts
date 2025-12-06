import { Request, Response } from 'express';
import * as forumService from '../../services/forum.service';
import { Types } from 'mongoose';

interface AuthUser {
  _id: string | Types.ObjectId;
  name: string;
  role: 'requester' | 'fixer' | 'visitor' | 'admin';
}

function getAuthUser(req: Request): AuthUser | null {
  const anyReq = req as any;

  if (anyReq.user) {
    const raw = anyReq.user;

    // Soportar distintas formas de id viniendo del JWT
    const id =
      raw._id ??
      raw.id ?? // típico cuando se firma como { id: ... }
      raw.userId ?? // por si algún login usa userId
      raw.sub; // por si viene de OAuth/JWT estándar

    // Nombre: toma lo que haya
    const name = raw.name ?? raw.username ?? raw.email;

    // Rol: si no viene en el token, usamos requester por defecto
    const role: AuthUser['role'] = raw.role ?? 'requester';

    if (!id || !name) {
      // Si aún así no hay datos mínimos, lo tratamos como no autenticado
      return null;
    }

    return {
      _id: id,
      name,
      role,
    };
  }

  // Fallback para pruebas con body manual (si quieres lo puedes dejar o borrar)
  if (req.body.authorId && req.body.authorName && req.body.authorRole) {
    return {
      _id: req.body.authorId,
      name: req.body.authorName,
      role: req.body.authorRole,
    };
  }

  return null;
}

export async function listForumsController(req: Request, res: Response) {
  try {
    const forums = await forumService.listForums();
    res.status(200).json(forums);
  } catch (error) {
    console.error('Error listing forums:', error);
    res.status(500).json({ error: 'Error listing forums' });
  }
}

export async function createForumController(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { titulo, descripcion, categoria } = req.body;
    if (!titulo || !descripcion || !categoria) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: titulo, descripcion, categoria' });
    }

    const forum = await forumService.createForum({
      authorId: user._id,
      authorName: user.name,
      authorRole: user.role,
      titulo,
      descripcion,
      categoria,
    });

    res.status(201).json(forum);
  } catch (error) {
    console.error('Error creating forum:', error);
    res.status(500).json({ error: 'Error creating forum' });
  }
}

export async function getForumWithCommentsController(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { forum, comments } = await forumService.getForumWithComments(id);

    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.status(200).json({ forum, comments });
  } catch (error) {
    console.error('Error getting forum with comments:', error);
    res.status(500).json({ error: 'Error getting forum with comments' });
  }
}

export async function addCommentController(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params; // forumId
    const { contenido } = req.body;

    if (!contenido) {
      return res.status(400).json({ error: 'Missing required field: contenido' });
    }

    const comment = await forumService.addCommentToForum({
      forumId: id,
      authorId: user._id,
      authorName: user.name,
      authorRole: user.role,
      contenido,
    });

    if (!comment) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.status(201).json(comment);
  } catch (error: any) {
    if (error?.message === 'FORUM_LOCKED') {
      return res.status(409).json({ error: 'Forum is locked for new comments' });
    }

    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
}

export async function lockForumController(req: Request, res: Response) {
  try {
    // Aquí idealmente verificarías que el usuario es admin
    const { id } = req.params;
    const { isLocked } = req.body;

    const forum = await forumService.setForumLocked(id, Boolean(isLocked));

    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.status(200).json(forum);
  } catch (error) {
    console.error('Error locking forum:', error);
    res.status(500).json({ error: 'Error locking forum' });
  }
}
