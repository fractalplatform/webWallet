import React, { Component } from 'react';
import { Input, Feedback, Dialog } from '@icedesign/base';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import * as ethUtil from 'ethereumjs-util';
import * as fractal from 'fractal-web3';
import * as utils from '../../utils/utils';
import * as Constant from '../../utils/constant';

export default class TxSend extends Component {
  constructor(props) {
    super(props);
    this.state = {
      txConfirmVisible: this.props.visible,
      txInfo: {},
      sysTokenID: 0,
      curAccount: {accountName: ''},
      keystoreList: [],
      suggestionPrice: 1,
    };
  }

  componentDidMount = async () => {
    const chainConfig = await fractal.ft.getChainConfig();
    fractal.ft.setChainId(chainConfig.chainId);
    this.state.keystoreList = utils.loadKeystoreFromLS();
    fractal.ft.getSuggestionGasPrice().then(gasPrice => {
      this.setState({ suggestionPrice: utils.getReadableNumber(gasPrice, 9, 9) });
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.accountName != '') {
      fractal.account.getAccountByName(nextProps.accountName).then(account => this.state.curAccount = account);
    }
    this.setState({
      txInfo: nextProps.txInfo,
      txConfirmVisible: nextProps.visible,
    })
  }

  handlePasswordChange = (v) => {
    this.state.password = v;
  }
  handleGasPriceChange(v) {
    this.state.gasPrice = v;
  }
  handleGasLimitChange(v) {
    this.state.gasLimit = v;
  }
  handleRemarkChange(v) {
    this.state.remark = v;
  }
  onTxConfirmOK = () => {
    if (this.state.curAccount == null) {
      Feedback.toast.error('内部错误：未传入交易账户信息');
      return;
    }

    if (this.state.gasPrice == '') {
      Feedback.toast.error('请输入GAS单价');
      return;
    }
    // if (!this.state.gasReg.test(this.state.gasPrice)) {
    //   Feedback.toast.error('请输入正确GAS单价');
    //   return;
    // }

    if (this.state.gasLimit == '') {
      Feedback.toast.error('请输入愿意支付的最多GAS数量');
      return;
    }
    // if (!this.state.gasReg.test(this.state.gasLimit)) {
    //   Feedback.toast.error('请输入正确的GAS上限');
    //   return;
    // }

    if (this.state.password == '') {
      Feedback.toast.error('请输入钱包密码');
      return;
    }

    let curAccountFTBalance = 0;
    for(const balance of this.state.curAccount.balances) {
      if (balance.assetID == this.state.sysTokenID) {
        curAccountFTBalance = balance.balance;
        break;
      }
    }

    const gasValue = new BigNumber(this.state.gasPrice).multipliedBy(this.state.gasLimit).shiftedBy(9);
    const maxValue = new BigNumber(curAccountFTBalance);
    if (gasValue.comparedTo(maxValue) > 0) {
      Feedback.toast.error('余额不足以支付gas费用');
      return;
    }

    const txInfo = this.state.txInfo;
    txInfo.gasAssetId = this.state.sysTokenID;  // ft作为gas asset
    txInfo.gasPrice = new BigNumber(this.state.gasPrice).shiftedBy(9).toNumber();
    txInfo.gasLimit = new BigNumber(this.state.gasLimit).toNumber();
    txInfo.remark = this.state.remark;

    const authors = this.state.curAccount.authors;
    let threshold = this.state.curAccount.threshold;
    if (txInfo.actionType === Constant.UPDATE_ACCOUNT_AUTHOR) {
      threshold = this.state.curAccount.updateAuthorThreshold;
    }
    const keystores = this.getValidKeystores(authors, threshold);
    if (keystores.length == 0) {
      Feedback.toast.error('本地权限不足，需其它账户提供签名内容，此功能待开发');
    } else {
      let index = 0;
      let multiSigInfos = [];
      let promiseArr = [];
      for (const ethersKSInfo of keystores) {
        promiseArr.push(ethers.Wallet.fromEncryptedJson(JSON.stringify(ethersKSInfo), this.state.password));
      }
      Promise.all(promiseArr).then(wallets => {
        for (const wallet of wallets) {
          multiSigInfos.push({privateKey: wallet.privateKey, indexes: [index]});
          index++;
        }

        fractal.ft.sendMultiSigTransaction(txInfo, multiSigInfos).then(txHash => {
          this.processTxSendResult(txInfo, txHash);
          this.onTxConfirmClose();
        }).catch(error => {
          Feedback.toast.error('交易发送失败：' + error);
          this.addSendErrorTxToFile(txInfo);
        });
      }).catch(error => {
        console.log(error);
        Feedback.toast.error(error.message);
      });
      
      Feedback.toast.success('开始发送交易');
    }
  };

  onTxConfirmClose = () => {
    this.setState({ txConfirmVisible: false });
  }

  processTxSendResult = (txInfo, txHash) => {
    if (txHash != null) {
      Feedback.toast.success('交易发送成功');

      txInfo.txHash = txHash;
      this.addSendSuccessTxToFile(txInfo);
    } else {
      Feedback.toast.error('交易发送失败');
      this.addSendErrorTxToFile(txInfo);
    }
  }
  /** 
   *  const txInfo = { actionType: Constant.TRANSFER,
        accountName: self.state.curAccount.accountName,
        toAccountName: self.state.transferToAccount,
        assetId: self.state.curTransferAsset.assetId,
        gasLimit: new BigNumber(self.state.gasLimit).toNumber(),
        gasPrice: new BigNumber(self.state.gasPrice).toNumber(),
        value: value.toNumber(),
        payload: '' };

    * {account1:{lastBlockHash, lastBlockNum, txInfos:[{isInnerTx,txStatus,date,txHash,blockHash,blockNumber,blockStatus, actions:[ {type,from,to,assetID,value,payload,status,actionIndex,gasUsed,gasAllot: [ account,gas,typeId],error}],{...}]}}
    */
   addSendSuccessTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = Constant.TxStatus.NotExecute;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = Constant.BlockStatus.Unknown;
    let action = {};
    action.type = txInfo.actionType;
    action.from = txInfo.accountName;
    action.to = txInfo.toAccountName;
    action.assetID = txInfo.assetId;
    action.value = txInfo.value;
    action.payload = txInfo.payload;
    action.status = 0;
    action.actionIndex = 0;
    action.gasUsed = 0;
    action.gasAllot = [];
    txInfo.actions = [action];

    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[txInfo.accountName];
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

  addSendErrorTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = Constant.TxStatus.SendError;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.txHash = '0x';
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = Constant.BlockStatus.Unknown;
    let action = {};
    action.type = txInfo.actionType;
    action.from = txInfo.accountName;
    action.to = txInfo.toAccountName;
    action.assetID = txInfo.assetId;
    action.value = txInfo.value;
    action.payload = txInfo.payload;
    action.status = 0;
    action.actionIndex = 0;
    action.gasUsed = 0;
    action.gasAllot = [];
    txInfo.actions = [action];

    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[txInfo.accountName];
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

  getValidKeystores = (authors, threshold) => {
    let keystoreInfo = {};
    for (const keystore of this.state.keystoreList) {
      keystoreInfo[keystore.address] = keystore;
    }

    let totalWeight = 0;
    let myKeystores = [];
    for (const author of authors) {
      const owner = author.owner;
      const buffer = Buffer.from(utils.hex2Bytes(owner));
      let address = '0x';
      if (ethUtil.isValidPublic(buffer, true)) {
        address = ethUtil.bufferToHex(ethUtil.pubToAddress(owner, true));
      } else if (ethUtil.isValidAddress(owner)) {
        address = ethUtil.bufferToHex(buffer);
      }
      if (address.startsWith('0x')) {
        address = address.substr(2);
      }
      if (keystoreInfo[address] != null) {
        totalWeight += author.weight;
        myKeystores.push(keystoreInfo[address]);
        if (totalWeight >= threshold) {
          break;
        }
      }
    }
    return totalWeight < threshold ? [] : myKeystores;
  }
  render() {
    return (
      <div>
        <Dialog
          visible={this.state.txConfirmVisible}
          title={"交易确认-" + this.state.curAccount.accountName}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTxConfirmOK.bind(this)}
          onCancel={this.onTxConfirmClose.bind(this)}
          onClose={this.onTxConfirmClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleGasPriceChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS单价"
            addonAfter="gaft"
            size="medium"
            placeholder={`建议值：${this.state.suggestionPrice}`}
            hasLimitHint
          />
          <br />
          1gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
          <br />
          <br />
          <Input hasClear
            onChange={this.handleGasLimitChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS数量上限"
            size="medium"
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleRemarkChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="备注信息"
            size="medium"
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="钱包密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onTxConfirmOK.bind(this)}
          />
        </Dialog>
      </div>
    );
  }
}