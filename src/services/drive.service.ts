//drive official para desplegar imagenes
import { google } from 'googleapis';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Validar que las credenciales existan
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Faltan credenciales de Google Drive en las variables de entorno');
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground',
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/**
 * Sube un archivo a Google Drive y retorna la URL pública
 */
export const uploadFileToDrive = async (
  file: Express.Multer.File,
  fileName: string,
): Promise<string> => {
  try {
    const fileMetadata = {
      name: fileName,
      parents: FOLDER_ID ? [FOLDER_ID] : [],
    };

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    const fileId = response.data.id!;

    // Hacer el archivo público
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Retornar URL de visualización directa con thumbnail de Google
    const directLink = `https://lh3.googleusercontent.com/d/${fileId}=s1000`;

    return directLink;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw new Error('Error al subir archivo a Google Drive');
  }
};

/**
 * Elimina un archivo de Google Drive
 * Extrae el fileId de la URL y lo elimina
 */
export const deleteFileFromDrive = async (fileUrl: string): Promise<void> => {
  try {
    let fileId: string | null = null;

    // Formato nuevo: https://lh3.googleusercontent.com/d/FILE_ID=s1000
    if (fileUrl.includes('lh3.googleusercontent.com/d/')) {
      fileId = fileUrl.split('/d/')[1].split('=')[0].split('?')[0];
    }
    // Formato: https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
    else if (fileUrl.includes('thumbnail?id=')) {
      const urlParams = new URLSearchParams(fileUrl.split('?')[1]);
      fileId = urlParams.get('id');
    }
    // Formato antiguo: https://drive.google.com/uc?export=view&id=FILE_ID
    else if (fileUrl.includes('uc?export=view&id=')) {
      const urlParams = new URLSearchParams(fileUrl.split('?')[1]);
      fileId = urlParams.get('id');
    }

    if (!fileId) {
      throw new Error('No se pudo extraer el ID del archivo de la URL');
    }

    await drive.files.delete({
      fileId: fileId,
    });

    console.log(`Archivo ${fileId} eliminado de Drive`);
  } catch (error) {
    console.error('Error deleting file from Drive:', error);
    throw new Error('Error al eliminar archivo de Google Drive');
  }
};
