import { Router } from "express";
import { verifyJWT } from "../../controllers/userManagement/google.controller";
import { deleteAccountController } from "../../controllers/userManagement/deleteAccount.controller";

const router = Router();

router.delete("/delete-account", verifyJWT, deleteAccountController);

export default router;
