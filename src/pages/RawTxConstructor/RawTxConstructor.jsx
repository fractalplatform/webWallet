/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Input, Feedback, Select } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import { Button } from '@alifd/next';
import { encode } from 'rlp';
import * as fractal from 'fractal-web3';
import BigNumber from 'bignumber.js';
import copy from 'copy-to-clipboard';
import * as actionTypes from '../../utils/constant'
import * as utils from '../../utils/utils'

const txTypes = [{ value: actionTypes.TRANSFER, label: '转账'},{value: actionTypes.CREATE_CONTRACT,label: '创建合约'},
                { value: actionTypes.CREATE_NEW_ACCOUNT, label: '创建账户' },{ value: actionTypes.UPDATE_ACCOUNT, label: '更新账户'},{ value: actionTypes.UPDATE_ACCOUNT_AUTHOR, label: '更新账户权限' },
                { value: actionTypes.ISSUE_ASSET, label: '发行资产' },{ value: actionTypes.INCREASE_ASSET, label: '增发资产' },{ value: actionTypes.DESTORY_ASSET, label: '销毁资产' },
                { value: actionTypes.SET_ASSET_OWNER, label: '设置资产所有者' },{ value: actionTypes.SET_ASSET_FOUNDER, label: '设置资产创办者' },{ value: actionTypes.REG_CANDIDATE, label: '注册候选者' },
                { value: actionTypes.UPDATE_CANDIDATE, label: '更新候选者' },{ value:  actionTypes.UNREG_CANDIDATE, label: '注销候选者' },{ value: actionTypes.VOTE_CANDIDATE, label: '给候选者投票' },
                { value: actionTypes.REFUND_DEPOSIT, label: '取回抵押金' }];

export default class RawTxConstructor extends Component {
  static displayName = 'RawTxConstructor';

  constructor(props) {
    super(props);
    this.state = {
      htmlType: 'password',
      showPrivateKeyTip: '显示私钥',
      txResult: '',
      txInfo: '',
      payload: '',
      privateKey: '',
      receipt: '',
      txTypeInfos: txTypes,
      payloadInfos: [],
      payloadElements: [],
      updateAuthorTypes: [{value:0, label:'添加权限'}, {value:1, label:'更新权限'}, {value:2, label:'删除权限'}],
      resultTypes: [{value:0, label:'失败'}, {value:1, label:'成功'}],
      checkProcedure: '',
      historyInfo: {},
    };
  }

  rlpEncode = () => {
    const payloadInfos = this.state.payload.split(',');
    const encodeInfos = [];
    for (const payloadInfo of payloadInfos) {
      let payload = payloadInfo.trim();
      if (payload.charAt(0) === '"' && payload.charAt(payload.length - 1) === '"') {
        payload = payload.substr(1, payload.length - 2);
        encodeInfos.push(payload);
      } else {
        const number = new BigNumber(payload);
        encodeInfos.push(number.toNumber());
      }
    }
    let rlpData = encode(encodeInfos);
    rlpData = `0x${rlpData.toString('hex')}`;
    copy(rlpData);
    Feedback.toast.success('rlp编码结果已拷贝到剪贴板');
  }

  handlePayloadChange = (v) => {
    this.state.payload = v;
  }

  handlePrivateKeyChange = (v) => {
    this.state.privateKey = v;
  }
  getNumber = (numberStr) => {
    if (utils.isEmptyObj(numberStr)) {
      return '';
    }
    return new BigNumber(numberStr).toNumber();
  }

  // const payload = '0x' + encode([threshold, updateAuthorThreshold, [UpdateAuthorType.Delete, [owner, weight]]]).toString('hex');
  generateTxInfo = () => {
    const actionType = this.state['actionType'];
    this.state.payloadElements = [];
    if (actionType == actionTypes.UPDATE_ACCOUNT_AUTHOR) {
      this.state.payloadElements = [this.getNumber(this.state[actionType + '-' + 0].value), this.getNumber(this.state[actionType + '-' + 1].value), 
                                   [this.getNumber(this.state[actionType + '-' + 2].value), [this.state[actionType + '-' + 3].value, this.getNumber(this.state[actionType + '-' + 4].value)]]];
    } else if (actionType != actionTypes.CREATE_CONTRACT) {
      const payloadInfoNum = (this.state.payloadInfos.length + 2) / 3;
      for (let i = 0; i < payloadInfoNum; i++) {
        let actionValue = this.state[actionType + '-' + i];
        if (actionValue == null) {
          this.state.payloadElements.push('');
        } else if (actionValue.isNumber) {
          this.state.payloadElements.push(new BigNumber(actionValue.value).toNumber());
        } else {
          this.state.payloadElements.push(actionValue.value);
        }
      }
    }
    let payload = '';
    if (actionType != actionTypes.CREATE_CONTRACT) {
      payload = '0x' + (this.state.payloadElements.length > 0 ? encode(this.state.payloadElements).toString('hex') : '');
    } else {
      payload = this.state[actionType + '-' + 0].value;
    }
    
    let zeros = '';
    if (this.state.zeroNum != null && this.state.zeroNum > 0) {
      zeros = '0'.repeat(this.state.zeroNum);
    }
    const txInfo = {
      gasAssetId: this.getNumber(this.state['gasAssetId']),
      gasPrice: utils.isEmptyObj(this.state['gasPrice']) ? '' : this.getNumber(this.state['gasPrice'] + '0'.repeat(9)),
      actions: [{
        actionType: this.getNumber(this.state['actionType']),
        accountName: this.state['accountName'], 
        nonce: this.getNumber(this.state['nonce']), 
        gasLimit: this.getNumber(this.state['gasLimit']), 
        toAccountName: this.state['toAccountName'], 
        assetId: this.getNumber(this.state['assetId']), 
        amount: this.getNumber(this.state['amount'] + zeros), 
        payload, 
        remark: this.state['remark'], 
      }]
    };
    this.setState({ txInfo: JSON.stringify(txInfo) });
  }

  handleTxInfoChange = (v) => {
    this.setState({ txInfo: v });
  }

  showPrivateKey = () => {
    const htmlType = this.state.htmlType === 'password' ? 'text' : 'password';
    const showPrivateKeyTip = this.state.showPrivateKeyTip === '显示私钥' ? '隐藏私钥' : '显示私钥';
    this.setState({
      htmlType,
      showPrivateKeyTip,
    });
  }
  addSendErrorTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = Constant.TxStatus.SendError;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.txHash = '0x';
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = Constant.BlockStatus.Unknown;
    txInfo.actions[0].status = 0;
    txInfo.actions[0].actionIndex = 0;
    txInfo.actions[0].gasUsed = 0;
    txInfo.actions[0].gasAllot = [];

    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      let accountTxInfoSet = allTxInfoSet[txInfo.accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[txInfo.accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[txInfo.accountName] = {};
      allTxInfoSet[txInfo.accountName].txInfos = [txInfo];
    }
    utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet);
  }

  sendTransaction = () => {
    // if (!ethUtil.isValidPrivate(Buffer.from(utils.hex2Bytes(this.state.privateKey)))) {
    //   Feedback.toast.error('请输入合法的私钥');
    //   return;
    // }
    let txInfo = this.state.txInfo.trim();
    // const regex = /'/gi;
    // txInfo = txInfo.replace(regex, '"');
    if (txInfo.length > 130 && txInfo.charAt(0) === '{' && txInfo.charAt(txInfo.length - 1) === '}') {
      try {
        const txObj = JSON.parse(txInfo);
        fractal.ft.signTx(txObj, this.state.privateKey).then(signInfo => {
          fractal.ft.sendSingleSigTransaction(txObj, signInfo).then(txHash => {
            this.setState({ txResult: txHash });
          }).catch(error => {
            Feedback.toast.error(error);
            this.addSendErrorTxToFile(txObj);
            this.setState({ txResult: error });
          });
        }).catch(error => {
          Feedback.toast.error(error);
          this.setState({ txResult: error });
        });
       
      } catch (error) {
        Feedback.toast.error(error);
        this.setState({ txResult: error });
      }
    } else {
      Feedback.toast.prompt('请输入合规的交易信息');
    }
  }
  getReceipt = () => {
    if (!utils.isEmptyObj(this.state.txResult) && this.state.txResult.indexOf('0x') == 0) {
      fractal.ft.getTransactionReceipt(this.state.txResult).then(resp => {
        this.setState({ receipt: JSON.stringify(resp) });
      });
    } else {
      Feedback.toast.prompt('无法获取receipt');
    }
  }
  getTxInfo = () => {
    if (this.state.txResult != null) {
      fractal.ft.getTransactionByHash(this.state.txResult).then(resp => {
        this.setState({ receipt: JSON.stringify(resp) });
      });
    } else {
      Feedback.toast.prompt('无法获取交易信息');
    }
  }
  onChangeTxType = (txType) => {
    this.state.actionType = txType;
    this.state.payloadInfos = [];
    switch (txType) {
      case actionTypes.TRANSFER:
        break;
      case actionTypes.CREATE_CONTRACT:
        this.state.payloadInfos.push(
            <Input hasClear
            style={styles.commonElement}
            addonBefore="合约byteCode:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.CREATE_CONTRACT, 0, false)}/>
            );
        break;    
      case actionTypes.CREATE_NEW_ACCOUNT:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="新账户名:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.CREATE_NEW_ACCOUNT, 0, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="创办者:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.CREATE_NEW_ACCOUNT, 1, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="公钥:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.CREATE_NEW_ACCOUNT, 2, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="描述:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.CREATE_NEW_ACCOUNT, 3, false)}/>
          );
        break;
      case actionTypes.UPDATE_ACCOUNT:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="创办者:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT, 0, false)}/>
          );
        break;
      case actionTypes.UPDATE_ACCOUNT_AUTHOR:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="执行交易阈值:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT_AUTHOR, 0, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="更新权限所需阈值:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT_AUTHOR, 1, true)}/>,<br/>,<br/>,
          <Select hasClear
            style={styles.commonElement}
            placeholder="选择操作类型"
            dataSource={this.state.updateAuthorTypes}
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT_AUTHOR, 2, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="用户名/地址/公钥:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT_AUTHOR, 3, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="权重:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_ACCOUNT_AUTHOR, 4, true)}/>
          );
        break;
      case actionTypes.ISSUE_ASSET:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产名:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 0, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="符号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 1, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="本次发行量:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 2, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="精度:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 3, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="创办者:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 4, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="管理者:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 5, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="发行上限:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 6, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="合约账号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 7, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产描述:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.ISSUE_ASSET, 8, false)}/>
          );
        break;
      case actionTypes.INCREASE_ASSET:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产ID:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.INCREASE_ASSET, 0, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="增发数量:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.INCREASE_ASSET, 1, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="接收资产账号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.INCREASE_ASSET, 2, false)}/>
          );
        break;
      case actionTypes.DESTORY_ASSET:
        break;
      case actionTypes.SET_ASSET_OWNER:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产ID:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.SET_ASSET_OWNER, 0, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="新管理者账号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.SET_ASSET_OWNER, 1, false)}/>
          );
        break;
      case actionTypes.SET_ASSET_FOUNDER:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产ID:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.SET_ASSET_FOUNDER, 0, true)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="新创办者账号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.SET_ASSET_FOUNDER, 1, false)}/>
          );
        break;
      case actionTypes.REG_CANDIDATE:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="URL:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.REG_CANDIDATE, 0, false)}/>
          );
        break;
      case actionTypes.UPDATE_CANDIDATE:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="URL:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.UPDATE_CANDIDATE, 0, false)}/>
          );
        break;
      case actionTypes.UNREG_CANDIDATE:
        break;
      case actionTypes.VOTE_CANDIDATE:
        this.state.payloadInfos.push(
          <Input hasClear
            style={styles.commonElement}
            addonBefore="候选者账号:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.VOTE_CANDIDATE, 0, false)}/>,<br/>,<br/>,
          <Input hasClear
            style={styles.commonElement}
            addonBefore="投票数:"
            size="medium"
            onChange={this.handleElementChange.bind(this, actionTypes.VOTE_CANDIDATE, 1, true)}/>
          );
        break;
      case actionTypes.REFUND_DEPOSIT:
        break;
      default:
        console.log('error action type:' + actionInfo.type);
    }
    this.setState({ payloadInfos: this.state.payloadInfos });
  }
  handleElementChange = (actionType, index, isNumber, v) => {
    this.state[actionType + '-' + index] = { value: v, isNumber };
  }
  handleActionElementChange = (actionElement, v) => {
    this.state[actionElement] = v;
  }
  onChangeZeroNumType = (v) => {
    this.state.zeroNum = v;
  }
  render() {
    return (
      <div>
        <Input hasClear
          htmlType={this.state.htmlType}
          style={styles.otherElement}
          maxLength={66}
          hasLimitHint
          addonBefore="私钥:"
          size="medium"
          placeholder="私钥用于对交易信息进行签名，无需0x前缀"
          onChange={this.handlePrivateKeyChange.bind(this)}
        />
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.showPrivateKey.bind(this)}>{this.state.showPrivateKeyTip}</Button>
        <br />
        <br />
        <Select
            style={styles.otherElement}
            placeholder="选择交易类型"
            onChange={this.onChangeTxType.bind(this)}
            dataSource={this.state.txTypeInfos}
          />
        <br />
        <br />
        <IceContainer style={styles.container} title='通用信息'>
          <Input hasClear
            style={styles.commonElement}
            addonBefore="nonce值:"
            size="medium"
            placeholder="可选填"
            onChange={this.handleActionElementChange.bind(this, 'nonce')}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="from账号:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'accountName')}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="to账号:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'toAccountName')}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="资产ID:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'assetId')}
          />
          <br />
          <br />
          <Input hasClear
            style={{width:500}}
            addonBefore="资产数量:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'amount')}
          />
          &nbsp;&nbsp;
          <Select
            style={{width:150}}
            placeholder="补足0️个数"
            onChange={this.onChangeZeroNumType.bind(this)}
            dataSource={[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="交易备注:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'remark')}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="Gas资产ID:"
            size="medium"
            defaultValue='0'
            onChange={this.handleActionElementChange.bind(this, 'gasAssetId')}
          />
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="Gas单价（gaft）:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'gasPrice')}
          />
          <br />
          1gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
          <br />
          <br />
          <Input hasClear
            style={styles.commonElement}
            addonBefore="Gas上限:"
            size="medium"
            onChange={this.handleActionElementChange.bind(this, 'gasLimit')}
          />
        </IceContainer>
        
        <br />
        <br />
        <IceContainer style={styles.container} title='payload信息'>
          {this.state.payloadInfos}    
        </IceContainer>
        <br />
        <br />
        <Button type="primary" onClick={this.generateTxInfo.bind(this)}>生成交易内容</Button>
        <br />
        <br />
        <Input multiple
          rows="13"
          style={styles.otherElement}
          addonBefore="交易内容:"
          size="medium"
          value={this.state.txInfo}
          onChange={this.handleTxInfoChange.bind(this)}
        />
        <br />
        <br />       
        <Button type="primary" onClick={this.sendTransaction.bind(this)}>发送交易</Button>
        <br />
        <br />
        <Input multiple
          rows="2"
          style={styles.otherElement}
          addonBefore="交易结果:"
          size="medium"
          value={this.state.txResult}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.getReceipt.bind(this)}>获取Receipt</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.getTxInfo.bind(this)}>获取交易</Button>
        <br />
        <br />
        <Input multiple
          rows="10"
          style={styles.otherElement}
          addonBefore="Receipt/交易"
          size="medium"
          value={this.state.receipt}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.checkResult.bind(this)}>校验链上相关状态</Button>
        <br />
        <br />
        <Input multiple
          rows="10"
          style={styles.otherElement}
          addonBefore="校验过程"
          size="medium"
          value={this.state.checkProcedure}
        />
      </div>
    );
  }
  getAseetBalance = (account, assetId) => {
    for (const balanceInfo of account.balances) {
      if (balanceInfo.assetID == assetId) {
        return balanceInfo.balance;
      }
    }
    return 0;
  }
  checkResult = async () => {
    this.setState({ checkProcedure: '' });
    let checkInfo = '';
    let newFromAccount = null;
    let newToAccount = null;
    if (!utils.isEmptyObj(this.state['accountName'])) {
      newFromAccount = await fractal.account.getAccountByName(this.state['accountName']);
    }
    if (!utils.isEmptyObj(this.state['toAccountName'])) {
      newToAccount = await fractal.account.getAccountByName(this.state['toAccountName']);
    }
    const historyTxInfo = this.state.historyInfo.txInfo;
    const oldFromAccount = this.state.historyInfo.fromAccount;
    const oldToAccount = this.state.historyInfo.toAccount;
    if (!utils.isEmptyObj(this.state.txResult) && this.state.txResult.indexOf('0x') == 0) {
      fractal.ft.getTransactionReceipt(this.state.txResult).then(receipt => {
        const resultStatus = receipt.actionResults[0].status == 1;
        // 1：先计算手续费
        const totalGasFee = new BigNumber(receipt.totalGasUsed).multipliedBy(new BigNumber(historyTxInfo.gasPrice));
        const transferAssetId = historyTxInfo.actions[0].assetId;
        // 2：根据各交易类型分别校验数据
        // 2.2: 先校验结果是成功的情况
        if (resultStatus) {
          let result = true;
          switch (this.state.actionType) {
            case actionTypes.TRANSFER:
              const oldFromFTBalance = this.getAssetBalance(oldFromAccount, 0);
              const newFromFTBalance = this.getAssetBalance(newFromAccount, 0);
              const oldFromBalance = this.getAssetBalance(oldFromAccount, transferAssetId);
              const newFromBalance = this.getAssetBalance(newFromAccount, transferAssetId);
              const oldToBalance = this.getAssetBalance(oldToAccount, transferAssetId);
              const newToBalance = this.getAssetBalance(newToAccount, transferAssetId);
              const transferValue = new BigNumber(historyTxInfo.txInfo.actions[0].amount);
              if (transferAssetId == 0) {
                if (new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).comparedTo(totalGasFee.add(transferValue)) == 0) {
                  checkInfo += '发送账户金额变化正常，减少的FT总金额为：' + new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '发送账户金额变化异常，实际减少的FT总金额为：' + new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).toNumber();
                  checkInfo += '\n应该减少的总金额为：' + totalGasFee.add(transferValue).toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n接收账户金额变化正常，增加的FT总金额为：' + new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  this.setState({ checkProcedure: checkInfo });
                }
                else {
                  checkInfo += '\n接收账户金额变化异常，增加的FT总金额为：' + new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  checkInfo += '\n应该增加的总金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
              } else {
                if (new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).comparedTo(totalGasFee) == 0) {
                  checkInfo += '发送账户FT资产金额变化正常，减少的FT总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '发送账户金额变化异常，实际减少的FT总金额为：' + new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).toNumber();
                  checkInfo += '应该减少的总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(oldFromBalance).minus(new BigNumber(newFromBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n发送账户ID为[' + transferAssetId + ']的资产金额变化正常，减少金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '\n发送账户ID为[' + transferAssetId + ']的资产金额变化异常，实际减少的金额为：' + new BigNumber(oldFromBalance).minus(new BigNumber(newFromBalance)).toNumber();
                  checkInfo += '，应减少金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n接收账户金额变化正常，增加ID为[' + transferAssetId + ']的资产金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                }
                else {
                  checkInfo += '\n接收账户金额变化异常，增加ID为[' + transferAssetId + ']的资产金额为：' + new BigNumber(newToFTBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  checkInfo += '，应该增加的金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (resultStatus != result) {
                  Feedback.toast.prompt('交易执行结果异常！');
                }
              }
              break;
            case actionTypes.CREATE_CONTRACT:
              break;    
            case actionTypes.CREATE_NEW_ACCOUNT:
              break;
            case actionTypes.UPDATE_ACCOUNT:
              break;
            case actionTypes.UPDATE_ACCOUNT_AUTHOR:
              break;
            case actionTypes.ISSUE_ASSET:
              break;
            case actionTypes.INCREASE_ASSET:
              break;
            case actionTypes.DESTORY_ASSET:
              break;
            case actionTypes.SET_ASSET_OWNER:
              break;
            case actionTypes.SET_ASSET_FOUNDER:
              break;
            case actionTypes.REG_CANDIDATE:
              break;
            case actionTypes.UPDATE_CANDIDATE:
              break;
            case actionTypes.UNREG_CANDIDATE:
              break;
            case actionTypes.VOTE_CANDIDATE:
              break;
            case actionTypes.REFUND_DEPOSIT:
              break;
            default:
              console.log('error action type:' + actionInfo.type);
          }
        } else {
          let result = true;
          switch (this.state.actionType) {
            case actionTypes.TRANSFER:
              const oldFromFTBalance = this.getAssetBalance(oldFromAccount, 0);
              const newFromFTBalance = this.getAssetBalance(newFromAccount, 0);
              const oldFromBalance = this.getAssetBalance(oldFromAccount, transferAssetId);
              const newFromBalance = this.getAssetBalance(newFromAccount, transferAssetId);
              const oldToBalance = this.getAssetBalance(oldToAccount, transferAssetId);
              const newToBalance = this.getAssetBalance(newToAccount, transferAssetId);
              const transferValue = new BigNumber(historyTxInfo.txInfo.actions[0].amount);
              if (transferAssetId == 0) {
                if (new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).comparedTo(totalGasFee) == 0) {
                  checkInfo += '发送账户金额变化正常，减少的FT总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '发送账户金额变化异常，实际减少的FT总金额为：' + new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).toNumber();
                  checkInfo += '\n应该减少的总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n接收账户金额变化正常，增加的FT总金额为：' + new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  this.setState({ checkProcedure: checkInfo });
                }
                else {
                  checkInfo += '\n接收账户金额变化异常，增加的FT总金额为：' + new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  checkInfo += '\n应该增加的总金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
              } else {
                if (new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).comparedTo(totalGasFee) == 0) {
                  checkInfo += '发送账户FT资产金额变化正常，减少的FT总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '发送账户金额变化异常，实际减少的FT总金额为：' + new BigNumber(oldFromFTBalance).minus(new BigNumber(newFromFTBalance)).toNumber();
                  checkInfo += '应该减少的总金额为：' + totalGasFee.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(oldFromBalance).minus(new BigNumber(newFromBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n发送账户ID为[' + transferAssetId + ']的资产金额变化正常，减少金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                } else {
                  checkInfo += '\n发送账户ID为[' + transferAssetId + ']的资产金额变化异常，实际减少的金额为：' + new BigNumber(oldFromBalance).minus(new BigNumber(newFromBalance)).toNumber();
                  checkInfo += '，应减少金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (new BigNumber(newToBalance).minus(new BigNumber(oldToBalance)).comparedTo(transferValue) == 0) {
                  checkInfo += '\n接收账户金额变化正常，增加ID为[' + transferAssetId + ']的资产金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                }
                else {
                  checkInfo += '\n接收账户金额变化异常，增加ID为[' + transferAssetId + ']的资产金额为：' + new BigNumber(newToFTBalance).minus(new BigNumber(oldToBalance)).toNumber();
                  checkInfo += '，应该增加的金额为：' + transferValue.toNumber();
                  this.setState({ checkProcedure: checkInfo });
                  result = false;
                }
                if (resultStatus != result) {
                  Feedback.toast.prompt('交易执行结果异常！');
                }
              }
              break;
            case actionTypes.CREATE_CONTRACT:
              break;    
            case actionTypes.CREATE_NEW_ACCOUNT:
              break;
            case actionTypes.UPDATE_ACCOUNT:
              break;
            case actionTypes.UPDATE_ACCOUNT_AUTHOR:
              break;
            case actionTypes.ISSUE_ASSET:
              break;
            case actionTypes.INCREASE_ASSET:
              break;
            case actionTypes.DESTORY_ASSET:
              break;
            case actionTypes.SET_ASSET_OWNER:
              break;
            case actionTypes.SET_ASSET_FOUNDER:
              break;
            case actionTypes.REG_CANDIDATE:
              break;
            case actionTypes.UPDATE_CANDIDATE:
              break;
            case actionTypes.UNREG_CANDIDATE:
              break;
            case actionTypes.VOTE_CANDIDATE:
              break;
            case actionTypes.REFUND_DEPOSIT:
              break;
        }
      }
      });
    } else {
      Feedback.toast.prompt('因无法获取receipt，故无法确认交易执行状态');
    }

    
  }

  recordHistory = async () => {
    const txInfo = JSON.parse(this.state.txInfo);
    txInfo.payloadElements = this.state.payloadElements;
    this.state.historyInfo['txInfo'] = txInfo;

    let fromAccount = null;
    let toAccount = null;
    if (!utils.isEmptyObj(this.state['accountName'])) {
      fromAccount = await fractal.account.getAccountByName(this.state['accountName']);
    }
    if (!utils.isEmptyObj(this.state['toAccountName'])) {
      toAccount = await fractal.account.getAccountByName(this.state['toAccountName']);
    }

    this.state.historyInfo['fromAccount'] = fromAccount;
    this.state.historyInfo['toAccount'] = toAccount;

  }

  onChangeResultType = (v) => {
    this.state.resultType = v;
  }
}

const styles = {
  container: {
    margin: '0',
    padding: '20px',
    width: '760px',
  },
  commonElement: {
    width: '680px',
  },
  otherElement: {
    width: '760px',
  }
}