import { Normalize } from './getNormalizeFunc';
import getVortexPath from './getVortexPath';

import { spawn } from 'child_process';
import * as _ from 'lodash';
import * as path from 'path';

/**
 * count the elements in an array for which the predicate matches
 *
 * @export
 * @template T
 * @param {T[]} container
 * @param {(value: T) => boolean} predicate
 * @returns {number}
 */
export function countIf<T>(container: T[], predicate: (value: T) => boolean): number {
  return container.reduce((count: number, value: T): number => {
    return count + (predicate(value) ? 1 : 0);
  }, 0);
}

/**
 * calculate the sum of the elements of an array
 *
 * @export
 * @param {number[]} container
 * @returns {number}
 */
export function sum(container: number[]): number {
  return container.reduce((total: number, value: number): number =>
    total + value, 0);
}

/**
 * like the python setdefault function:
 * returns the attribute "key" from "obj". If that attribute doesn't exist
 * on obj, it will be set to the default value and that is returned.
 */
export function setdefault<T>(obj: any, key: PropertyKey, def: T): T {
  if (!obj.hasOwnProperty(key)) {
    obj[key] = def;
  }
  return obj[key];
}

/**
 * An ellipsis ("this text is too lo...") function. Usually these
 * functions clip the text at the end but often (i.e. when
 * clipping file paths) the end of the text is the most interesting part,
 * so this function clips the middle part of the input.
 * @param input the input text
 * @param maxLength the maximum number of characters (including ...)
 * @return the shortened text
 */
export function midClip(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  const half = maxLength / 2;
  return input.substr(0, half - 2)
    + '...'
    + input.substr(input.length - (half - 1));
}

/**
 * test if a string is null, undefined or consists only of whitespaces
 * @param {string} check the string to check
 */
export function isNullOrWhitespace(check: string): boolean {
    return (!check || (check.trim().length === 0));
}

/**
 * return whether the specified value is "truthy" (not one of
 * these: undefined, null, 0, -0, NaN "")
 *
 * Obviously one could just do "if (val)" but js noobs
 * may not be aware what values that accepts exactly and whether that was
 * intentional. This is more explicit.
 */
export function truthy(val: any): boolean {
  return !!val;
}

/**
 * return the delta between two objects
 * @param lhs the left, "before", object
 * @param rhs the right, "after", object
 */
export function objDiff(lhs: any, rhs: any, skip?: string[]): any {
  const res = {};

  if ((typeof(lhs) === 'object') && (typeof(rhs) === 'object')) {
    Object.keys(lhs || {}).forEach(key => {
      if ((skip !== undefined) && (skip.indexOf(key) !== -1)) {
        return;
      }
      if ((rhs[key] === undefined) && (lhs[key] !== undefined)) {
        res['-' + key] = lhs[key];
      } else {
        const sub = objDiff(lhs[key], rhs[key]);
        if (sub === null) {
          res['-' + key] = lhs[key];
          res['+' + key] = rhs[key];
        } else if (Object.keys(sub).length !== 0) {
          res[key] = sub;
        }
      }
    });
    Object.keys(rhs || {}).forEach(key => {
      if ((lhs[key] === undefined) && (rhs[key] !== undefined)) {
        res['+' + key] = rhs[key];
      }
    });
  } else if (lhs !== rhs) {
    return null;
  }

  return res;
}

/**
 * spawn this application itself
 * @param args
 */
export function spawnSelf(args: string[]) {
  if (process.execPath.endsWith('electron.exe')) {
    // development version
    args = [getVortexPath('package')].concat(args);
  }
  spawn(process.execPath, args, {
    detached: true,
  });
}

const labels = [ 'B', 'KB', 'MB', 'GB', 'TB' ];

export function bytesToString(bytes: number): string {
  let labelIdx = 0;
  while (bytes >= 1024) {
    ++labelIdx;
    bytes /= 1024;
  }
  try {
    return bytes.toFixed(Math.max(0, labelIdx - 1)) + ' ' + labels[labelIdx];
  } catch (err) {
    return '???';
  }
}

export function pad(value: number, padding: string, width: number) {
  const temp = `${value}`;
  return (temp.length >= width)
    ? temp
    : new Array(width - temp.length + 1).join(padding) + temp;
}

export function timeToString(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) - (hours * 60);
  seconds = Math.floor(seconds - minutes * 60 - hours * 3600);

  if (hours > 0) {
    return `${pad(hours, '0', 2)}:${pad(minutes, '0', 2)}:${pad(seconds, '0', 2)}`;
  } else {
    return `${pad(minutes, '0', 2)}:${pad(seconds, '0', 2)}`;
  }
}

let convertDiv: HTMLDivElement;

export function encodeHTML(input: string): string {
  if (input === undefined) {
    return undefined;
  }
  if (convertDiv === undefined) {
    convertDiv = document.createElement('div');
  }
  convertDiv.innerText = input;
  return convertDiv.innerHTML;
}

export function decodeHTML(input: string): string {
  if (input === undefined) {
    return undefined;
  }
  if (convertDiv === undefined) {
    convertDiv = document.createElement('div');
  }
  convertDiv.innerHTML = input;
  return convertDiv.innerText;
}

const PROP_BLACKLIST = ['constructor',
  '__defineGetter__',
  '__defineSetter__',
  'hasOwnProperty',
  '__lookupGetter__',
  '__lookupSetter__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toString',
  'valueOf',
  '__proto__',
  'toLocaleString' ];

export function getAllPropertyNames(obj: object) {
  let props: string[] = [];

  while (obj !== null) {
    const objProps = Object.getOwnPropertyNames(obj);
    // don't want the properties of the "base" object
    if (objProps.indexOf('__defineGetter__') !== -1) {
      break;
    }
    props = props.concat(objProps);
    obj = Object.getPrototypeOf(obj);
  }

  return Array.from(new Set(_.difference(props, PROP_BLACKLIST)));
}

/**
 * test if a directory is a sub-directory of another one
 * @param child path of the presumed sub-directory
 * @param parent path of the presumed parent directory
 */
export function isChildPath(child: string, parent: string, normalize?: Normalize): boolean {
  if (normalize === undefined) {
    normalize = (input) => process.platform === 'win32'
      ? path.normalize(input.toLowerCase())
      : path.normalize(input);
  }

  const childNorm = normalize(child);
  const parentNorm = normalize(parent);
  if (child === parent) {
    return false;
  }

  const tokens = parentNorm.split(path.sep).filter(token => token.length > 0);
  const childTokens = childNorm.split(path.sep).filter(token => token.length > 0);

  return tokens.every((token: string, idx: number) => childTokens[idx] === token);
}

/**
 * take any input string and sanitize it into a valid css id
 */
export function sanitizeCSSId(input: string) {
  return input.toLowerCase().replace(/[ .#]/g, '-');
}

/**
 * remove the BOM from the input string. doesn't do anything if there is none.
 */
export function deBOM(input: string) {
  return input.replace(/^\uFEFF/, '');
}

/**
 * escape a string for use in a regular expression
 * @param string 
 */
export function escapeRE(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * characters invalid in a file path
 */
const INVALID_FILEPATH_CHARACTERS = process.platform === 'win32'
      ? ['/', '?', '*', ':', '|', '"', '<', '>']
      : [];

/**
 * characters invalid in a file name
 */
const INVALID_FILENAME_CHARACTERS = [].concat(INVALID_FILEPATH_CHARACTERS, path.sep);

const INVALID_FILENAME_RE = new RegExp(`[${escapeRE(INVALID_FILENAME_CHARACTERS.join(''))}]`, 'g');

const RESERVED_NAMES = new Set(process.platform === 'win32'
  ? [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    '..', '.'
  ]
  : [ '..', '.' ]);

export function isFilenameValid(input: string): boolean {
  if (input.length === 0) {
    return false;
  }
  if (RESERVED_NAMES.has(path.basename(input, path.extname(input)).toUpperCase())) {
    return false;
  }
  return input.search(INVALID_FILENAME_RE) < 0;
}

function isDriveLetter(input: string): boolean {
  return (process.platform === 'win32')
    && (input.length === 2)
    && (input[1] === ':');
}

const trimTrailingSep = new RegExp(`\\${path.sep}*$`, 'g');

export function isPathValid(input: string, allowRelative: boolean = false): boolean {
  if ((process.platform === 'win32') && input.startsWith('\\\\')) {
    // UNC path, skip the leading \\ for validation
    input = input.slice(2);
  }
  let split = input.replace(trimTrailingSep, '').split(path.sep);
  if (allowRelative) {
    split = split.filter(segment => (segment !== '.') && (segment !== '..'));
  }
  let found = split.find((segment: string, idx: number) => {
    if (idx === 0 && isDriveLetter(segment)) {
      return false;
    }
    return !isFilenameValid(segment);
  })
  
  return found === undefined;
}

export {
  INVALID_FILEPATH_CHARACTERS,
  INVALID_FILENAME_RE,
  INVALID_FILENAME_CHARACTERS,
}
