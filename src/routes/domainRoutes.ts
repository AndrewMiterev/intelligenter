import { Router } from 'express';
import { DomainController } from '../controllers/domainController';
import { validateDomain } from '../middleware/validation';
import { logRequest, authenticateApiKey } from '../middleware/security';

const router = Router();
const domainController = new DomainController();

router.get('/get',
    authenticateApiKey,
    logRequest,
    validateDomain,
    domainController.getDomain.bind(domainController)
);

router.post('/post',
    authenticateApiKey,
    logRequest,
    validateDomain,
    domainController.postDomain.bind(domainController)
);

export default router;

