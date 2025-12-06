import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connectDB } from "../../config/db/mongoClient";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

export async function updateProfileService(token: string, data: any) {
  const decoded: any = jwt.verify(token, JWT_SECRET);
  const db = await connectDB();

  const userId = decoded.id;

  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.telefono) updateData.telefono = data.telefono;
  if (data.photo) updateData.url_photo = data.photo;

  if (data.ubicacion) {
    updateData.ubicacion = {
      lat: data.ubicacion.lat || 0,
      lng: data.ubicacion.lng || 0,
      direccion: data.ubicacion.direccion || "",
      departamento: data.ubicacion.departamento || "",
      pais: data.ubicacion.pais || "",
    };
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  );

const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });

if (!updatedUser) {
  throw new Error("Usuario no encontrado");
}

delete (updatedUser as any).password;

return updatedUser;

}

