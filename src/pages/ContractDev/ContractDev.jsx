import React, { Component } from 'react';
import { Input, Feedback, Card, Select, Checkbox } from '@icedesign/base';
import Container from '@icedesign/container';
import { Button, Tab, Grid, Tree, Dialog, Collapse } from '@alifd/next';
import * as fractal from 'fractal-web3';
import * as ethers from 'ethers';
import * as ethUtil from 'ethereumjs-util';
import cookie from 'react-cookies';
import BigNumber from 'bignumber.js';
import { encode } from 'rlp';

import * as utils from '../../utils/utils';
import * as txParser from '../../utils/transactionParser';
import * as sha256 from '../../utils/sha256';
import { T } from '../../utils/lang';
import TxSend from "../TxSend";
import * as Constant from '../../utils/constant';
import ContractEditor from './components/Editor';
import './ContractDev.scss';
import { assetSol, cryptoSol } from './sampleCode';
import * as CompilerSrv from './CompilerSrv'

const { Row, Col } = Grid;
const TreeNode = Tree.Node;
const Panel = Collapse.Panel;


export default class ContractManager extends Component {
  static displayName = 'ContractManager';

  constructor(props) {
    super(props);
    let abiInfoStr = '';
    const abiInfo = global.localStorage.getItem('abiInfo');
    if (abiInfo != null) {
      abiInfoStr = JSON.stringify(abiInfo).replace(/\\"/g, '"');
      abiInfoStr = abiInfoStr.substring(1, abiInfoStr.length - 1);
    }
    const abiContractName = cookie.load('abiContractName');

    this.state = {
      accountReg: new RegExp('^([a-z][a-z0-9]{6,15})(?:\.([a-z0-9]{2,16})){0,1}(?:\.([a-z0-9]{2,16})){0,1}$'),
      accounts: [],
      contractFuncInfo: [],
      contractAccountInfo: [],
      abiInfo: abiInfoStr,
      paraValue: {},
      funcParaTypes: {},
      funcParaNames: {},
      funcParaConstant: {},
      result: {},
      txInfo: {},
      txSendVisible: false,
      defaultAccountName: '',
      contractName: abiContractName,
      contractAccount: abiContractName,
      selectedAccount: null,
      selectedAccountName: '',
      transferTogether: {},
      visibilityValue: {},
      curCallFuncName: '',
      curTxResult: {},
      resultDetailInfo: '',
      solFileList: ['sample.sol'],
      tabFileList: ['sample.sol'],
      fileContractMap: {},
      contractList: [],
      contractAccountAbiMap: {},
      activeKey: '',
      addNewContractFileVisible: false,
      deployContractVisible: false,
      selectContactFile: '',
      selectedFileToCompile: '',
      selectedContractToDeploy: '',
      resultInfo: '',
      newContractAccountName: '',
      keystoreInfo: {},
      suggestionPrice: 1,
      gasLimit: 1000000,
      ftAmount: 1,
     };
     const solFileList = global.localStorage.getItem('solFileList');
     if (solFileList != null) {
       this.state.solFileList = solFileList.split(',');
     }
     global.localStorage.setItem('sol:asset.sol', assetSol);
     global.localStorage.setItem('sol:crypto.sol', cryptoSol);
  }

  componentDidMount = async () => {
    const chainConfig = await fractal.ft.getChainConfig();
    fractal.ft.setChainId(chainConfig.chainId);

    const keystoreList = utils.loadKeystoreFromLS();    
    for (const keystore of keystoreList) {
      this.state.keystoreInfo[keystore.publicKey] = keystore;
    }

    const accounts = await utils.loadAccountsFromLS();
    for (let account of accounts) {
      for (let author of account.authors) {
        if (this.state.keystoreInfo[author.owner] != null) {
          this.state.accounts.push({value: account.accountName, label: account.accountName, object: account});
          break;
        }
      }
    }
    if (this.state.accounts.length > 0) {
      this.setState({ selectedAccountName: this.state.accounts[0].object.accountName, 
                      selectedAccount: this.state.accounts[0].object,
                      txSendVisible: false });
    } else {
      this.state.selectedAccountName = utils.guid();
      this.state.selectedAccount = null;
    }
    this.syncSolFileToSrv();

    const abiInfo = global.localStorage.getItem('abiInfo');
    if (abiInfo != null) {
      let abiInfoStr = JSON.stringify(abiInfo).replace(/\\"/g, '"');
      abiInfoStr = abiInfoStr.substring(1, abiInfoStr.length - 1);
      this.setState({ storedAbiInfo: abiInfoStr });
    }

    fractal.ft.getSuggestionGasPrice().then(suggestionPrice => {
      this.setState({ gasPrice: utils.getReadableNumber(suggestionPrice, 9, 9) });
    })
  }

  // shouldComponentUpdate(nextProps, nextState){
  //   console.log(this.state.visibilityValue);
  //   console.log(nextState.visibilityValue);
  //   return true;
  // }
  syncSolFileToSrv = () => {
    for (const solFile of this.state.solFileList) {
     CompilerSrv.addSol(this.state.selectedAccountName, solFile);
    }
    for (const solFile of this.state.solFileList) {
     const solCode = global.localStorage.getItem('sol:' + solFile);
     CompilerSrv.updateSol(this.state.selectedAccountName, solFile, solCode);
    }
  }

  getAccountPublicKey = () => {
    for (let author of this.state.selectedAccount.authors) {
      if (this.state.keystoreInfo[author.owner] != null) {
        return author.owner;
      }
    }
    return '';
  }

  handleContractAccountChange = (value) => {
    this.state.contractAccount = value;
  }

  saveContractName = (value) => {
    this.state.contractName = value.currentTarget.defaultValue;
    cookie.save('abiContractName', this.state.contractName);
  }

  handleABIInfoChange = (value) => {
    this.setState({ abiInfo: value });
  }

  parseABI = (contractAccountName, contractName, abiInfo) => {
    if (utils.isEmptyObj(abiInfo) 
    || (!utils.isEmptyObj(abiInfo) && !fractal.utils.isValidABI(abiInfo))) {
      Feedback.toast.error(T('ABI信息不符合规范，请检查后重新输入'));
      return;
    }
    this.state.funcParaTypes[contractName] = {};
    this.state.funcParaNames[contractName] = {};
    this.state.funcParaConstant[contractName] = {};

    const contractFuncInfo = [];
    const abiObj = JSON.parse(abiInfo);
    for (const interfaceInfo of abiObj) {
      if (interfaceInfo.type === 'function') {
        const funcName = interfaceInfo.name;
        const parameterTypes = [];
        const parameterNames = [];
        for (const input of interfaceInfo.inputs) {
          parameterTypes.push(input.type);
          parameterNames.push(input.name);
        }

        this.state.funcParaTypes[contractName][funcName] = parameterTypes;
        this.state.funcParaNames[contractName][funcName] = parameterNames;
        this.state.funcParaConstant[contractName][funcName] = interfaceInfo.constant;
        contractFuncInfo.push(this.generateOneFunc(contractAccountName, contractName, funcName, parameterTypes, parameterNames));
        contractFuncInfo.push(<br />);
        contractFuncInfo.push(<br />);
      }
    }
    return contractFuncInfo;
  }

  handleParaValueChange = (funcName, paraName, value) => {
    this.state.paraValue[funcName + '-' + paraName] = value;
  }

  onChangeAccount = (accountName, item) => {
    this.setState({ selectedAccountName: accountName, selectedAccount: item.object, txSendVisible: false });
    this.syncSolFileToSrv();
  }

  onChangeContractFile = (fileToCompile) => {
    this.setState({ selectedFileToCompile: fileToCompile, txSendVisible: false });
  }

  onChangeContract = (contractToDeploy) => {
    this.setState({ selectedContractToDeploy: contractToDeploy, txSendVisible: false });
  }

  addLog = (logInfo) => {
    let date = new Date().toLocaleString();
    logInfo = date + ':' + logInfo + '\n';
    this.setState({resultInfo: this.state.resultInfo + logInfo});
  }

  compileContract = async () => {
    if (utils.isEmptyObj(this.state.selectedFileToCompile)) {
      Feedback.toast.error(T('请选择待编译的文件'));
      return;
    }
    this.addLog("--------------------\n开始编译");
    const compileResult = await CompilerSrv.compileSol(this.state.selectedAccountName, this.state.selectedFileToCompile);
    if (compileResult.err != null) {
      Feedback.toast.error("编译失败");
      this.addLog("--------------------\n" + compileResult.err);
      return;
    }
    Feedback.toast.success("编译成功");
    this.addLog("--------------------\n编译成功");

    this.state.fileContractMap[this.state.selectedFileToCompile] = compileResult;
    this.state.contractList = [];
    for (var contractFile in this.state.fileContractMap) {
      const compiledInfo = this.state.fileContractMap[contractFile];
      for (var contractName in compiledInfo) {
        this.state.contractList.push(contractFile + ":" + contractName);
      }
    }
    this.setState({contractList: this.state.contractList});
  }

  // 部署合约分两步：
  // 1:创建账户，需：账户名(自动生成), 公钥(同发起账户)，转账FT金额(用于部署合约)
  // 2:将合约bytecode附加到第一步创建的账户中
  deployContract = async () => {
    if (this.state.selectedContractToDeploy == null) {
      Feedback.toast.error(T('请选择需要部署的合约'));
      return;
    }
    this.state.newContractAccountName = await this.generateContractAccount();
    this.state.newContractPublicKey = this.getAccountPublicKey();
    this.setState({deployContractVisible: true});
  }

  generateContractAccount = async () => {
    const nonce = await fractal.account.getNonce(this.state.selectedAccountName);
    const shaResult = sha256.hex_sha256(this.state.selectedAccountName + nonce).substr(2);
    if (shaResult.charAt(0) > 'a' && shaResult.charAt(0) < 'z') {
      return shaResult.substr(0, 12);
    } else {
      return 'x' + shaResult.substr(0, 11);
    }
  }

  callContractFunc = async (contractAccountName, contractName, funcName) => {
    if (utils.isEmptyObj(this.state.selectedAccountName)) {
      Feedback.toast.error(T('请选择发起合约调用的账号'));
      return;
    }

    if (utils.isEmptyObj(contractAccountName)) {
      Feedback.toast.error(T('请输入合约账号名'));
      return;
    }
    const contractAccount = await fractal.account.getAccountByName(contractAccountName);
    if (contractAccount == null) {
      Feedback.toast.error(T('合约不存在，请检查合约名是否输入错误'));
      return;
    }
    const paraNames = this.state.funcParaNames[contractName][funcName];
    const values = [];
    for (const paraName of paraNames) {
      const value = this.state.paraValue[funcName + '-' + paraName];
      if (value == null) {
        Feedback.toast.error(T('参数') + paraName + T('尚未输入值'));
        return;
      }
      values.push(value);
    }
    const self = this;
    const payload = '0x' + fractal.utils.getContractPayload(funcName, this.state.funcParaTypes[contractName][funcName], values);
    if (this.state.funcParaConstant[contractName][funcName]) {
      const callInfo = {actionType:0, from: 'fractal.founder', to: contractAccountName, assetId:0, gas:200000000, gasPrice:10000000000, value:0, data:payload, remark:''};
      fractal.ft.call(callInfo, 'latest').then(resp => {
        console.log(funcName + '=>' + resp);
        var obj = document.getElementById(funcName + 'Result');
        obj.value= resp;
        self.setState({ result: { funcName: resp }, txSendVisible: false });
      });
    } else {
      const assetId = this.state.transferTogether[funcName] ? parseInt(this.state.paraValue[funcName + '-transferAssetId']) : 0;
      const amount = this.state.transferTogether[funcName] ? parseInt(this.state.paraValue[funcName + '-transferAssetValue']) : 0;
      this.state.txInfo = { actionType: Constant.CALL_CONTRACT,
        toAccountName: contractAccountName,
        assetId,
        amount,
        payload };
      this.setState({ txSendVisible: true, curCallFuncName: funcName });
    }
  }

  generateOneFunc = (contractAccountName, contractName, funcName, parameterTypes, parameterNames) => {
    let index = 0;
    let inputElements = [];
    let txReceiptBtns = [];
    let callBtnName = T('查询结果');
    const self = this;
    parameterNames.forEach(paraName => {
      inputElements.push(<Input hasClear
        onChange={this.handleParaValueChange.bind(this, funcName, paraName)}
        style={{ width: 600 }}
        addonBefore={paraName}
        size="medium"
        placeholder={parameterTypes[index++]}
      />, <br />, <br />,
      )
    });
    if (!this.state.funcParaConstant[contractName][funcName]) {
      callBtnName = T('发起合约交易');
      const transferTogether = this.state.transferTogether[funcName];
      this.state.visibilityValue[funcName] = (transferTogether != null && transferTogether) ? 'block' : 'none';
      inputElements.push(
      <Checkbox
        onChange={checked => {
          let transferTogether = utils.deepClone(self.state.transferTogether);
          transferTogether[funcName] = checked;
          let visibilityValue = utils.deepClone(self.state.visibilityValue);
          visibilityValue[funcName] = checked ? 'block' : 'none';
          // self.state.visibilityValue[funcName] = checked ? 'block' : 'none';
          self.setState({ transferTogether, visibilityValue, txSendVisible: false });
          var obj = document.getElementById(funcName + 'Container');
          obj.style.display= visibilityValue[funcName];
        }}>{T('附带转账')}</Checkbox>,<br />,<br />,
      <Container id={funcName + 'Container'} style={{display: self.state.visibilityValue[funcName], height:'50'}}>
        <Input hasClear
          onChange={this.handleParaValueChange.bind(this, funcName, 'transferAssetId')}
          style={{ width: 600 }}
          addonBefore={T('转账资产ID')}
          size="medium"
        /><br /><br />
        <Input hasClear
          onChange={this.handleParaValueChange.bind(this, funcName, 'transferAssetValue')}
          style={{ width: 600 }}
          addonBefore={T('转账资产金额')}
          size="medium"
        />
      </Container>,);

      txReceiptBtns.push(<br />,<br />,
        <Button type="primary" onClick={this.getTxInfo.bind(this, funcName)} style={{marginRight: '20px'}}>{T('查询交易')}</Button>,
        <Button type="primary" onClick={this.getReceiptInfo.bind(this, funcName)}>{T('查询Receipt')}</Button>,<br />,<br />,
        <Input id={funcName + 'TxReceipt'} 
          multiple
          rows="5"
          style={{ width: 600 }}
          addonBefore={T("交易/Receipt信息:")}
          size="medium"
        />
      );
    }
    const oneElement = <Card style={{ width: 800 }} bodyHeight="auto" title={funcName}>
                        {inputElements}
                        <Button type="primary" onClick={this.callContractFunc.bind(this, contractAccountName, contractName, funcName)}>{callBtnName}</Button>
                        <br />
                        <br />
                        <Input readOnly id={funcName + 'Result'} style={{ width: 600 }} addonBefore={T('结果')} size="medium"
                          onClick={()=>{}}/>
                        {txReceiptBtns}
                      </Card>;
    return oneElement;
  }

  getTxInfo = (funcName) => {
    const result = this.state.curTxResult[funcName];
    if (result != null) {
      if (result.indexOf('0x') != 0) {
        Feedback.toast.error(T('非交易hash，无法查询'));
        return;
      }
      fractal.ft.getTransactionByHash(result).then(txInfo => {
        var obj = document.getElementById(funcName + 'TxReceipt');
        obj.value= JSON.stringify(txInfo);
      });
    }
  }

  getReceiptInfo = (funcName) => {
    const result = this.state.curTxResult[funcName];
    if (result != null) {
      if (result.indexOf('0x') != 0) {
        Feedback.toast.error(T('非交易hash，无法查询'));
        return;
      }
      fractal.ft.getTransactionReceipt(result).then(receipt => {
        var obj = document.getElementById(funcName + 'TxReceipt');
        obj.value= JSON.stringify(receipt);
        const actionResults = receipt.actionResults;
        if (actionResults[0].status == 0) {
          Feedback.toast.error(T('Receipt表明本次交易执行失败，原因') + ':' + actionResults[0].error);
        }
      });
    }
  }

  importABI = () => {
    if (utils.isEmptyObj(this.state.contractAccount)) {
      Feedback.toast.error(T('请输入合约账号名'));
      return;
    }

    const abiInfoObj = utils.getDataFromFile(Constant.ContractABIFile);
    if (abiInfoObj != null && abiInfoObj[this.state.contractAccount] != null) {
      let abiInfoStr = JSON.stringify(abiInfoObj[this.state.contractAccount]).replace(/\\"/g, '"');
      abiInfoStr = abiInfoStr.substring(1, abiInfoStr.length - 1);
      this.setState({ abiInfo: abiInfoStr });
    } else {
      Feedback.toast.prompt(T('账号未保存ABI信息，无法导入'));
    }
  }
  getTxResult = (result) => {
    var obj = document.getElementById(this.state.curCallFuncName + 'Result');
    obj.value= result;
    this.state.curTxResult[this.state.curCallFuncName] = result;
  }

  selectTab = (key) => {
    this.setState({activeKey: key});
  }

  addSolTab = (fileName) => {
    if (fileName == null) {
      return;
    }
    let exist = false;
    this.state.tabFileList.map(tabFileName => {
      if (fileName == tabFileName) {
        exist = true;
      }
    });
    if (exist) {
      this.setState({activeKey: fileName});
    } else {
      this.state.tabFileList.push(fileName);
      this.setState({activeKey: fileName, tabFileList: this.state.tabFileList});
    }
  }

  delSolTab = (fileName) => {
    let index = this.state.tabFileList.indexOf(fileName);
    if (index > -1) {
      this.state.tabFileList.splice(index, 1);
    }
    if (index >= this.state.tabFileList.length) {
      index = this.state.tabFileList.length - 1;
    }
    this.setState({tabFileList: this.state.tabFileList, activeKey: index >= 0 ? this.state.tabFileList[index] : ''});
  }

  updateSolTab = (oldFileName, newFileName) => {
    const index = this.state.tabFileList.indexOf(oldFileName);
    if (index > -1) {
      this.state.tabFileList.splice(index, 1, newFileName);
    }
    let activeLabKey = this.state.activeKey;
    if (activeLabKey == oldFileName) {
      activeLabKey = newFileName;
    }

    const solCode = global.localStorage.getItem('sol:' + oldFileName);
    global.localStorage.setItem('sol:' + newFileName, solCode);
    global.localStorage.removeItem('sol:' + oldFileName);

    this.setState({activeKey: activeLabKey, tabFileList: this.state.tabFileList});
  }

  onClose = (targetKey) => {
    this.delSolTab(targetKey);
  }

  onEditFinish(key, label, node) {
    let index = -1;
    this.state.solFileList.map(solFileName => {
      index++;
      if (solFileName == key) {        
        this.state.solFileList[index] = label;
      }
    });
    this.setState({solFileList: this.state.solFileList});
    this.updateSolTab(key, label);
    CompilerSrv.renameSol(this.state.selectedAccountName, key, label);
  }

  onRightClick(info) {
    console.log('onRightClick', info);
  }
  onSelectSolFile = (selectedKeys) => {
    console.log('onSelectSolFile', selectedKeys);
    this.state.selectContactFile = selectedKeys[0];
    this.addSolTab(this.state.selectContactFile);
  }
  addSolFile = () => {
    this.setState({addNewContractFileVisible: true});
  }
  handleContractNameChange = (value) => {
    this.state.newContractFileName = value;
  }
  handleContractAccountNameChange = (value) => {
    this.setState({newContractAccountName: value});
  }
  handleContractPublicKeyChange = (value) => {
    this.setState({newContractPublicKey: value});
  }
  handleFTAmountChange = (value) => {
    this.setState({ftAmount: value});
  }
  
  handleGasPriceChange(v) {
    this.state.gasPrice = v;
  }
  handleGasLimitChange(v) {
    this.state.gasLimit = v;
  }
  handlePasswordChange = (v) => {
    this.state.password = v;
  }
  onAddNewContractFileOK = () => {
    if (!this.state.newContractFileName.endsWith('.sol')) {
      this.state.newContractFileName = this.state.newContractFileName + '.sol';
    }
    let exist = false;
    this.state.solFileList.map(contractFileName => {
      if (this.state.newContractFileName == contractFileName) {
        exist = true;
      }
    });
    if (exist) {
      Feedback.toast.error('文件已存在！');
      return;
    }

    this.state.solFileList.push(this.state.newContractFileName);
    this.setState({solFileList: this.state.solFileList, activeKey: this.state.newContractFileName, addNewContractFileVisible: false});
    this.addSolTab(this.state.newContractFileName);
    
    CompilerSrv.addSol(this.state.selectedAccountName, this.state.newContractFileName);
  }
  onAddNewContractFileClose = () => {
    this.setState({addNewContractFileVisible: false});
  }

  getFTBalance = (account) => {
    for(const balance of account.balances) {
      if (balance.assetID == Constant.SysTokenId) {
        return balance.balance;
      }
    }
    return 0;
  }
  checkBalanceEnough = (account, gasPrice, gasLimit, transferAmount) => {
    const ftBalance = this.getFTBalance(account);
    const gasValue = new BigNumber(gasPrice).multipliedBy(gasLimit).shiftedBy(9);
    const maxValue = new BigNumber(ftBalance);
    if (gasValue.comparedTo(maxValue) > 0) {
      return false;
    }
    const value = new BigNumber(transferAmount);
    const valueAddGasFee = value.plus(gasValue);

    if (valueAddGasFee.comparedTo(maxValue) > 0) {
      return false;
    }
    return true;
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

  sendTx = async (txInfo, fromAccount) => {
    const authors = fromAccount.authors;
    let threshold = fromAccount.threshold;
    const keystores = utils.getValidKeystores(authors, threshold);
    if (keystores.length > 0) {
      let multiSigInfos = [];
      let promiseArr = [];
      for (const ethersKSInfo of keystores) {
        promiseArr.push(ethers.Wallet.fromEncryptedJson(JSON.stringify(ethersKSInfo), this.state.password));
      }

      const wallets = await Promise.all(promiseArr);
      for (let wallet of wallets) {
        const signInfo = await fractal.ft.signTx(txInfo, wallet.privateKey);
        const index = this.getSignIndex(fromAccount, wallet);
        multiSigInfos.push({signInfo, indexes: [index]});
      }
      const actionName = txParser.getActionTypeStr(txInfo.actions[0].actionType);
      if (multiSigInfos.length > 0) {   
        Feedback.toast.success(fromAccount.accountName + '开始发送交易:' + actionName);   
        this.addLog(fromAccount.accountName + '开始发送交易:' + actionName + ', 交易详情:' + JSON.stringify(txInfo));    
        const fatherLevel = 0;
        return fractal.ft.sendSeniorSigTransaction(txInfo, multiSigInfos, fatherLevel);
        
        // .then(txHash => {
        //   this.addLog(actionName + '的交易hash:' + txHash);
        //   this.checkReceipt(actionName, txHash, cbFunc);
        // }).catch(error => {
        //   this.addLog(actionName + '交易发送失败:' + error);
        //   Feedback.toast.error('交易发送失败：' + error);
        // });
      }
    } else {
      Feedback.toast.error('由于您对创建者账户拥有的权限不足，无法使用此账户');
    }
  }

  checkReceipt = (actionName, txHash, cbFunc) => {
    let count = 0;
      const intervalId = setInterval(() => {
        fractal.ft.getTransactionReceipt(txHash).then(receipt => {
          if (receipt == null) {
            count++;
            if (count == 3) {
              clearInterval(intervalId);
            }
          } else {
            clearInterval(intervalId);
            const actionResults = receipt.actionResults;
            if (actionResults[0].status == 0) {
              Feedback.toast.error(actionName + T('交易执行失败，原因') + ':' + actionResults[0].error);
            } else if (cbFunc != null) {
              cbFunc();
            }
          }
        });
      }, 3000);
  }

  createAccountTx = (newAccountName, creator, publicKey, transferFTAmount, gasPrice, gasLimit) => {
    const payload = '0x' + encode([newAccountName, creator.accountName, publicKey, '']).toString('hex');
    let amountValue = new BigNumber(transferFTAmount).shiftedBy(Constant.SysTokenDecimal);
    amountValue = amountValue.comparedTo(new BigNumber(0)) == 0 ? 0 : '0x' + amountValue.toString(16);
    const txInfo = {};
    const actionInfo = { actionType: Constant.CREATE_NEW_ACCOUNT,
      accountName: creator.accountName,
      toAccountName: 'fractal.account',  // fractal.account
      assetId: Constant.SysTokenId,  // ft
      gasLimit,
      amount: amountValue,
      payload };
    txInfo.gasAssetId = Constant.SysTokenId;  // ft作为gas asset
    txInfo.gasPrice = new BigNumber(gasPrice).shiftedBy(9).toNumber();
    txInfo.actions = [actionInfo];

    return this.sendTx(txInfo, creator);
  }

  deployContractTx = async (contractAccountName, contractCode, gasPrice, gasLimit) => {
    const contractAccount = await fractal.account.getAccountByName(contractAccountName);
    const payload = '0x' + contractCode;
    const txInfo = {};
    const actionInfo = { actionType: Constant.CREATE_CONTRACT,
      accountName: contractAccountName,
      toAccountName: contractAccountName,
      assetId: Constant.SysTokenId,  // ft
      gasLimit,
      amount: 0,
      payload };
    txInfo.gasAssetId = Constant.SysTokenId;  // ft作为gas asset
    txInfo.gasPrice = new BigNumber(gasPrice).shiftedBy(9).toNumber();
    txInfo.actions = [actionInfo];
    
    return this.sendTx(txInfo, contractAccount);
  }
  onDeployContractOK = async () => {
    if (this.state.newContractAccountName == null) {
      Feedback.toast.error('请输入合约账户名');
      return;
    }

    if (utils.isEmptyObj(this.state.gasPrice)) {
      Feedback.toast.error('请输入GAS单价');
      return;
    }

    if (utils.isEmptyObj(this.state.gasLimit)) {
      Feedback.toast.error('请输入愿意支付的最多GAS数量');
      return;
    }

    if (this.state.password == '') {
      Feedback.toast.error('请输入钱包密码');
      return;
    }

    if (!this.state.accountReg.test(this.state.newContractAccountName) && this.state.newContractAccountName.length > 31) {
      Feedback.toast.error(T('账号格式错误'));
      return;
    }
    
    const contractInfo = this.state.selectedContractToDeploy.split(':');      
    const contractCode = this.state.fileContractMap[contractInfo[0]][contractInfo[1]];
    if (contractCode == null) {
      Feedback.toast.error(T('无此合约编译信息'));
      return;
    }

    Feedback.toast.success('开始部署合约');
    this.addLog('开始部署合约');
    const contractAccount = await fractal.account.getAccountByName(this.state.newContractAccountName);
    if (contractAccount != null) {
      if (!this.checkBalanceEnough(contractAccount, this.state.gasPrice, this.state.gasLimit, this.state.ftAmount)) {        
        Feedback.toast.error(T('FT余额不足，无法发起交易'));
        return;
      }
      // 由合约账户直接发起部署合约的操作
      this.deployContractTx(this.state.newContractAccountName, contractCode.bin, this.state.gasPrice, this.state.gasLimit).then(txHash => {
        this.addLog('部署合约的交易hash:' + txHash);
        this.checkReceipt('部署合约', txHash, () => {
          Feedback.toast.success('成功部署合约');
          this.setState({deployContractVisible: false});
          this.displayContractFunc(this.state.newContractAccountName, contractInfo[1], contractCode.abi);
        });
      }).catch(error => {
        this.addLog('部署合约交易发送失败:' + error);
        Feedback.toast.error('部署合约交易发送失败：' + error);
      });
      Feedback.toast.success('开始发送交易');
    } else {
      if (utils.isEmptyObj(this.state.selectedAccountName)) {
        Feedback.toast.error(T('请选择创建者账号'));
        return;
      }

      if (utils.isEmptyObj(this.state.newContractPublicKey)) {
        Feedback.toast.error(T('请输入合约账户的公钥'));
        return;
      }

      if (utils.isEmptyObj(this.state.ftAmount)) {
        Feedback.toast.error(T('请输入FT转账金额'));
        return;
      }
      
      const publicKey = utils.getPublicKeyWithPrefix(this.state.newContractPublicKey);
      if (!ethUtil.isValidPublic(Buffer.from(utils.hex2Bytes(publicKey)), true)) {
        Feedback.toast.error(T('无效公钥，请重新输入'));
        return;
      }
      if (!this.checkBalanceEnough(this.state.selectedAccount, this.state.gasPrice, this.state.gasLimit, this.state.ftAmount)) {        
        Feedback.toast.error(T('FT余额不足，无法发起交易'));
        return;
      }
      // 1:由发起账户创建合约账户
      this.createAccountTx(this.state.newContractAccountName, this.state.selectedAccount, publicKey,
                           this.state.ftAmount, this.state.gasPrice, this.state.gasLimit).then(txHash => {
        this.addLog('创建账户的交易hash:' + txHash);
        this.checkReceipt('创建账户', txHash, () => {
          // 2:由合约账户部署合约
          Feedback.toast.success('合约账户创建成功');  
          this.addLog('合约账户已创建，可部署合约');    
          this.deployContractTx(this.state.newContractAccountName, contractCode.bin, this.state.gasPrice, this.state.gasLimit).then(txHash => {
            this.addLog('部署合约的交易hash:' + txHash);
            this.checkReceipt('部署合约', txHash, () => {
              Feedback.toast.success('成功部署合约'); 
              this.setState({deployContractVisible: false}); 
              this.displayContractFunc(this.state.newContractAccountName, contractInfo[1], contractCode.abi);
            });
          }).catch(error => {
            this.addLog('部署合约交易发送失败:' + error);
            Feedback.toast.error('部署合约交易发送失败：' + error);
          });
        });
      });
    }
  }
  displayContractFunc = (contractAccountName, contractName, contractAbi) => {
    const abiUI = this.parseABI(contractAccountName, contractName, contractAbi);
    const oneContractPanel = <Panel title={'合约账号：' + contractAccountName + '，合约名：' + contractName + '，部署时间：' + new Date().toLocaleString()}>
                                {abiUI}
                             </Panel>;
    this.state.contractAccountInfo = [oneContractPanel, ...this.state.contractAccountInfo];
    this.setState({contractAccountInfo: this.state.contractAccountInfo, txSendVisible: false});
  }

  onDeployContractClose = () => {
    this.setState({deployContractVisible: false});
  }
  delSolFile = () => {
    if (this.state.selectContactFile.length > 0) {
      const index = this.state.solFileList.indexOf(this.state.selectContactFile);
      if (index > -1) {
        this.state.solFileList.splice(index, 1);
        this.setState({solFileList: this.state.solFileList});
        this.delSolTab(this.state.selectContactFile);
        CompilerSrv.delSol(this.state.selectedAccountName, this.state.selectContactFile);
      }
    }
  }
  render() {
    global.localStorage.setItem("solFileList", this.state.solFileList);
    return (
      <div style={{width:1200}}>
        <Row className="custom-row" style={{width:1200}}>
            <Col fixedSpan="10" className="custom-col-left-sidebar">
              <br />
              <Button type="primary" onClick={this.addSolFile}>添加合约</Button>
              &nbsp;&nbsp;
              <Button type="primary" onClick={this.delSolFile}>删除选中合约</Button>
              <Tree editable showLine draggable selectable
                  defaultExpandedKeys={['0', '1']}
                  onEditFinish={this.onEditFinish.bind(this)}
                  onRightClick={this.onRightClick}
                  onSelect={this.onSelectSolFile}>
                  <TreeNode key="0" label="智能合约" selectable={false}>
                    {
                      this.state.solFileList.map(solFile => <TreeNode key={solFile} label={solFile}/>)
                    }
                  </TreeNode>
                  
                  <TreeNode key="1" label="案例模板" selectable={false}>
                      <TreeNode key="asset.sol" label="asset.sol"/>
                      <TreeNode key="crypto.sol" label="crypto.sol"/>
                  </TreeNode>
              </Tree>
            </Col>
            <Col className="custom-col-content">
              <Tab activeKey={this.state.activeKey} excessMode="slide" onClose={this.onClose.bind(this)} onClick={this.selectTab}>
                {
                  this.state.tabFileList.map(fileName =>
                          <Tab.Item closeable={true} key={fileName} title={fileName} tabStyle={{ height:'20px',opacity:0.2}}>
                            <ContractEditor fileName={fileName} accountName={this.state.selectedAccountName} style={{height:1200, width:800}}/>
                          </Tab.Item>
                  )
                }
              </Tab>
              
              <br />
              <br />
              <Input multiple hasClear readOnly
                rows={20}
                style={{ width: 800, height: 300 }}
                value={this.state.resultInfo}
                size="medium"
                onChange={this.handleABIInfoChange.bind(this)}
              />
              
              <br />
              <br />
              <Collapse rtl='ltr'>
                {this.state.contractAccountInfo.map(item => item)}
              </Collapse>
            </Col>
            <Col fixedSpan="10" className="custom-col-right-sidebar">
              <Select
                style={{ width: 280 }}
                placeholder={T("选择可发起合约操作的账户")}
                onChange={this.onChangeAccount.bind(this)}
                dataSource={this.state.accounts}
              />
              <br/><br/>
              <Row style={{width:280}}>
                <Select
                  style={{ width: 220 }}
                  placeholder={T("请选择待编译文件")}
                  onChange={this.onChangeContractFile.bind(this)}
                  dataSource={this.state.solFileList}
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.compileContract.bind(this)}>{T("编译")}</Button>
              </Row>
              <br/>
              <Row style={{width:280}}>
                <Select
                  style={{ width: 220 }}
                  placeholder={T("请选择合约")}
                  onChange={this.onChangeContract.bind(this)}
                  dataSource={this.state.contractList}
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.deployContract.bind(this)}>{T("部署")}</Button>
              </Row>
              {/* <br/>
              <Row style={{width:280}}>
                <Select
                  style={{ width: 220 }}
                  placeholder={T("请选择合约账户")}
                  onChange={this.onChangeContractAccount.bind(this)}
                  dataSource={this.state.contractAccountList}
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.deployContract.bind(this)}>{T("部署")}</Button>
              </Row> */}
             
            </Col>
        </Row>
        
        <br />
        <br />
        {/* <Button type="primary" onClick={this.parseABI.bind(this)}>{T("解析ABI")}</Button> */}
        <Dialog
          visible={this.state.addNewContractFileVisible}
          title={T("请输入合约文件名称")}
          closeable="true"
          footerAlign="center"
          onOk={this.onAddNewContractFileOK.bind(this)}
          onCancel={this.onAddNewContractFileClose.bind(this)}
          onClose={this.onAddNewContractFileClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleContractNameChange.bind(this)}
            style={{ width: 200 }}
            addonBefore={T("合约文件名")}
            size="medium"
          />
        </Dialog>
        <Dialog closeable='close,esc,mask'
          visible={this.state.deployContractVisible}
          title={T("部署合约")}
          closeable="true"
          footerAlign="center"
          onOk={this.onDeployContractOK.bind(this)}
          onCancel={this.onDeployContractClose.bind(this)}
          onClose={this.onDeployContractClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleContractAccountNameChange.bind(this)}
            value={this.state.newContractAccountName}
            style={{ width: 300 }}
            addonBefore={T("合约账户名")}
            size="medium"
          />
          {/* &nbsp;
          <Checkbox checked
            onChange={
              async (checked) => {                  
                  if (checked) {
                    const accountName = await this.generateContractAccount();
                    this.setState({newContractAccountName : accountName});
                  }
              }
          }>
            {T("自动生成")}
          </Checkbox> */}
          <br/>
          <br/>
          <Input hasClear
            onChange={this.handleContractPublicKeyChange.bind(this)}
            value={this.state.newContractPublicKey}
            style={{ width: 300 }}
            addonBefore={T("公钥")}
            size="medium"
          />
          {/* &nbsp;
          <Checkbox checked
            onChange={
              (checked) => {                  
                  if (checked) {
                    const publicKey = this.getAccountPublicKey();
                    this.setState({newContractPublicKey : publicKey});
                  }
              }
          }>
            {T("同发起账户公钥")}
          </Checkbox> */}
          <br/>
          <br/>
          <Input hasClear
            onChange={this.handleFTAmountChange.bind(this)}
            defaultValue={this.state.ftAmount}
            style={{ width: 300 }}
            addonBefore={T("转账金额(FT)")}
            size="medium"
          />
          <br/>
          <br/>
          <Input hasClear
            onChange={this.handleGasPriceChange.bind(this)}
            style={{ width: 300 }}
            addonBefore="GAS单价"
            addonAfter="Gaft"
            size="medium"
            defaultValue={this.state.gasPrice}
            hasLimitHint
          />
          <br />
          1Gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
          <br />
          <br />
          <Input hasClear hasLimitHint
            onChange={this.handleGasLimitChange.bind(this)}
            style={{ width: 300 }}
            addonBefore="GAS数量上限"
            size="medium"
            defaultValue={this.state.gasLimit}
          />
          <br />
          <br />
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)}
            style={{ width: 300 }}
            addonBefore="钱包密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onDeployContractOK.bind(this)}
          />
        </Dialog>
        <TxSend visible={this.state.txSendVisible} txInfo={this.state.txInfo} accountName={this.state.selectedAccountName} sendResult={this.getTxResult.bind(this)}/>
      </div>
    );
  }
}
