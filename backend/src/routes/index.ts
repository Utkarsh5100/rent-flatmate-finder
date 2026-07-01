import { Router } from 'express';

import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { chatRouter } from './chat.routes.js';
import { healthRouter } from './health.js';
import { interestRouter } from './interest.routes.js';
import { listingRouter } from './listing.routes.js';
import { notificationRouter } from './notification.routes.js';
import { profileRouter } from './profile.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/listings', listingRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/interests', interestRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/admin', adminRouter);

export { apiRouter };
