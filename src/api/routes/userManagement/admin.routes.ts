import { Router } from "express";
import { loginAdministrador, loginAdminWithGoogle, verifyAdminToken } from "../../controllers/userManagement/admin.controller";
import chartRouter from '../chart.routes';
import { verifyJWT } from "../../../middlewares/authMiddleware";
import { adminOnly } from "../../../middlewares/adminOnly";
import { getUserStats } from "../../controllers/userManagement/userStats.controller";

const router = Router();

// Rutas de autenticación
router.post("/login", loginAdministrador);
router.post("/login/google", loginAdminWithGoogle);

// Verificación de token
router.get("/verify", verifyJWT, adminOnly, verifyAdminToken);

// Estadísticas de usuarios
router.get("/user-stats", verifyJWT, adminOnly, getUserStats);

// Rutas de gráficos
router.use("/chart", chartRouter);

export default router;