import { Migration } from '../types/migration'
import { migration as initialSchema } from './001_initial_schema'

export const migrations: Migration[] = [initialSchema]
