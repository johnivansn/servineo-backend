import { Types } from 'mongoose';
import { Forum, IForum, ForumCategory } from '../models/forum.model';
import { ForumComment, IForumComment } from '../models/forumComment.model';

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

/**
 * Lista de publicaciones de foro (para la pantalla principal)
 */
export async function listForums(): Promise<IForum[]> {
  const forums = await Forum.find({}).sort({ lastActivityAt: -1 }).lean().exec();

  return forums as unknown as IForum[];
}

/**
 * Crea una nueva publicación de foro
 */
// src/api/services/forum.service.ts
export async function createForum(data: any) {
  try {
    const { titulo, descripcion, categoria, authorId, authorRole, authorName } = data;

    const newForum = new Forum({
      titulo,
      descripcion,
      categoria,
      authorRole,
      authorName,
      authorId,
    });

    return await newForum.save();
  } catch (error) {
    console.error('Error in createForum service:', error);
    throw new Error(String(error));
  }
}

/**
 * Obtiene una publicación y sus comentarios
 */
export async function getForumWithComments(
  forumId: string | Types.ObjectId,
): Promise<{ forum: IForum | null; comments: IForumComment[] }> {
  const _id = toObjectId(forumId);

  const forum = (await Forum.findById(_id).lean().exec()) as unknown as IForum | null;
  if (!forum) {
    return { forum: null, comments: [] };
  }

  const comments = (await ForumComment.find({ forumId: _id })
    .sort({ createdAt: 1 })
    .lean()
    .exec()) as unknown as IForumComment[];

  return { forum, comments };
}

/**
 * Agregar un comentario a una publicación
 */
export async function addCommentToForum(data: {
  forumId: string | Types.ObjectId;
  authorId: string | Types.ObjectId;
  authorName: string;
  authorRole: 'requester' | 'fixer' | 'visitor' | 'admin';
  contenido: string;
}): Promise<IForumComment | null> {
  const forumObjectId = toObjectId(data.forumId);

  // Verificar si el foro existe y no está bloqueado
  const forum = await Forum.findById(forumObjectId).exec();
  if (!forum) return null;
  if (forum.isLocked) {
    throw new Error('FORUM_LOCKED');
  }

  const comment = await ForumComment.create({
    forumId: forumObjectId,
    authorId: toObjectId(data.authorId),
    authorName: data.authorName,
    authorRole: data.authorRole,
    contenido: data.contenido,
  });

  // Actualizar contador de comentarios y última actividad
  forum.commentsCount = (forum.commentsCount || 0) + 1;
  forum.lastActivityAt = new Date();
  await forum.save();

  return comment;
}

/**
 * Bloquear o desbloquear un foro (moderación básica)
 */
export async function setForumLocked(
  forumId: string | Types.ObjectId,
  isLocked: boolean,
): Promise<IForum | null> {
  const _id = toObjectId(forumId);

  const forum = await Forum.findByIdAndUpdate(
    _id,
    {
      isLocked,
    },
    { new: true },
  )
    .lean()
    .exec();

  return forum as unknown as IForum | null;
}
