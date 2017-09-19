import { LogLevel } from '../../../util/log';

import { IMigration, IMigrationLog } from '../types/IMigration';

import * as Promise from 'bluebird';
import { remote } from 'electron';
import * as fs from 'fs-extra-promise';
import * as path from 'path';

export function loadMigrationLogs(): Promise<IMigration[]> {

  const logPath = remote.app.getPath('userData');
  const lineRE = /^(transfering|Failed to import) (.*)((\n\ \ .+)*)$/;

  function parseLine(line: string, idx: number): IMigrationLog {
    const match = line.match(lineRE);
    if ((match !== null) && (match[1] === 'transfering' || 'Failed')) {
      const logLevel = match[1] === 'transfering' ? 'info' : 'error';
      const logText = match[1] === 'transfering' ? match[2] : path.join(match[2], match[3]);
      return {
        lineno: idx,
        type: logLevel as LogLevel,
        text: logText,
      };
    } else {
      return undefined;
    }
  }

  return fs.readdirAsync(logPath)
    .filter((fileName: string) => fileName.match(/^nmm_import-[0-9].*\d$/) !== null)
    .then((migrationFolders: string[]) => {
      migrationFolders = migrationFolders.sort((lhs: string, rhs: string) =>
        rhs.localeCompare(lhs));
      return Promise.mapSeries(migrationFolders, (folder: string) =>
        fs.readFileAsync(path.join(logPath, folder, 'nmm_import.log'), 'utf8')
          .then((text) => {

            const logElements: IMigrationLog[] = text
              .split(/\n(?!^[ ])/m)
              .map(parseLine)
              .filter(line => line !== undefined);

            return ((logElements.length > 1) ?
              {
                logs: logElements,
                migrationDate: new Date(parseInt(folder.split('-')[1], 10)),
                migrationFolder: folder,
              } :
              undefined) as IMigration;
          }));
    })
    .filter((migration: IMigration) => migration !== undefined)
    .catch(() => {
      return [];
    });
}
