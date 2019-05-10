/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Select, Card } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import * as fractal from 'fractal-web3';
import AssetIssueTable from './AssetIssueTable';
import AssetIncrease from './AssetIncrease';
import AssetFounderSet from './AssetFounderSet';
import AssetOwnerSet from './AssetOwnerSet';
import AssetDestroy from './AssetDestroy';
import * as utils from '../../utils/utils';  
import * as AssetUtils from './AssetUtils';

export default class AssetOperator extends Component {
  static displayName = 'SearchTable';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      accounts: [],
      selectedAccountName: '',
      cardHeight: 150,
      dposInfo: {},
      assetInfoSet: [],
    };
  }

  componentWillMount = async () => {
    const chainConfig = await fractal.ft.getChainConfig();
    fractal.ft.setChainId(chainConfig.chainId);
    const accounts = await utils.loadAccountsFromLS();
    for (let account of accounts) {
      this.state.accounts.push(account.accountName);
    }

    this.state.dposInfo = await fractal.dpos.getDposInfo();
  }

  onChangeAccount = async (accountName) => {
    const assetInfoSet = await AssetUtils.getAssetInfoOfOwner(accountName);
    this.setState({ selectedAccountName: accountName, assetInfoSet,  });
  }

  render() {
    return (
      <IceContainer style={styles.container}>
        <h4 style={styles.title}>资产操作</h4>
        <IceContainer style={styles.subContainer}>
          <Select
            style={{ width: 350 }}
            placeholder="选择发起资产操作的账户"
            onChange={this.onChangeAccount.bind(this)}
            dataSource={this.state.accounts}
          />
        </IceContainer>
        <Card
          style={styles.card}
          title="发行资产"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetIssueTable accountName={this.state.selectedAccountName} />
        </Card>

        <Card
          style={styles.card}
          title="增发资产"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetIncrease accountName={this.state.selectedAccountName} assetInfoSet={this.state.assetInfoSet}/>
        </Card>

        <Card
          style={styles.card}
          title="设置资产管理者"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetOwnerSet accountName={this.state.selectedAccountName} assetInfoSet={this.state.assetInfoSet} />
        </Card>

        <Card
          style={styles.card}
          title="设置资产创办者"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetFounderSet accountName={this.state.selectedAccountName} assetInfoSet={this.state.assetInfoSet} />
        </Card>

        <Card
          style={styles.card}
          title="销毁资产"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetDestroy accountName={this.state.selectedAccountName} dposInfo={this.state.dposInfo}  assetInfoSet={this.state.assetInfoSet}/>
        </Card>
      </IceContainer>
    );
  }
}

const styles = {
  container: {
    margin: '20px',
    padding: '20px 50px',
  },
  subContainer: {
    display: 'flex',
  },
  title: {
    margin: '0',
    padding: '15px 20px',
    fonSize: '16px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'rgba(0,0,0,.85)',
    fontWeight: '500',
    borderBottom: '1px solid #eee',
  },
  card: {
    width: 400,
    displayName: 'flex',
    marginBottom: '20px',
    marginLeft: '10px',
    marginRight: '10px',
    background: '#fff',
    borderRadius: '6px',
    padding: '10px 10px 20px 10px',
  },
};
