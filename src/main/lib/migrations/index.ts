import { Migration } from '../types/migration'
import { migration as initialSchema } from './001_initial_schema'
import { migration as addMetadata } from './002_add_metadata'
import { migration as addMetadataToFts } from './003_add_metadata_to_fts'

export const migrations: Migration[] = [initialSchema, addMetadata, addMetadataToFts]
