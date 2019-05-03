/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Search, Grid, Table, Feedback } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';
import IceContainer from '@icedesign/container';
import { getAssetInfoById, getTransactionByHash, getTransactionReceipt, getDposInfo } from '../../api';
import * as txParser from '../../utils/transactionParser';

const { Row, Col } = Grid;

export default class TransactionTable extends Component {
  static displayName = 'TransactionTable';

  constructor(props) {
    super(props);
    this.state = {
      txInfo: {},
      assetInfos: {},
      actions: [],
    };
  }

  onSearch = async (value) => {
    const hash = value.key;
    if (hash.indexOf('0x') === 0) {
      let resp = await getTransactionByHash([hash]);
      if (resp.data.result !== undefined) {
        let dposInfo;
        dposInfo = {};
        const dposResp = await getDposInfo();
        if (Object.prototype.hasOwnProperty.call(dposResp.data, 'error') && dposResp.data.result != null) {
          dposInfo = dposResp.data.result;
        }

        const transaction = resp.data.result;
        resp = await getTransactionReceipt([hash]);
        const receipt = resp.data.result;
        const parsedActions = [];
        const actionResults = receipt.actionResults;
        let i = 0;
        for (const actionInfo of transaction.actions) {
          if (this.state.assetInfos[actionInfo.assetID] === undefined) {
            resp = await getAssetInfoById([actionInfo.assetID]);
            this.state.assetInfos[actionInfo.assetID] = resp.data.result;
          }
          const parsedAction = txParser.parseAction(actionInfo, this.state.assetInfos[actionInfo.assetID], this.state.assetInfos, dposInfo);
          parsedAction.result = actionResults[i].status === 1 ? '成功' : `失败（${actionResults[i].error}）`;
          parsedAction.gasFee = `${actionResults[i].gasUsed}aft`;
          parsedAction.gasAllot = actionResults[i].gasAllot;
          parsedActions.push(parsedAction);
          i += 1;
        }
        transaction.actions = parsedActions;
        transaction.gasUsed = receipt.totalGasUsed;

        this.setState({
          txInfo: transaction,
          actions: transaction.actions,
        });
      } else {
        Feedback.toast.error('无法获取到交易信息');
      }
    } else {
      Feedback.toast.prompt('请输入十六进制的hash值');
    }
  }

  // value为filter的值，obj为search的全量值
  onFilterChange = () => {
  }

  renderGasAllot = (value, index, record) => {
    return record.gasAllot.map((gasAllot) => {
      const defaultTrigger = <Tag type="normal" size="small">{gasAllot.account}->{gasAllot.gas}aft</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{gasAllot.account}->{gasAllot.gas}aft</Balloon>;
    });
  }

  render() {
    return (
      <div>
        <IceContainer>
          <Row style={{ justifyContent: 'center' }}>
            <Col span="24" s="10" l="10">
              <Search
                size="large"
                autoWidth="true"
                onSearch={this.onSearch.bind(this)}
                placeholder="交易hash"
                onFilterChange={this.onFilterChange.bind(this)}
              />
            </Col>
          </Row>
        </IceContainer>

        <IceContainer style={styles.container}>
          <h4 style={styles.title}>交易信息</h4>
          <ul style={styles.summary}>
            <li style={styles.item}>
              <span style={styles.label}>TxHash:</span>
              <span style={styles.value}>
                {this.state.txInfo.txHash}
              </span>
            </li>
            <li style={styles.item}>
              <span style={styles.label}>Block Height:</span>
              <span style={styles.value}>{this.state.txInfo.blockNumber}</span>
            </li>
            <li style={styles.item}>
              <span style={styles.label}>Block Hash:</span>
              <span style={styles.value}>{this.state.txInfo.blockHash}</span>
            </li>
            <li style={styles.item}>
              <span style={styles.label}>Gas Used:</span>
              <span style={styles.value}>{this.state.txInfo.gasUsed}</span>
            </li>
            <li style={styles.item}>
              <span style={styles.label}>Gas Price:</span>
              <span style={styles.value}>{this.state.txInfo.gasPrice}</span>
            </li>
          </ul>
        </IceContainer>
        <br />
        <br />
        <IceContainer>
          <h4 style={styles.title}>Action信息</h4>
          <Table
            getRowClassName={(record, index) => {
                return `progress-table-tr progress-table-tr${index}`;
              }}
            dataSource={this.state.actions}
          >
            <Table.Column title="类型" dataIndex="actionType" width={80} />
            <Table.Column title="发送账号" dataIndex="from" width={100} />
            <Table.Column title="接收账号" dataIndex="to" width={100} />
            <Table.Column title="详情" dataIndex="detailInfo" width={200} />
            <Table.Column title="结果" dataIndex="result" width={100} />
            <Table.Column title="总手续费" dataIndex="gasFee" width={100} />
            <Table.Column title="手续费分配详情" dataIndex="gasAllot" width={150} cell={this.renderGasAllot.bind(this)} />
          </Table>
        </IceContainer>
      </div>
    );
  }
}

const styles = {
  container: {
    margin: '0',
    padding: '0',
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
  summary: {
    padding: '20px',
  },
  item: {
    height: '40px',
    lineHeight: '40px',
  },
  label: {
    display: 'inline-block',
    fontWeight: '500',
    minWidth: '74px',
    width: '150px',
  },
};
