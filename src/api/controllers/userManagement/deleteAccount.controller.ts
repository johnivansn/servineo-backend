import { Request, Response } from "express";
import clientPromise from "../../../config/db/mongodb";
import { ObjectId } from "mongodb";

export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Usuario no autenticado" });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("ServineoBD");

    await db.collection("users").deleteOne({ _id: new ObjectId(userId) });

    return res.json({ success: true, message: "Cuenta eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando cuenta:", err);
    return res.status(500).json({ success: false, message: "Error interno al eliminar cuenta" });
  }
};
