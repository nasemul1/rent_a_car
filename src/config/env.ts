import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required().label('DATABASE_URL'),
  JWT_SECRET: Joi.string().required().min(32).label('JWT_SECRET'),
  JWT_REFRESH_SECRET: Joi.string().required().min(32).label('JWT_REFRESH_SECRET'),
  PORT: Joi.number().default(3000).label('PORT'),
  UPLOAD_PATH: Joi.string().default('./uploads').label('UPLOAD_PATH'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .label('NODE_ENV'),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  console.error('\x1b[31m%s\x1b[0m', '╔══════════════════════════════════════════════════╗');
  console.error('\x1b[31m%s\x1b[0m', '║         ❌  ENV VALIDATION FAILED  ❌           ║');
  console.error('\x1b[31m%s\x1b[0m', '╚══════════════════════════════════════════════════╝');
  console.error('');

  error.details.forEach((detail) => {
    const field = detail.path.join('.');
    console.error(`\x1b[33m  • ${field}\x1b[0m — ${detail.message}`);
  });

  console.error('');
  console.error('\x1b[36m  Fix: Copy .env.example to .env and fill in the values:\x1b[0m');
  console.error('\x1b[36m    cp .env.example .env\x1b[0m');
  console.error('');
  process.exit(1);
}

export const config = {
  db: {
    url: envVars.DATABASE_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiry: '1h',
    refreshExpiry: '7d',
  },
  port: envVars.PORT,
  uploadPath: envVars.UPLOAD_PATH,
  nodeEnv: envVars.NODE_ENV,
};
