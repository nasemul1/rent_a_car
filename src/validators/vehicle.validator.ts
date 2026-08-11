import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  name: Joi.string().max(255).required(),
  plate_number: Joi.string().max(50).required(),
  category: Joi.string().max(100).required(),
  daily_rate: Joi.number().positive().precision(2).required(),
});

export const updateVehicleSchema = Joi.object({
  name: Joi.string().max(255),
  plate_number: Joi.string().max(50),
  category: Joi.string().max(100),
  daily_rate: Joi.number().positive().precision(2),
}).min(1);
