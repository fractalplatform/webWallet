/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import React, { Component } from 'react';
import { Table, Pagination, Search, Grid, Feedback } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import BigNumber from 'bignumber.js';
import * as fractal from 'fractal-web3';
import * as utils from '../../utils/utils';  

const { Row, Col } = Grid;

export default class SearchTable extends Component {
  static displayName = 'SearchTable';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      assetInfos: {},
      balanceInfos: [],
      balanceInfosOnePage: [],
      onePageNum: 10,
      assetInfo: [],
    };
  }


  getReadableNumber = (value, assetID) => {
    const { assetInfos } = this.state;
    const decimals = assetInfos[assetID].decimals;

    let renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(decimals * -1);

    BigNumber.config({ DECIMAL_PLACES: 6 });
    renderValue = renderValue.toString(10);
    return renderValue;
  }

  onSearch = async (value) => {
    try {
      const balanceInfos = [];
      const account = await fractal.account.getAccountByName(value.key);
      if (account == null) {
        Feedback.toast.error('无此账户信息');
        return;
      }
      const assetBalances = account.balances;
      for (const assetBalance of assetBalances) {
        const assetInfo = await fractal.account.getAssetInfoById(assetBalance.assetID);
        this.state.assetInfos[assetBalance.assetID] = assetInfo;
        const readableValue = this.getReadableNumber(assetBalance.balance, assetBalance.assetID);
        assetBalance.balance = `${readableValue} ${assetInfo.symbol} [${assetBalance.balance}]`;
        balanceInfos.push(assetBalance);
      }
      this.setState({
        balanceInfos,
        balanceInfosOnePage: balanceInfos.slice(0, this.state.onePageNum),
      });
    } catch (error) {
      Feedback.toast.error(error || error.message);
    }
  }

  onChange = (currentPage) => {
    const startNo = (currentPage - 1) * this.state.onePageNum;
    const balanceInfos = this.state.balanceInfos.slice(startNo, startNo + this.state.onePageNum);
    this.setState({
      balanceInfosOnePage: balanceInfos,
    });
  }
  convertNumber = (number, decimals) => {
    let amount = new BigNumber(number);
    amount = amount.shiftedBy(parseInt(decimals * -1, 10)).toNumber();
    return amount;
  }
  convertAssetNumber = (assetInfo) => {
    assetInfo.amount = this.convertNumber(assetInfo.amount, assetInfo.decimals);
    assetInfo.addIssue = this.convertNumber(assetInfo.addIssue, assetInfo.decimals);
    assetInfo.upperLimit = this.convertNumber(assetInfo.upperLimit, assetInfo.decimals);
    return assetInfo;
  }
  onAssetSearch = async (value) => {
    const assetKey = value.key;
    if (utils.isEmptyObj(assetKey)) {
      return;
    }
    if (this.state.assetInfos[assetKey] != null) {
      this.setState({ assetInfo: [this.state.assetInfos[assetKey]] });
    } else {
      let assetInfo;
      if (assetKey[0] < '0' || assetKey[0] > '9') {
        assetInfo = await fractal.account.getAssetInfoByName(assetKey);
      } else {
        assetInfo = await fractal.account.getAssetInfoById(parseInt(assetKey, 10));
      }

      if (assetInfo == null) {
        Feedback.toast.error('无此资产信息');
        return;
      }

      assetInfo = this.convertAssetNumber(assetInfo);
      this.setState({ assetInfo: [assetInfo] });
    }
  }
  render() {
    return (
      <div>
        <IceContainer style={styles.container}>
          <h4 style={styles.title}>用户资产信息</h4>
          <IceContainer>
            <Row style={{ justifyContent: 'center' }}>
              <Col span="24" s="10" l="10">
                <Search
                  size="large"
                  autoWidth="true"
                  onSearch={this.onSearch.bind(this)}
                  placeholder="用户账号"
                />
              </Col>
            </Row>
          </IceContainer>

          <IceContainer>
            <Table
              dataSource={this.state.balanceInfosOnePage}
              hasBorder={false}
              style={{ padding: '0 20px 20px' }}
            >
              <Table.Column title="资产ID" dataIndex="assetID" width={50} />
              <Table.Column title="金额" dataIndex="balance" width={200} />
            </Table>
            <Pagination
              style={styles.pagination}
              onChange={this.handlePaginationChange}
              total={this.state.balanceInfos.length}
            />
          </IceContainer>
        </IceContainer>

        <IceContainer style={styles.container}>
          <h4 style={styles.title}>资产发行信息</h4>
          <IceContainer>
            <Row style={{ justifyContent: 'center' }}>
              <Col span="24" s="10" l="10">
                <Search
                  size="large"
                  autoWidth="true"
                  onSearch={this.onAssetSearch.bind(this)}
                  placeholder="资产ID/资产名称"
                />
              </Col>
            </Row>
          </IceContainer>

          <IceContainer>
            <Table
              dataSource={this.state.assetInfo}
              hasBorder={false}
              style={{ padding: '0 20px 20px' }}
            >
              <Table.Column title="资产ID" dataIndex="assetId" width={50} />
              <Table.Column title="名称" dataIndex="assetName" width={50} />
              <Table.Column title="符号" dataIndex="symbol" width={50} />
              <Table.Column title="创建区块高度" dataIndex="number" width={50} />
              <Table.Column title="已发行量" dataIndex="amount" width={50} />
              <Table.Column title="精度" dataIndex="decimals" width={50} />
              <Table.Column title="创建人" dataIndex="founder" width={50} />
              <Table.Column title="管理者" dataIndex="owner" width={50} />
              <Table.Column title="增发量" dataIndex="addIssue" width={50} />
              <Table.Column title="资产上限" dataIndex="upperLimit" width={50} />
              <Table.Column title="合约账号" dataIndex="contract" width={50} />
              <Table.Column title="描述" dataIndex="description" width={50} />
            </Table>
          </IceContainer>
        </IceContainer>
      </div>
    );
  }
}

const styles = {
  container: {
    margin: '20px',
    padding: '0 0 20px',
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
  link: {
    margin: '0 5px',
    color: 'rgba(49, 128, 253, 0.65)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  separator: {
    margin: '0 8px',
    display: 'inline-block',
    height: '12px',
    width: '1px',
    verticalAlign: 'middle',
    background: '#e8e8e8',
  },
  pagination: {
    textAlign: 'right',
    marginRight: '20px',
  },
};
