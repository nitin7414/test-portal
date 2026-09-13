import {
  mutationGeneric,
  queryGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  GenericDatabaseReader,
  GenericDatabaseWriter,
  GenericMutationCtx,
  GenericQueryCtx,
} from 'convex/server';
import { DataModel } from './dataModel';

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;

export const query = queryGeneric;
export const mutation = mutationGeneric;
export const internalMutation = internalMutationGeneric;
export const internalQuery = internalQueryGeneric;
