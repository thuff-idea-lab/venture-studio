import Ajv from 'ajv';

const ajv = new Ajv();

/**
 * Validate a record against a JSON schema.
 * Throws if invalid — agents should never write invalid records to DB.
 */
export function validate<T>(schema: object, data: unknown): T {
  const valid = ajv.validate(schema, data);
  if (!valid) {
    throw new Error(`Schema validation failed: ${ajv.errorsText()}`);
  }
  return data as T;
}
