import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

const domainSchema = Joi.object({
    domain: Joi.string().domain().required().max(253)
});

export const validateDomain = (req: Request, res: Response, next: NextFunction) => {
    const domain = req.query.domain || req.body.domain;
    const { error } = domainSchema.validate({ domain });

    if (error) {
        logger.warn('Validation failed', { error: error.details });
        return res.status(400).json({ error: error.details[0].message });
    }

    next();
};

