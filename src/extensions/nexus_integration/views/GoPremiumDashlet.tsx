import { ComponentEx, translate } from '../../../util/ComponentEx';

import opn = require('opn');
import * as React from 'react';
import { Button } from 'react-bootstrap';
import Dashlet from '../../../controls/Dashlet';

class GoPremiumDashlet extends ComponentEx<{}, {}> {
  public render(): JSX.Element {
    const { t } = this.props;
    return (
      <Dashlet title='' className='dashlet-go-premium nexus-main-banner'>
        <div>{t('Go Premium')}</div>
        <div>{t('Uncapped downloads, no adverts')}</div>
        <div>{t('Support Nexus Mods')}</div>
        <div className='right-center'>
          <Button bsStyle='ad' onClick={this.goBuyPremium}>{t('Go Premium')}</Button>
        </div>
        <div className='nexus-ad-image' />
      </Dashlet>
    );
  }

  private goBuyPremium = () => {
    opn('https://www.nexusmods.com/register/premium');
  }
}

export default translate(['common'], { wait: false })(GoPremiumDashlet);