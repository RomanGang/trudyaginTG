const Joi = require('joi');

// User validation schemas
const userRegisterSchema = Joi.object({
  telegram_id: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  phone: Joi.string().pattern(/^\+?7?\d{10,15}$/),
  role: Joi.string().valid('worker', 'employer').required(),
  city: Joi.string().max(100),
  district: Joi.string().max(100),
  password: Joi.string().min(4).max(100)
});

const userLoginSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?7?\d{10,15}$/).required(),
  password: Joi.string().required()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  phone: Joi.string().pattern(/^\+?7?\d{10,15}$/),
  city: Joi.string().max(100),
  district: Joi.string().max(100),
  skills: Joi.string().max(500)
});

// Job validation schemas
const jobCreateSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  payment: Joi.number().positive().required(),
  payment_type: Joi.string().valid('fixed', 'hourly', 'shift'),
  category: Joi.string().max(100),
  city: Joi.string().max(100).required(),
  district: Joi.string().max(100),
  date: Joi.string().isoDate().required(),
  requirements: Joi.string().max(1000),
  workers_required: Joi.number().integer().min(1).max(10)
});

const jobUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().min(10).max(2000),
  payment: Joi.number().positive(),
  payment_type: Joi.string().valid('fixed', 'hourly', 'shift'),
  category: Joi.string().max(100),
  city: Joi.string().max(100),
  district: Joi.string().max(100),
  date: Joi.string().isoDate(),
  requirements: Joi.string().max(1000),
  status: Joi.string().valid('open', 'in_progress', 'completed', 'cancelled'),
  workers_required: Joi.number().integer().min(1).max(10)
});

// Response validation schemas
const responseCreateSchema = Joi.object({
  job_id: Joi.number().integer().positive().required(),
  worker_id: Joi.number().integer().positive().required()
});

// Rating validation schemas
const ratingCreateSchema = Joi.object({
  to_user: Joi.number().integer().positive().required(),
  job_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500)
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  userRegisterSchema,
  userLoginSchema,
  userUpdateSchema,
  jobCreateSchema,
  jobUpdateSchema,
  responseCreateSchema,
  ratingCreateSchema,
  validate
};
