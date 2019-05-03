/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Select, Card } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import AssetIssueTable from './AssetIssueTable';
import AssetIncrease from './AssetIncrease';
import AssetFounderSet from './AssetFounderSet';
import { getBoundInfo, getDposInfo } from '../../api';
import AssetOwnerSet from './AssetOwnerSet';
import AssetDestroy from './AssetDestroy';

export default class AssetOperator extends Component {
  static displayName = 'SearchTable';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      accountNames: [],
      selectedAccountName: '',
      cardHeight: 350,
      dposInfo: {},
    };
    const myThis = this;
    getBoundInfo([]).then(response => {
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        if (response.data.result !== undefined) {
          const accountNames = [];
          for (const account of response.data.result) {
            accountNames.push(account.accountName);
          }
          myThis.setState({ accountNames });
        }
      }
    });

    let dposInfo = {};
    getDposInfo().then(dposResp => {
      if (Object.prototype.hasOwnProperty.call(dposResp.data, 'result') && dposResp.data.result != null) {
        dposInfo = dposResp.data.result;
        myThis.state.dposInfo = dposInfo;
      }
    });
  }

  onChangeAccount = (value) => {
    this.setState({ selectedAccountName: value });
  }
  handlePasswordChange = () => {
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
            dataSource={this.state.accountNames}
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
          <AssetIncrease accountName={this.state.selectedAccountName} />
        </Card>

        <Card
          style={styles.card}
          title="设置资产管理者"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetOwnerSet accountName={this.state.selectedAccountName} />
        </Card>

        <Card
          style={styles.card}
          title="设置资产创建者"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetFounderSet accountName={this.state.selectedAccountName} />
        </Card>

        <Card
          style={styles.card}
          title="销毁资产"
          language="en-us"
          bodyHeight={this.state.cardHeight}
        >
          <AssetDestroy accountName={this.state.selectedAccountName} dposInfo={this.state.dposInfo} />
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
