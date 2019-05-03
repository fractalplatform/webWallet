/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import { Table, Progress, Pagination } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import eventProxy from '../../../../utils/eventProxy';
import {getAssetInfoById, getTransactionReceipt, getDposInfo, getBlockByNum } from '../../../../api'

import {decode} from 'rlp'
import BigNumber from "bignumber.js"
import * as txParser from '../../../../utils/transactionParser';
import { Tag, Balloon } from '@alifd/next';

export default class TransactionsTable extends Component {
  static displayName = 'TransactionsTable';

  constructor(props) {
    super(props);

    this.state = {
      dataSource: [],
      current: 1,
      assetInfos: {},
    };
  }
  getReadableNumber = (value, assetID) => {
    let {assetInfos} = this.state;
    var decimals = assetInfos[assetID].decimals;

    var renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(decimals * -1);
    
    BigNumber.config({ DECIMAL_PLACES: 6 });
    renderValue = renderValue.toString(10);
    return renderValue;
  }

  componentDidMount() {
  	var _this = this;
    eventProxy.on('curHeight', async (msg) => {
      var curHeight = msg;
      var transactions = [];
      var maxLookbackNum = 100;
      var dposInfo;
      resp = await getDposInfo();
      if (resp.data.hasOwnProperty('result') && resp.data.result != null) {
        dposInfo = resp.data.result;
      }

      for (var height = curHeight; height > curHeight - maxLookbackNum && height > 0; height--) {
        var resp = await getBlockByNum([height, true]);
        var curBlockInfo = resp.data.result; 
        for (let transaction of curBlockInfo.transactions) {
          var parsedActions = [];
          var i = 0;
          var receiptResp = await getTransactionReceipt([transaction.txHash]);
          var actionResults = receiptResp.data.result.actionResults;
          for (let actionInfo of transaction.actions) {
            if (_this.state.assetInfos[actionInfo.assetID] == undefined) {
              var resp = await getAssetInfoById([actionInfo.assetID]);
              _this.state.assetInfos[actionInfo.assetID] = resp.data.result;
            }
            var parsedAction = txParser.parseAction(actionInfo, _this.state.assetInfos[actionInfo.assetID], _this.state.assetInfos, dposInfo);
            parsedAction['result'] = actionResults[i].status == 1 ? '成功' : '失败（' + actionResults[i].error + '）';
            parsedAction['gasFee'] = actionResults[i].gasUsed + 'aft';
            parsedAction['fromAccount'] = actionInfo.from;
            parsedAction['gasAllot'] = actionResults[i].gasAllot;
            parsedActions.push(parsedAction);
            i++;
          }
          transaction["actions"] = parsedActions;
          transactions.push(transaction);
          if (transactions.length >= 20) {
            break;
          }
        }
        if (transactions.length >= 20) {
          break;
        }
      }

      _this.state.dataSource = transactions;
      _this.setState({
        dataSource: _this.state.dataSource.slice(0, 20),
      });
    });
  }

  renderFromAccount = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      var defaultTrigger = <Tag type="normal" size="small">{item.fromAccount}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{item.fromAccount}</Balloon>;
    });
  }

  renderActionType = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      var defaultTrigger = <Tag type="normal" size="small">{item.actionType}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{item.actionType}</Balloon>;
    });
  }

  renderDetailInfo = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      var defaultTrigger = <Tag type="normal" size="small">{item.detailInfo}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{item.detailInfo}</Balloon>;
    });
  }

  renderResult = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      var defaultTrigger = <Tag type="normal" size="small">{item.result}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{item.result}</Balloon>;
    });
  }

  renderGasFee = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      var defaultTrigger = <Tag type="normal" size="small">{item.gasFee}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{item.gasFee}</Balloon>;
    });
  }
  renderGasAllot = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions[0].gasAllot.map((gasAllot) => {
              var defaultTrigger = <Tag type="normal" size="small">{gasAllot.account}->{gasAllot.gas}aft</Tag>;
              return <Balloon  trigger={defaultTrigger} closable={false}>{gasAllot.account}->{gasAllot.gas}aft</Balloon>;
            });
  }
  onPageChange = (pageNo) => {
    this.setState({
      current: pageNo,
    });
  };

  render() {
    return (
      <div className="progress-table">
        <IceContainer className="tab-card" title="交易">
          <Table primaryKey="txHash"
            dataSource={this.state.dataSource}
          >
            <Table.Column title="交易Hash" dataIndex="txHash" width={100} />
            <Table.Column title="区块Hash" dataIndex="blockHash" width={100} />
            <Table.Column title="账户" dataIndex="parsedActions" width={100} cell={this.renderFromAccount.bind(this)}/>
            <Table.Column title="类型" dataIndex="parsedActions" width={100} cell={this.renderActionType.bind(this)}/>
            <Table.Column title="详情" dataIndex="parsedActions" width={200} cell={this.renderDetailInfo.bind(this)} />
            <Table.Column title="结果" dataIndex="parsedActions" width={80} cell={this.renderResult.bind(this)} />
            <Table.Column title="手续费" dataIndex="parsedActions" width={100} cell={this.renderGasFee.bind(this)} />
            <Table.Column title="手续费分配详情" dataIndex="parsedActions" width={150} cell={this.renderGasAllot.bind(this)} />

          </Table>
        </IceContainer>
      </div>
    );
  }
}

const styles = {
  paginationWrapper: {
    display: 'flex',
    padding: '20px 0 0 0',
    flexDirection: 'row-reverse',
  },
};
