import {MigrationLogLevel} from '../../../util/log';

export interface IMigration {
  logs: IMigrationLog[];
  migrationDate: Date;
  migrationFolder: string;
}

export interface IMigrationLog {
  lineno: number;
  text: string;
  type: MigrationLogLevel;
}
