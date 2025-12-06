import { Router } from "express";
import { verifyJWT } from "../../controllers/userManagement/google.controller";
import { updateProfileController } from "../../controllers/userManagement/updateProfile.controller";

const router = Router();

router.post("/", verifyJWT, updateProfileController);

export default router;
