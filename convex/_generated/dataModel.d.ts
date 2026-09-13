import {
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
  GenericId,
} from 'convex/server';
import schema from '../schema';

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type TableNames = TableNamesInDataModel<DataModel>;
export type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>;
export type Id<TableName extends TableNames> = GenericId<TableName>;
