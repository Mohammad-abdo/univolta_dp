import { Router } from "express";
import publicRouter from "../modules/public/public.router.js";
import authRouter from "../modules/auth/auth.router.js";
import universityRouter from "../modules/universities/university.router.js";
import programRouter from "../modules/programs/program.router.js";
import applicationRouter from "../modules/applications/application.router.js";
import documentRouter from "../modules/applications/document.router.js";
import testimonialRouter from "../modules/testimonials/testimonial.router.js";
import faqRouter from "../modules/faqs/faq.router.js";
import userRouter from "../modules/users/user.router.js";
import roleRouter from "../modules/roles/role.router.js";
import uploadRouter from "../modules/upload/upload.router.js";
import paymentRouter from "../modules/payments/payment.router.js";
import partnerRouter from "../modules/partner/partner.router.js";
import alertRouter from "../modules/alerts/alert.router.js";
import translationRouter from "../modules/translations/translation.router.js";

const apiRouter = Router();

apiRouter.use("/public", publicRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/universities", universityRouter);
apiRouter.use("/programs", programRouter);
apiRouter.use("/applications", applicationRouter);
apiRouter.use("/applications", documentRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/testimonials", testimonialRouter);
apiRouter.use("/faqs", faqRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/partner", partnerRouter);
apiRouter.use("/alerts", alertRouter);
apiRouter.use("/translations", translationRouter);

export default apiRouter;

