import { Request, Response } from "express";
import { updateProfileService } from "../../../services/userManagement/updateProfile.service";
import { generarToken } from "../../../utils/generadorToken";

export async function updateProfileController(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Token no proporcionado" });
    }

    const result = await updateProfileService(token, req.body);
    const newToken = generarToken(
      result.usuarioId,
      result.name,
      result.email,
      result.url_photo
    );

    return res.status(200).json({
      success: true,
      message: "Perfil actualizado correctamente",
      token: newToken,
      picture: result.url_photo,
    });

  } catch (err: any) {
    console.error("Error al actualizar perfil:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Error interno del servidor",
    });
  }
}
