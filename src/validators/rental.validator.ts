import Joi from 'joi';

export const createRentalSchema = Joi.object({
  vehicle_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().max(255).required(),
  customer_phone: Joi.string().max(50).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
});
