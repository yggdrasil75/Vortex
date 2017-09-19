import FlexLayout from '../../../controls/FlexLayout';
import Icon from '../../../controls/Icon';
import { IconButton } from '../../../controls/TooltipControls';
import { IState } from '../../../types/IState';
import { ComponentEx, connect, translate } from '../../../util/ComponentEx';
import { log } from '../../../util/log';
import { showError } from '../../../util/message';

import { IMigration, IMigrationLog } from '../types/IMigration';
import { ILog, ISession } from '../types/ISession';
import { loadMigrationLogs } from '../util/loadMigrationLogs';
import { loadVortexLogs } from '../util/loadVortexLogs';

import * as Promise from 'bluebird';
import { remote } from 'electron';
import * as fs from 'fs-extra-promise';
import * as update from 'immutability-helper';
import * as path from 'path';
import * as React from 'react';
import {
  Button, Checkbox, Jumbotron, ListGroup,
  ListGroupItem, Modal, Panel,
} from 'react-bootstrap';
import JSONTree from 'react-json-tree';

export interface IBaseProps {
  visible: boolean;
  onHide: () => void;
}

interface IConnectedProps {
  language: string;
}

interface IComponentState {
  sessionIdx: number;
  migrationIdx: number;
  show: {
    error: boolean;
    warn: boolean;
    info: boolean;
    debug: boolean;
  };
  logSessions: ISession[];
  migrationLogs: IMigration[];
  showApplicationState: boolean;
}

interface IActionProps {
  onShowError: (message: string, details?: string | Error) => void;
}

type IProps = IBaseProps & IActionProps & IConnectedProps;

class DiagnosticsFilesDialog extends ComponentEx<IProps, IComponentState> {
  private mIsMounted: boolean = false;

  constructor(props) {
    super(props);
    this.state = {
      sessionIdx: -1,
      migrationIdx: -1,
      show: {
        error: true,
        warn: true,
        info: true,
        debug: false,
      },
      logSessions: undefined,
      migrationLogs: undefined,
      showApplicationState: false,
    };
  }

  public componentWillReceiveProps(nextProps: IProps) {
    const { onShowError } = this.props;
    const { logSessions } = this.state;

    if (!this.props.visible && nextProps.visible) {
      this.setState(update(this.state, {
        show: { $set: {
          error: true,
          warn: true,
          info: true,
          debug: false,
        } },
      }));

      this.updateLogs();
      this.updateMigrationLogs();
    }
  }

  public componentWillMount() {
    const { logSessions } = this.state;
    const { onShowError } = this.props;

    this.mIsMounted = true;
  }

  public componentWillUnmount() {
    this.mIsMounted = false;
  }

  public render(): JSX.Element {
    const { t, visible } = this.props;
    const { logSessions, migrationLogs } = this.state;

    let body: JSX.Element;

    if (visible) {
      if (logSessions === undefined || migrationLogs === undefined) {
        body = (
          <Modal.Body id='diagnostics-files'>
            <Icon name='spinner' pulse/>
          </Modal.Body>
        );
      } else if (logSessions.length > 0 || migrationLogs.length > 0) {
        const sessionsSorted = logSessions
          .sort((lhs, rhs) => rhs.from.getTime() - lhs.from.getTime());

        const migrationLogsSorted = migrationLogs
            .sort((lhs, rhs) => rhs.migrationDate.getTime() - lhs.migrationDate.getTime());

        body = (
          <Modal.Body id='diagnostics-files'>
            <FlexLayout.Fixed>
              <p>Vortex Logs</p>
              <ListGroup className='diagnostics-files-sessions-panel'>
                {sessionsSorted.map(this.renderSession)}
              </ListGroup>
            </FlexLayout.Fixed>
            <FlexLayout.Fixed>
            <p>Migration Logs</p>
              <ListGroup className='diagnostics-files-migrationlogs-panel'>
                {migrationLogsSorted.map(this.renderMigration)}
              </ListGroup>
            </FlexLayout.Fixed>
            {this.renderLog()}
          </Modal.Body>
        );
      } else {
        body = (
          <Modal.Body id='diagnostics-files'>
            <Jumbotron className='diagnostics-files-error'>
              {t('An error occurred loading Vortex logs.')}
            </Jumbotron>
          </Modal.Body>
        );
      }
    }

    return (
      <Modal bsSize='lg' show={visible} onHide={this.props.onHide}>
        <Modal.Header>
          <Modal.Title>
            {t('Diagnostics Files')}
          </Modal.Title>
        </Modal.Header>
        {body}
        <Modal.Footer>
          <Button
            id='showApplicationState'
            onClick={this.showApplicationState}
          >
            {t('Show Application State')}
          </Button>
          <Button
            id='close'
            onClick={this.props.onHide}
          >
            {t('Close')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  private renderMigration = (migration: IMigration, index: number) => {
    const { t, language } = this.props;
    const { migrationIdx } = this.state;

    const errors = migration.logs.filter(item => item.type === 'error');

    const classes = ['list-group-item'];
    if (migrationIdx === index) {
      classes.push('active');
    }

    const migrationText = (
      <div style={{ width: '90%' }} key={`migration-${index}`}>
        <span>{t('Migration date: ')}</span>
        <span className='migration-date'>{migration.migrationDate.toUTCString()}</span>
        {errors.length > 0 ? <span>
          {' - ' + t('{{ count }} error', { count: errors.length })}
        </span> : null}
      </div>
    );

    return (
      <ListGroupItem
        className={classes.join(' ')}
        key={index}
        onClick={this.selectMigration}
        value={index}
      >
        {migrationText}
      </ListGroupItem>
    );
  }

  private renderSession = (session: ISession, index: number) => {
    const { t, language } = this.props;
    const { sessionIdx } = this.state;

    const errors = session.logs.filter(item => item.type === 'error');
    const from = session.from;
    const to = session.to;

    let isCrashed = '';
    if ((session.from === undefined)
        && !session.logs[session.logs.length - 1].text.endsWith('clean application end')) {
      isCrashed = ` - ${t('Crashed')}!`;
    }

    const classes = ['list-group-item'];
    if (sessionIdx === index) {
      classes.push('active');
    }

    const sessionText = (
      <div style={{ width: '90%' }} key={`session-${index}`}>
        <span>{t('From') + ' '}</span>
        <span className='session-from'>{from.toLocaleString(language)}</span>
        <span>{' ' + t('to') + ' '}</span>
        <span className='session-to'>{to.toLocaleString(language)}</span>
        {errors.length > 0 ? <span>
          {' - ' + t('{{ count }} error', { count: errors.length })}
        </span> : null}
        <span className='session-crashed'>{isCrashed}</span>
      </div>
    );

    return (
      <ListGroupItem
        className={classes.join(' ')}
        key={index}
        onClick={this.selectSession}
        value={index}
      >
        {sessionText}
      </ListGroupItem>
    );
  }

  private renderVortexFilterButtons() {
    const { t } = this.props;
    const { logSessions, sessionIdx, show } = this.state;

    const errors = (sessionIdx === -1)
      ? []
      : logSessions[sessionIdx].logs.filter(item => item.type === 'error');

    return (
      <FlexLayout type='row' key='session-flex-layout-div'>
        {['debug', 'info', 'warn', 'error'].map(type => (
          <div key={`session-${type}`}>
            <Checkbox
              key={`checkbox-${type}`}
              className={`log-filter-${type === 'warn' ? 'warning' : type}`}
              checked={show[type]}
              onChange={this.toggleFilter}
              value={type}
            >
              {type === 'warn' ? t('WARNING') : t(type.toUpperCase())}
            </Checkbox>
          </div>
        )) }
        <FlexLayout.Flex/>
        <Button onClick={this.copyToClipboard}>
          {t('Copy to Clipoard')}
        </Button>
        {errors.length > 0 ? (
          <Button
            id={`report-vortex-log-${sessionIdx}`}
            onClick={this.reportVortexLog}
          >
          {t('Report')}
          </Button>
        ) : null}
      </FlexLayout>
    );
  }

  private renderMigrationFilterButtons() {
    const { t } = this.props;
    const { migrationLogs, migrationIdx, show } = this.state;

    const errors = (migrationIdx === -1)
      ? []
      : migrationLogs[migrationIdx].logs.filter(item => item.type === 'error');

    return (
      <FlexLayout type='row' key='migration-flex-layout-div'>
        {['info', 'error'].map(type => (
          <div key={`migration-${type}`}>
            <Checkbox
              key={`checkbox-${type}`}
              className={`log-filter-${type}`}
              checked={show[type]}
              onChange={this.toggleFilter}
              value={type}
            >
              {type === 'info' ? t('TRASNFERING') : t(type.toUpperCase())}
            </Checkbox>
          </div>
        )) }
        <FlexLayout.Flex/>
        <Button onClick={this.copyToClipboard}>
          {t('Copy to Clipoard')}
        </Button>
        {errors.length > 0 ? (
          <Button
            id={`report-migration-log-${migrationIdx}`}
            onClick={this.reportMigrationLog}
          >
          {t('Report')}
          </Button>
        ) : null}
      </FlexLayout>
    );
  }

  private renderSessionLogLine(line: ILog): JSX.Element {
    return (
      <li key={`session-${line.lineno}`} className={`log-line-${line.type}`}>
        <span className='log-time'>{line.time}</span>
        {' - '}
        <span className={`log-type-${line.type === 'warn' ? 'warning' : line.type}`}>
          {line.type}
        </span>
        {': '}
        <span className='log-text'>{line.text.replace(/\t/g, '\n')}</span>
      </li>
    );
  }

  private renderMigrationLogLine(line: ILog): JSX.Element {
    return (
      <li key={`migration-${line.lineno}`} className={`log-line-${line.type}`}>
        <span className={`log-type-${line.type}`}>{
          line.type === 'info' ? 'transfering' : line.type
          }</span>
        {': '}
        <span className='log-text'>{line.text.replace(/\t/g, '\n')}</span>
      </li>
    );
  }

  private renderLog() {
    const {
       logSessions, migrationIdx, migrationLogs,
       sessionIdx, show, showApplicationState } = this.state;

    if (showApplicationState) {
      return (
        <JSONTree
          theme={{
            tree: ({ style }) => ({
              style: {
                ...style,
                height: '380px',
                maxHeight: '380px',
                overflow: 'scroll',
              },
            }),
          }}
          data={this.context.api.store.getState()['persistent']}
        />
      );
    }

    if (sessionIdx === -1 && migrationIdx === -1) {
      return null;
    }

    const enabledLevels = new Set(Object.keys(show).filter(key => show[key]));

    if (sessionIdx !== -1) {
      const filteredLog = logSessions[sessionIdx].logs
      .filter(line => enabledLevels.has(line.type))
      .map(this.renderSessionLogLine);

      return (
      <FlexLayout type='column' className='diagnostics-files-log-panel'>
        <FlexLayout.Fixed>
          {this.renderVortexFilterButtons()}
        </FlexLayout.Fixed>
        <FlexLayout.Flex>
          <ul className='log-list'>
            {filteredLog}
          </ul>
        </FlexLayout.Flex>
      </FlexLayout>
      );
    } else if (migrationIdx !== -1) {
      const filteredLog = migrationLogs[migrationIdx].logs
      .filter(line => enabledLevels.has(line.type))
      .map(this.renderMigrationLogLine);

      return (
      <FlexLayout type='column' className='diagnostics-files-log-panel'>
        <FlexLayout.Fixed>
          {this.renderMigrationFilterButtons()}
        </FlexLayout.Fixed>
        <FlexLayout.Flex>
          <ul className='log-list'>
            {filteredLog}
          </ul>
        </FlexLayout.Flex>
      </FlexLayout>
      );
    }
  }

  private showApplicationState = () => {
    this.setState(update(this.state, {
      showApplicationState: { $set: true },
      sessionIdx: { $set: -1 },
      migrationIdx: { $set: -1 },
    }));
  }

  private updateMigrationLogs(): Promise<void> {
    const { onShowError } = this.props;
    return loadMigrationLogs()
      .then(migrationLogs => {
        this.setState(update(this.state, {
          migrationLogs: { $set: migrationLogs },
        }));
      })
      .catch((err) => {
        onShowError('Failed to read Migration logs', err.message);
      });
  }

  private updateLogs(): Promise<void> {
    const { onShowError } = this.props;
    return loadVortexLogs()
      .then(sessions => {
        this.setState(update(this.state, {
          logSessions: { $set: sessions },
        }));
      })
      .catch((err) => {
        onShowError('Failed to read Vortex logs', err.message);
      });
  }

  private toggleFilter = (evt) => {
    const { show } = this.state;
    const filter = evt.currentTarget.value;
    this.setState(update(this.state, { show: { [filter]: { $set: !show[filter] } } }));
  }

  private selectSession = (evt) => {
    const idx = evt.currentTarget.value;
    this.setState(update(this.state, {
      sessionIdx: { $set: idx },
      migrationIdx: { $set: -1 },
      showApplicationState: { $set: false },
     }));
  }

  private selectMigration = (evt) => {
    const idx = evt.currentTarget.value;
    this.setState(update(this.state, {
      migrationIdx: { $set: idx },
      sessionIdx: { $set: -1 },
      showApplicationState: { $set: false },
     }));
  }

  private copyToClipboard = () => {
    const { logSessions, migrationIdx, migrationLogs, sessionIdx, show } = this.state;

    const enabledLevels = new Set(Object.keys(show).filter(key => show[key]));

    if (sessionIdx !== -1) {
      const filteredLog = logSessions[sessionIdx].logs
      .filter(line => enabledLevels.has(line.type))
      .map(line => `${line.time} - ${line.type}: ${line.text}`)
      .join('\n');

      remote.clipboard.writeText(filteredLog);
    } else if (migrationIdx !== -1) {
      const filteredLog = migrationLogs[migrationIdx].logs
      .filter(line => enabledLevels.has(line.type))
      .map(line => `${line.type}: ${line.text}`)
      .join('\n');

      remote.clipboard.writeText(filteredLog);
    }
  }

  private reportVortexLog = (evt) => {
    const { onShowError } = this.props;
    const { logSessions, sessionIdx } = this.state;

    const nativeCrashesPath = path.join(remote.app.getPath('userData'), 'temp');
    const fullLog: string = logSessions[sessionIdx].logs
      .map(line => `${line.time} - ${line.type}: ${line.text}`)
      .join('\n');

    this.props.onHide();
    const logPath = path.join(nativeCrashesPath, 'session.log');
    fs.writeFileAsync(logPath, fullLog)
      .then(() => {
        this.context.api.events.emit('report-log-error', logPath);
      })
      .catch((err) => {
        onShowError('Failed to write log session file', err.message);
      })
      .then(() => null);
  }

  private reportMigrationLog = (evt) => {
    const { onShowError } = this.props;
    const { migrationLogs, migrationIdx } = this.state;

    const nativeCrashesPath = path.join(remote.app.getPath('userData'), 'temp');
    const fullLog: string = migrationLogs[migrationIdx].logs
      .map(line => `${line.type}: ${line.text}`)
      .join('\n');

    this.props.onHide();
    const logPath = path.join(nativeCrashesPath, 'migration.log');
    fs.writeFileAsync(logPath, fullLog)
      .then(() => {
        this.context.api.events.emit('report-log-error', logPath);
      })
      .catch((err) => {
        onShowError('Failed to write log session file', err.message);
      })
      .then(() => null);
  }
}

function mapStateToProps(state: IState): IConnectedProps {
  return {
    language: state.settings.interface.language,
  };
}

function mapDispatchToProps(dispatch: Redux.Dispatch<any>): IActionProps {
  return {
    onShowError: (message: string, details?: string | Error) =>
      showError(dispatch, message, details),
  };
}

export default translate(['common'], { wait: true })(
  (connect(mapStateToProps, mapDispatchToProps)
    (DiagnosticsFilesDialog))) as React.ComponentClass<{ IBaseProps }>;
