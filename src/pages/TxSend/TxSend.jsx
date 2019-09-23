import React, { Component } from 'react';
import { Input, Feedback, Dialog, Select, CascaderSelect, Button } from '@icedesign/base';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import * as ethUtil from 'ethereumjs-util';
import * as EthCrypto from 'eth-crypto';
import * as fractal from 'fractal-web3';
import * as utils from '../../utils/utils';
import * as Constant from '../../utils/constant';


export default class TxSend extends Component {
  constructor(props) {
    super(props);
    this.state = {
      accountReg: new RegExp('^[a-z0-9]{7,16}(\\.[a-z0-9]{1,8}){0,1}$'),
      txConfirmVisible: this.props.visible,
      originalTxInfo: {},
      actionInfo: {},
      sysTokenID: 0,
      curAccount: {accountName: ''},
      keystoreList: [],
      suggestionPrice: 1,
      chainConfig: {},
      accounts: [],
      accountSelector: [],
      superAccounts: [],
      superAccountSelector: [],
      curSupperAccount: {accountName: ''},
      multiSignInputs: [],
      multiSignVisible: false,
      multiSignData: [],
      txToBeSigned: '',
      signInfo: {},
      indexesList: [],
    };
  }

  componentDidMount = async () => {
    this.state.chainConfig = await fractal.ft.getChainConfig();
    this.state.chainConfig.sysTokenID = 0;
    this.state.indexesList = [];
    fractal.ft.setChainId(this.state.chainConfig.chainId);
    this.state.keystoreList = utils.loadKeystoreFromLS();
    fractal.ft.getSuggestionGasPrice().then(gasPrice => {
      this.setState({ suggestionPrice: utils.getReadableNumber(gasPrice, 9, 9) });
    })
  }
  onChangeAccount = (accountName) => {
    this.state.accountName = accountName;
    fractal.account.getAccountByName(accountName).then(account => this.state.curAccount = account);
    this.addSuperAccount(accountName);
  }

  onChangeSuperAccount = (superAccountName) => {
    this.state.superAccountName = superAccountName;
    fractal.account.getAccountByName(superAccountName).then(account => this.state.curSupperAccount = account);
  }

  async componentWillReceiveProps(nextProps) {
    if (!nextProps.visible) return;
    
    this.state.accountSelector = [];
    this.state.accounts = [];
    if (!utils.isEmptyObj(nextProps.accountName)) {
      fractal.account.getAccountByName(nextProps.accountName).then(account => this.state.curAccount = account);
      this.addSuperAccount(nextProps.accountName);
    } else {
      //const self = this;
      const accountInfos = await utils.loadAccountsFromLS();
      for (let account of accountInfos) {
        this.state.accounts.push(account.accountName);
      }
      this.state.accountSelector.push([
        <Select
          style={{ width: 400 }}
          placeholder="选择交易发送方"
          onChange={this.onChangeAccount.bind(this)}
          dataSource={this.state.accounts}
        />, <br/>, <br/>]
      );
    }
    this.state.originalTxInfo = utils.deepClone(nextProps.txInfo);
    this.setState({
      actionInfo: nextProps.txInfo,
      txConfirmVisible: nextProps.visible,
      accountSelector: this.state.accountSelector,
    });
  }

  // a.b => a  a.b.c => a, a.b
  addSuperAccount = (accountName) => {
    const supperAccountNames = accountName.split('.');
    this.state.superAccountSelector = [];
    this.state.superAccounts = [];
    for (let i = 1; i < supperAccountNames.length; i++) {
      const superAccountName = supperAccountNames.slice(0, i);
      if (superAccountName != this.state.chainConfig.chainName) {
        this.state.superAccounts.push(superAccountName);
      }
    }
    if (this.state.superAccounts.length > 0) {
      this.state.superAccounts.push(accountName);
      this.state.superAccountSelector.push([
        <Select
          style={{ width: 400 }}
          placeholder="选择需要对交易进行签名的账户"
          onChange={this.onChangeSuperAccount.bind(this)}
          dataSource={this.state.superAccounts}
        />, <br/>, <br/>]
      );
      this.setState({superAccountSelector: this.state.superAccountSelector});
    }
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

    if (this.state.gasLimit == '') {
      Feedback.toast.error('请输入愿意支付的最多GAS数量');
      return;
    }

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
    if (this.state.actionInfo.assetId === this.state.sysTokenID) {
      const value = new BigNumber(this.state.actionInfo.amount);
      const valueAddGasFee = value.plus(gasValue);

      if (valueAddGasFee.comparedTo(maxValue) > 0) {
        Feedback.toast.error('余额不足');
        return;
      }
    }

    let txInfo = {};
    let actionInfo = this.state.actionInfo;
    if (actionInfo.accountName == null) {
      actionInfo.accountName = this.state.curAccount.accountName;
    }
    actionInfo.gasLimit = new BigNumber(this.state.gasLimit).toNumber();
    actionInfo.remark = this.state.remark;
    if (typeof actionInfo.amount != 'string') {
      actionInfo.amount = actionInfo.amount != 0 ? '0x' + new BigNumber(actionInfo.amount).toString(16) : 0;
    } else if (typeof actionInfo.amount == 'string' && !actionInfo.amount.startsWith('0x')) {
      actionInfo.amount = '0x' + actionInfo.amount;
    }

    txInfo.gasAssetId = this.state.chainConfig.sysTokenID;  // ft作为gas asset
    txInfo.gasPrice = new BigNumber(this.state.gasPrice).shiftedBy(9).toNumber();
    txInfo.actions = [actionInfo];

    let curSignAccount = this.state.curAccount;
    if (this.state.curSupperAccount != null && this.state.curSupperAccount.accountName != '') {
      curSignAccount = this.state.curSupperAccount;
    }
    const authors = curSignAccount.authors;
    let threshold = curSignAccount.threshold;
    if (actionInfo.actionType === Constant.UPDATE_ACCOUNT_AUTHOR) {
      threshold = curSignAccount.updateAuthorThreshold;
    }
    const keystores = this.getValidKeystores(authors, threshold);
    if (keystores.length == 0) {
      //Feedback.toast.prompt('本地权限不足，需其它账户对交易进行签名');
      this.state.multiSignData = [];
      let index = 0;
      authors.map(async (author) => {
        if(this.state.accountReg.test(author.owner)) {
          const account = await fractal.account.getAccountByName(author.owner);
          const threshold = (actionInfo.actionType === Constant.UPDATE_ACCOUNT_AUTHOR) ? account.updateAuthorThreshold : account.threshold;
          this.state.multiSignData.push({originalValue: author.owner, label: author.owner + '(权重:' + author.weight + ',权限阈值:' + threshold + ')', value: index + '', accountName: author.owner });
        } else {
          const labelInfo = author.owner.substr(0, 6) + '...' + author.owner.substr(author.owner.length - 4);
          this.state.multiSignData.push({originalValue: author.owner, label: labelInfo + '(权重:' + author.weight + ')', value: index + '', isLeaf: true });
        }
        index++;
      })
      fractal.ft.packTx(txInfo).then(txToBeSigned => {
        this.setState({multiSignVisible: true, txToBeSigned: JSON.stringify(txToBeSigned) });
      });
    } else {
      //let index = 0;
      let multiSigInfos = [];
      let promiseArr = [];
      for (const ethersKSInfo of keystores) {
        promiseArr.push(ethers.Wallet.fromEncryptedJson(JSON.stringify(ethersKSInfo), this.state.password));
      }
      const self = this;
      Promise.all(promiseArr).then(async (wallets) => {
        utils.confuseInfo(this.state.password);
        console.log(JSON.stringify(txInfo));
        for (let wallet of wallets) {
          const signInfo = await fractal.ft.signTx(txInfo, wallet.privateKey);
          const index = this.getSignIndex(this.state.curAccount, wallet);
          multiSigInfos.push({signInfo, indexes: [index]});
          utils.confuseInfo(wallet.privateKey);
        }
        if (multiSigInfos.length == 0) {  // 这条路径暂时关闭
          fractal.ft.sendSingleSigTransaction(txInfo, multiSigInfos[0].signInfo).then(txHash => {
            console.log('tx hash=>' + txHash);
            this.processTxSendResult(txInfo, txHash);
            this.onTxConfirmClose();
            if (this.props.sendResult != null) {
              this.props.sendResult(txHash);
            }
          }).catch(error => {
            console.log(error);
            Feedback.toast.error('交易发送失败：' + error);
            this.addSendErrorTxToFile(txInfo);
            self.state.txInfo = utils.deepClone(self.state.originalTxInfo);
            if (this.props.sendResult != null) {
              this.props.sendResult(error);
            }
          });
        } else {
          const fatherLevel = this.getSupperAccountLevel(curSignAccount.accountName, actionInfo.accountName);
          fractal.ft.sendSeniorSigTransaction(txInfo, multiSigInfos, fatherLevel).then(txHash => {
            console.log('tx hash=>' + txHash);
            this.processTxSendResult(txInfo, txHash);
            this.onTxConfirmClose();
            if (this.props.sendResult != null) {
              this.props.sendResult(txHash);
            }
          }).catch(error => {
            console.log(error);
            Feedback.toast.error('交易发送失败：' + error);
            this.addSendErrorTxToFile(txInfo);
            self.state.txInfo = utils.deepClone(self.state.originalTxInfo);
            if (this.props.sendResult != null) {
              this.props.sendResult(error);
            }
          });
        }
      }).catch(error => {
        console.log(error);
        Feedback.toast.error(error.message);
      });
      
      Feedback.toast.success('开始发送交易');
    }
  };

  getSupperAccountLevel = (supperAccountName, subAccountName) => {
    if (utils.isEmptyObj(supperAccountName)) {
      return 0;
    }
    const supperAccountElements = supperAccountName.split('.');
    const subAccountElements = subAccountName.split('.');
    if (supperAccountElements.length > subAccountElements.length) {
      throw 'supper account is not associate with sub account';
    }
    let index = 0;
    for (const element of supperAccountElements) {
      if (element != subAccountElements[index]) {
        throw 'supper account is not associate with sub account';
      }
      index++;
    }
    return subAccountElements.length - supperAccountElements.length;
  }

  getSignIndex = (account, walletInfo) => {
    const authors = account.authors;
    let index = 0;
    for (const author of authors) {
      const owner = author.owner.toLowerCase();
      if (owner == walletInfo.signingKey.address.toLowerCase() || owner == walletInfo.signingKey.publicKey.toLowerCase()) {
        return index;
      }
      index++;
    }
    return -1;
  }

  onTxConfirmClose = () => {
    this.setState({ txConfirmVisible: false });

    if (this.props.sendResult != null) {
      this.props.sendResult();
    }
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
    txInfo.actions[0].status = 0;
    txInfo.actions[0].actionIndex = 0;
    txInfo.actions[0].gasUsed = 0;
    txInfo.actions[0].gasAllot = [];

    const accountName = txInfo.actions[0].accountName;
    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      let accountTxInfoSet = allTxInfoSet[accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[accountName] = {};
      allTxInfoSet[accountName].txInfos = [txInfo];
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
  onSignOK = () => {
    const self = this;
    const txInfo = JSON.parse(this.state.txToBeSigned);
    let multiSigInfos = [];
    this.state.indexesList.map(indexes => {
      const signInfo = this.state.signInfo[indexes];
      if (!utils.isEmptyObj(signInfo)) {
        const indexesInfo = [];
        indexes.split('.').map(index => indexesInfo.push(parseInt(index, 10)));
        multiSigInfos.push({signInfo, indexes: indexesInfo});
      }
    });
    fractal.ft.sendSeniorSigTransaction(txInfo, multiSigInfos, 0).then(txHash => {
      console.log('tx hash=>' + txHash);
      this.processTxSendResult(txInfo, txHash);
      this.onTxConfirmClose();
      if (this.props.sendResult != null) {
        this.props.sendResult(txHash);
      }
    }).catch(error => {
      console.log(error);
      Feedback.toast.error('交易发送失败：' + error);
      this.addSendErrorTxToFile(txInfo);
      self.state.txInfo = utils.deepClone(self.state.originalTxInfo);
      if (this.props.sendResult != null) {
        this.props.sendResult(error);
      }
    });
  }
  onSignClose = () => {
    this.setState({multiSignVisible: false});
  }
  handleElementChange = (indexes, signature) => {
    this.state.signInfo[indexes] = signature;
    this.setState({signInfo: this.state.signInfo});
  }
  signBySelf = (indexes, keystore) => {
    Feedback.toast.success('开始计算签名');
    ethers.Wallet.fromEncryptedJson(JSON.stringify(keystore), this.state.password).then(wallet => {
      fractal.ft.signTx(JSON.parse(this.state.txToBeSigned), wallet.privateKey).then(signature => {
        Feedback.toast.hide();
        this.state.signInfo[indexes] = signature;
        this.setState({signInfo: this.state.signInfo});
      }).catch(error => {
        Feedback.toast.error(error.message || error);
      });
    }).catch(error => {
      Feedback.toast.error(error.message || error);
    });
  }
  verifySign = (indexes, address) => {
    const signature = this.state.signInfo[indexes];
    fractal.ft.recoverSignedTx(JSON.parse(this.state.txToBeSigned), signature).then(signer => {
      if (signer.toLowerCase() == address.toLowerCase()) {
        Feedback.toast.success('验证通过');
      } else {
        Feedback.toast.error('验证失败');
      }
    });
  }
  handleMultiSignChange = (indexesList) => {
    //console.log(indexesList);
    this.setState({ indexesList });
  }
  updateMultiSignInputs = () => {
   // console.log('updateMultiSignInputs');
    this.state.multiSignInputs = [];
    this.state.indexesList.map(indexes => {
      let curUpdateData = this.state.multiSignData;
      const multiFatherIndexes = indexes.split('.');
      let addOnBeforeInput = '';
      let lastOwner = '';
      multiFatherIndexes.map(index => {
        if (Object.prototype.hasOwnProperty.call(curUpdateData, 'children')) {
          curUpdateData = curUpdateData.children[parseInt(index)];
        } else {
          curUpdateData = curUpdateData[parseInt(index)];
        }
        if (curUpdateData != null) {
          addOnBeforeInput += curUpdateData.label.split('(')[0] + '/';
          lastOwner = curUpdateData.originalValue;
        } else {
          debugger
          console.log(indexes + ', ' + index);
        }
      });
      let bSignBySelf = false;
      let curKeystore = null;
      if (!this.state.accountReg.test(lastOwner)) {
        for (const keystore of this.state.keystoreList) {
          const buffer = Buffer.from(utils.hex2Bytes(lastOwner));
          if (ethUtil.isValidPublic(buffer, true)) {
            lastOwner = ethUtil.bufferToHex(ethUtil.pubToAddress(lastOwner, true));
          }
          if (keystore.address == lastOwner.substr(2)) {
            bSignBySelf = true;
            curKeystore = keystore;
            break;
          }
        }
      }
      const multiFatherIndexesStr = multiFatherIndexes.join('.');
      this.state.multiSignInputs.push(
        <br />,<br />,
        addOnBeforeInput + '的签名:',<br />,
        <Input id={multiFatherIndexesStr} hasClear
          style={{width: 400}}
          addonBefore='签名'
          size="medium"
          value={this.state.signInfo[multiFatherIndexesStr]}
          onChange={this.handleElementChange.bind(this, multiFatherIndexesStr)}/>
      );
      if (bSignBySelf) {
        this.state.multiSignInputs.push(
          <view>&nbsp;&nbsp;</view>,
          <Button type="primary" onClick={this.signBySelf.bind(this, multiFatherIndexesStr, curKeystore)}>自己签名</Button>
        );
      } else {
        this.state.multiSignInputs.push(
          <view>&nbsp;&nbsp;</view>,
          <Button type="primary" onClick={this.verifySign.bind(this, multiFatherIndexesStr, lastOwner)}>验证签名</Button>
        );
      }
    });
  }
  onLoadData(data) {
    const accountName = data.accountName;
    const fatherIndex = data.value;
    const multiFatherIndexes = fatherIndex.split('.');
    let curUpdateData = this.state.multiSignData;
    multiFatherIndexes.map(index => {
      if (Object.prototype.hasOwnProperty.call(curUpdateData, 'children')) {
        curUpdateData = curUpdateData.children[parseInt(index)];
      } else {
        curUpdateData = curUpdateData[parseInt(index)];
      }
    });

    fractal.account.getAccountByName(accountName).then(async (account) => {
      if (account == null) {
        return;
      }
      curUpdateData.children = [];
      let index = 0;
      for (let author of account.authors) {
        if(this.state.accountReg.test(author.owner)) {
          const newAccount = await fractal.account.getAccountByName(author.owner);
          curUpdateData.children.push({originalValue: author.owner, label: author.owner + '(权重:' + author.weight + ',权限阈值:' + newAccount.threshold + ')', value: fatherIndex + '.' + index, accountName: author.owner });
        } else {
          const labelInfo = author.owner.substr(0, 6) + '...' + author.owner.substr(author.owner.length - 4);
          curUpdateData.children.push({originalValue: author.owner, label: labelInfo + '(权重:' + author.weight + ')', value: fatherIndex + '.' + index, isLeaf: true });
        }
        index++;
      }

      this.setState({multiSignData: this.state.multiSignData});
    });
  }
  render() {
    this.updateMultiSignInputs();
    return (
      <div>
        <Dialog
          visible={this.state.txConfirmVisible}
          title={"交易确认-" + (this.state.curAccount != null ? this.state.curAccount.accountName : '')}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTxConfirmOK.bind(this)}
          onCancel={this.onTxConfirmClose.bind(this)}
          onClose={this.onTxConfirmClose.bind(this)}
        >
          {this.state.accountSelector}
          {this.state.superAccountSelector}
          <Input hasClear
            onChange={this.handleGasPriceChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS单价"
            addonAfter="Gaft"
            size="medium"
            placeholder={`建议值：${this.state.suggestionPrice}`}
            hasLimitHint
          />
          <br />
          1Gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
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
          <Dialog
            visible={this.state.multiSignVisible}
            title={"获取多签名数据"}
            footerActions="ok"
            footerAlign="center"
            closeable="true"
            onOk={this.onSignOK.bind(this)}
            onCancel={this.onSignClose.bind(this)}
            onClose={this.onSignClose.bind(this)}
          >
            <Input multiple
              rows="3"
              style={{ width: 500 }}
              addonBefore="待签名的交易内容:"
              size="medium"
              value={this.state.txToBeSigned}
            />
            <br />
            <br />
            <CascaderSelect multiple hasClear
              placeholder="请选择需要对本交易进行签名的各方"
              style={{ width: 500 }}
              canOnlyCheckLeaf={true}
              changeOnSelect={false}
              dataSource={this.state.multiSignData}
              //displayRender={this.displayRender.bind(this)}
              onChange={this.handleMultiSignChange.bind(this)}
              loadData={this.onLoadData.bind(this)}
            />
            {this.state.multiSignInputs}
          </Dialog>
        </Dialog>
      </div>
    );
  }
}