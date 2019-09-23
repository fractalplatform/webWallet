/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import { Table, Feedback, Dialog, Button } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';
import IceContainer from '@icedesign/container';
import copy from 'copy-to-clipboard';
import * as fractal from 'fractal-web3';
import BigNumber from "bignumber.js"

import * as utils from '../utils/utils';
import { T } from '../utils/lang';
import * as txParser from '../utils/transactionParser';

export default class TransactionList extends Component {
  static displayName = 'TransactionList';

  constructor(props) {
    super(props);

    this.state = {
      txHashSet: {},
      transactions: [],
      current: 1,
      assetInfos: {},
      innerTxVisible: false,
      innerTxInfos: [],
      maxTxNum: 0,
    };
  }

  componentDidMount() {
    fractal.account.getAssetInfoById(0).then(assetInfo => {
      this.state.assetInfos[0] = assetInfo;
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.txFrom.maxTxNum != null) {
      this.state.maxTxNum = nextProps.txFrom.maxTxNum;
    }
    if (nextProps.txFrom.blockHeight != null) {
      this.getTxInfoByBlock(nextProps.txFrom.blockHeight);
    } else if (nextProps.txFrom.txHashArr != null) {
      this.getTxInfoByTxHash(nextProps.txFrom.txHashArr);
    }
  }

  getTxInfoByBlock(blockHeight) {
    fractal.ft.getBlockByNum(blockHeight, true).then(async(curBlockInfo) => {
      this.processTxs(curBlockInfo.transactions);
    });
  }

  getTxInfoByTxHash(txHashArr) {
    let txPromiseArr = [];
    txHashArr.map(txHash => {
      if (this.state.txHashSet[txHash] == null) {
        txPromiseArr.push(fractal.ft.getTransactionByHash(txHash));
      }
    });
    Promise.all(txPromiseArr).then(txInfos => {
      this.processTxs(txInfos);
    })
  }

  processTxs = async (txInfos) => {
    const txSet = {};
    let receiptPromiseArr = [];
    const transactions = [];
    const _this = this;
    for (const transaction of txInfos) {
      const internalTx = await fractal.ft.getInternalTxByHash(transaction.txHash);
      if (internalTx != null) {
        transaction.innerActions = internalTx.actions[0].internalActions;
      } else {
        transaction.innerActions = [];
      }
      receiptPromiseArr.push(fractal.ft.getTransactionReceipt(transaction.txHash));
      txSet[transaction.txHash] = transaction;
    }
    const dposInfo = await fractal.dpos.getDposInfo();
    if (receiptPromiseArr.length > 0) {
      Promise.all(receiptPromiseArr).then(async (receipts) => {
        for (const receipt of receipts) {
          if (receipt == null) continue;
          let i = 0;
          const transaction = txSet[receipt.txHash];
          let parsedActions = [];
          const actionResults = receipt.actionResults;
          for (let actionInfo of transaction.actions) {
            if (_this.state.assetInfos[actionInfo.assetID] == null) {
              const assetInfo = await fractal.account.getAssetInfoById(actionInfo.assetID);
              _this.state.assetInfos[actionInfo.assetID] = assetInfo;
            }
            var parsedAction = txParser.parseAction(actionInfo, _this.state.assetInfos[actionInfo.assetID], _this.state.assetInfos, dposInfo);
            parsedAction['result'] = actionResults[i].status == 1 ? T('成功') : T('失败') + '（' + actionResults[i].error + '）';
            parsedAction['gasFee'] = utils.getGasEarned(transaction.gasPrice, actionResults[i].gasUsed, _this.state.assetInfos[transaction.gasAssetID]) + ' ft';
            parsedAction['fromAccount'] = actionInfo.from;
            parsedAction['gasAllot'] = actionResults[i].gasAllot;
            parsedActions.push(parsedAction);
            i++;
          }
          transaction["actions"] = parsedActions;
          transactions.push(transaction);
          this.state.txHashSet[transaction.txHash] = 1;
          if (transactions.length >= 20) {
            break;
          }
        }
        if (this.state.maxTxNum > 0) {
          const txNum = this.state.transactions.length + transactions.length;
          if (txNum > this.state.maxTxNum) {
            this.state.transactions = this.state.transactions.slice(0, this.state.transactions.length - (txNum - this.state.maxTxNum));
          }
        } 
        _this.setState({ transactions: [...transactions, ...this.state.transactions] });
      });
    }
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


  renderFromAccount = (value, index, record) => {
    var parseActions = record.actions;
    return parseActions.map((item)=>{
      let accountName = item.fromAccount;
      if (utils.isEmptyObj(accountName)) {
        accountName = T('无');
      }
      var defaultTrigger = <Tag type="normal" size="small">{accountName}</Tag>;
      return <Balloon  trigger={defaultTrigger} closable={false}>{accountName}</Balloon>;
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
    const parseActions = record.actions;
    if (utils.isEmptyObj(parseActions[0].gasAllot)) {
      return '';
    }
    return parseActions[0].gasAllot.map((gasAllot) => {
      let reason = T('作为矿工');
      if (gasAllot.typeId === 0) {
        reason = T('资产的发行者');
      } else if (gasAllot.typeId === 1) {
        reason = T('合约的发行者');
      }
      const earnedGas = utils.getGasEarned(record.gasPrice, gasAllot.gas, this.state.assetInfos[record.gasAssetID]);
      const defaultTrigger = <Tag type="normal" size="small">{gasAllot.name}{reason}分到 {earnedGas}ft</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{gasAllot.name}{reason}分到 {earnedGas}ft</Balloon>;
    });
  }

  copyValue = (value) => {
    copy(value);
    Feedback.toast.success(T('已复制到粘贴板'));
  }

  renderHash = (value) => {
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={T('点击可复制')} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }

  renderInnerActions = (internalActions, index, record) => {
    return (internalActions == null || internalActions.length == 0) ? T('无') : <Button type="primary" onClick={this.showInnerTxs.bind(this, internalActions)}>查看</Button>;
  }

  getValue = async (assetId, value) => {
    let assetInfo = this.state.assetInfos[assetId];
    if (assetInfo == null) {
      assetInfo = await fractal.account.getAssetInfoById(assetId);
    }
    let renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(assetInfo.decimals * -1);

    let decimalPlaces = assetInfo.decimals > 6 ? 6 : assetInfo.decimals;
    if (renderValue.comparedTo(new BigNumber(0.000001)) < 0) {
      decimalPlaces = assetInfo.decimals;
    }

    BigNumber.config({ DECIMAL_PLACES: decimalPlaces });
    renderValue = renderValue.toString(10) + assetInfo.symbol;
    return renderValue;
  }

  showInnerTxs = async (internalActions) => {
    const actions = [];
    for (const internalAction of internalActions) {
      let action = {};
      action.actionType = txParser.getActionTypeStr(internalAction.action.type);
      action.fromAccount = internalAction.action.from;
      action.toAccount = internalAction.action.to;
      action.assetId = internalAction.action.assetID;
      action.value = await this.getValue(action.assetId, internalAction.action.value);
      action.payload = internalAction.action.payload;
      actions.push(action);
    }
    this.setState({
      innerTxVisible: true,
      innerTxInfos: actions,
    })
  }

  onPageChange = (pageNo) => {
    this.setState({
      current: pageNo,
    });
  };
  onInnerTxClose = () => {
    this.setState({
      innerTxVisible: false,
    });
  };
  render() {
    return (
      <div className="progress-table">
        <IceContainer className="tab-card" title={T("交易")}>
          <Table primaryKey="txHash"
            dataSource={this.state.transactions}
          >
            <Table.Column title={T("交易Hash")} dataIndex="txHash" width={80} cell={this.renderHash.bind(this)}/>
            <Table.Column title={T("区块Hash")} dataIndex="blockHash" width={80} cell={this.renderHash.bind(this)}/>
            <Table.Column title={T("区块高度")} dataIndex="blockNumber" width={80}/>
            <Table.Column title={T("发起账户")} dataIndex="parsedActions" width={100} cell={this.renderFromAccount.bind(this)}/>
            <Table.Column title={T("类型")} dataIndex="parsedActions" width={100} cell={this.renderActionType.bind(this)}/>
            <Table.Column title={T("内部交易")} dataIndex="innerActions" width={80} cell={this.renderInnerActions.bind(this)} />
            <Table.Column title={T("详情")} dataIndex="parsedActions" width={100} cell={this.renderDetailInfo.bind(this)} />
            <Table.Column title={T("结果")} dataIndex="parsedActions" width={80} cell={this.renderResult.bind(this)} />
            <Table.Column title={T("总手续费")} dataIndex="parsedActions" width={100} cell={this.renderGasFee.bind(this)} />
            <Table.Column title={T("手续费分配详情")} dataIndex="parsedActions" width={150} cell={this.renderGasAllot.bind(this)} />

          </Table>
        </IceContainer>
        <Dialog
          style={{ width: 800 }}
          visible={this.state.innerTxVisible}
          title={T("内部交易信息")}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onInnerTxClose.bind(this)}
          onCancel={this.onInnerTxClose.bind(this)}
          onClose={this.onInnerTxClose.bind(this)}
        >
          <div className="editable-table">
            <IceContainer>
              <Table dataSource={this.state.innerTxInfos} hasBorder={false} resizable>
                <Table.Column title={T("类型")} dataIndex="actionType" width={80} />
                <Table.Column title={T("发起账号")} dataIndex="fromAccount" width={100} />
                <Table.Column title={T("接收账号")} dataIndex="toAccount" width={80} />
                <Table.Column title={T("资产ID")} dataIndex="assetId" width={80} />
                <Table.Column title={T("金额")} dataIndex="value" width={80} />
                <Table.Column title={T("额外信息")} dataIndex="payload" width={150} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>
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
