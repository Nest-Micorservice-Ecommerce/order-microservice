
import 'dotenv/config'

import * as joi from 'joi'

interface EnvVars {
  PORT: number
  // PRODUCTS_MICROSERVICE_HOST: string
  // PRODUCTS_MICROSERVICE_PORT: number
  NATS_SERVERS: string[]
}

const envsSchema = joi.object({
  PORT: joi.number().required(),
  // PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
  // PRODUCTS_MICROSERVICE_PORT: joi.number().required()
  NATS_SERVERS: joi.array().items(joi.string()).required()
})
.unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}


const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  // productsMicroserviceHost: envVars.PRODUCTS_MICROSERVICE_HOST,
  // productsMicroservicePort: envVars.PRODUCTS_MICROSERVICE_PORT
  natsSrevers: envVars.NATS_SERVERS
}


