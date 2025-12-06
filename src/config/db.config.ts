// src/config/db.config.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { appConfig } from './app.config';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  // Si ya está conectado, no hacer nada
  if (isConnected) {
    return;
  }

  try {
    console.log('🔌 Conectando a MongoDB...');
    const conn = await mongoose.connect(appConfig.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.error('❌ Error conectando a MongoDB:');
    throw error;
  }
};

// Eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 Error en MongoDB:', err);
});

// Cerrar conexión cuando la app termina
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 Conexión MongoDB cerrada por terminación de app');
  process.exit(0);
});
