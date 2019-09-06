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

const Transfer = ({self, contractName, funcName}) => {
  return <div>
    <Checkbox key='transferCheck'
      onChange={checked => {
        let transferTogether = utils.deepClone(self.state.transferTogether);
        transferTogether[contractName + funcName] = checked;
        let visibilityValue = utils.deepClone(self.state.visibilityValue);
        visibilityValue[contractName + funcName] = checked ? 'block' : 'none';
        // self.state.visibilityValue[funcName] = checked ? 'block' : 'none';
        self.setState({ transferTogether, visibilityValue, txSendVisible: false });
        // var obj = document.getElementById(contractName + funcName + 'Container');
        // obj.style.display= visibilityValue[contractName + funcName];
      }}>{T('附带转账')}
    </Checkbox>
    <br />
    <br />
    <Container key='transferContainer' id={contractName + funcName + 'Container'} style={{display: self.state.visibilityValue[contractName + funcName], height:'50'}}>
      <Input hasClear
        onChange={self.handleParaValueChange.bind(self, contractName, funcName, 'transferAssetId')}
        style={{ width: 600 }}
        addonBefore={T('转账资产ID')}
        size="medium"
      />
      <br />
      <br />
      <Input hasClear
        onChange={self.handleParaValueChange.bind(self, contractName, funcName, 'transferAssetValue')}
        style={{ width: 600 }}
        addonBefore={T('转账资产金额')}
        size="medium"
      />
    </Container>
  </div>
}

const TxReceiptResult = ({self, contractName, funcName}) => {
  return <div>
    <Button key='getTxInfo' type="primary" onClick={self.getTxInfo.bind(self, contractName, funcName)} style={{marginRight: '20px'}}>{T('查询交易')}</Button>
    <Button key='getReceiptInfo' type="primary" onClick={self.getReceiptInfo.bind(self, contractName, funcName)}>{T('查询Receipt')}</Button>
    <br /><br />
    <Input  key='txReceiptResult' id={contractName + funcName + 'TxReceipt'} 
      value={self.state.result[contractName + funcName + 'TxReceipt']}
      multiple
      rows="5"
      style={{ width: 600 }}
      addonBefore={T("交易/Receipt信息:")}
      size="medium"
    />
  </div>
}

const Parameters = ({self, contractName, funcName, parameterNames, parameterTypes}) => {
  return parameterNames.map((paraName, index) => (
    <div>
      <Input key={paraName} hasClear
        onChange={self.handleParaValueChange.bind(self, contractName, funcName, paraName)}
        style={{ width: 600 }}
        addonBefore={paraName}
        size="medium"
        placeholder={parameterTypes[index]}
        />
      <br /><br />
    </div>
  ))
}

const OneFunc = ({self, contractAccountName, contractName, funcName, parameterTypes, parameterNames}) => {
  let callBtnName = T('查询结果');
  if (!self.state.funcParaConstant[contractName][funcName]) {
    callBtnName = T('发起合约交易');
    const transferTogether = self.state.transferTogether[contractName + funcName];
    self.state.visibilityValue[contractName + funcName] = (transferTogether != null && transferTogether) ? 'block' : 'none';
  }
  return <Card style={{ width: 800, marginBottom: "20px" }} bodyHeight="auto" title={funcName}>
          <Parameters self={self} contractName={contractName} funcName={funcName} 
            parameterNames={parameterNames} parameterTypes={parameterTypes} />
          {
            !self.state.funcParaConstant[contractName][funcName] ? 
              <Transfer self={self} contractName={contractName} funcName={funcName} /> : ''
          }
          <Button type="primary" onClick={self.callContractFunc.bind(self, contractAccountName, contractName, funcName)}>{callBtnName}</Button>
          <br />
          <br />
          <Input readOnly style={{ width: 600 }} 
            value={self.state.result[contractName + funcName]}
            addonBefore={T('结果')} size="medium"/>
          <br />
          <br />
          {
            !self.state.funcParaConstant[contractName][funcName] ? 
              <TxReceiptResult self={self} contractName={contractName} funcName={funcName} /> : ''
          }
         </Card>;
}

const ContractArea = ({ self, contract }) => {
  const {contractAccountName, contractName} = contract;
  self.state.funcParaTypes[contractName] = {};
  self.state.funcParaNames[contractName] = {};
  self.state.funcParaConstant[contractName] = {};
  
  return contract.contractAbi.map(interfaceInfo => {
    if (interfaceInfo.type === 'function') {
      const funcName = interfaceInfo.name;
      const parameterTypes = [];
      const parameterNames = [];
      for (const input of interfaceInfo.inputs) {
        parameterTypes.push(input.type);
        parameterNames.push(input.name);
      }

      self.state.funcParaTypes[contractName][funcName] = parameterTypes;
      self.state.funcParaNames[contractName][funcName] = parameterNames;
      self.state.funcParaConstant[contractName][funcName] = interfaceInfo.constant;
      return <OneFunc key={contractAccountName + contractName + funcName} self={self} 
        contractAccountName={contractAccountName} contractName={contractName} 
        funcName={funcName} parameterTypes={parameterTypes} parameterNames={parameterNames}/>;      
    }
  });
} 

const ContractCollapse = ({self, contractAccountInfo}) => {
  global.localStorage.setItem('contractAccountInfo', JSON.stringify(contractAccountInfo));
  return <Collapse rtl='ltr'>
            {contractAccountInfo.map((contract, index) => (
              <Panel key={index}  
                title={"编号：" + (index + 1) + '，合约账号:' + contract.contractAccountName + '，合约名：' + contract.contractName + '，时间：' + new Date().toLocaleString()}>
                <ContractArea self={self} contract={contract}/>
              </Panel>
            ))}
         </Collapse>
}

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
      abiInfos: [],
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
      curContractName: '',
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
      compileSrvSettingVisible: false,
      contractInfoVisible: false,
      loadedContractAccount: '',
      compileSrv: '',
      selectContactFile: '',
      selectedFileToCompile: null,
      selectedContractToDeploy: null,
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

     const compileSrvAddr = global.localStorage.getItem('compileSrv');
     if (compileSrvAddr != null) {
       this.state.compileSrv = compileSrvAddr;
       CompilerSrv.changeSrv(compileSrvAddr);
     }

     const contractAccountInfo = global.localStorage.getItem('contractAccountInfo');
     if (contractAccountInfo != null) {
      this.state.contractAccountInfo = JSON.parse(contractAccountInfo);
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

  checkABI = (abiInfo) => {
    if (utils.isEmptyObj(abiInfo) 
    || (!utils.isEmptyObj(abiInfo) && !fractal.utils.isValidABI(JSON.stringify(abiInfo)))) {
      Feedback.toast.error(T('ABI信息不符合规范，请检查后重新输入'));
      return false;
    }
    return true;
  }

  handleParaValueChange = (contractName, funcName, paraName, value) => {
    this.state.paraValue[contractName + '-' + funcName + '-' + paraName] = value;
  }

  onChangeAccount = (accountName, item) => {
    this.state.selectedAccountName = accountName;
    this.state.selectedAccount = item.object;
    this.setState({ selectedAccountName: accountName, selectedAccount: item.object, txSendVisible: false });
    this.syncSolFileToSrv();
  }

  handleContractNoChange = (v) => {
    this.state.contractIndex = v;
  }

  removeContractCall = () => {
    if (utils.isEmptyObj(this.state.contractIndex)) {
      Feedback.toast.error(T('请输入待删除合约界面的编号'));
      return;
    }
    const index = parseInt(this.state.contractIndex);
    if (index > this.state.contractAccountInfo.length || index < 1) {
      Feedback.toast.error('当前编号必须大于0，小于等于' + this.state.contractAccountInfo.length);
      return;
    }
    this.state.contractAccountInfo.splice(index - 1, 1);
    this.setState({contractAccountInfo: this.state.contractAccountInfo, txSendVisible: false});
  }

  onChangeContractFile = (fileToCompile) => {
    this.setState({ selectedFileToCompile: fileToCompile, txSendVisible: false });
  }

  onChangeContract = (contractToDeploy) => {
    this.setState({ selectedContractToDeploy: contractToDeploy, txSendVisible: false });
  }

  handleLoadedContractAccountChange = (v) => {
    this.setState({ loadedContractAccount: v, txSendVisible: false });
  }

  loadContract = () => {
    if (utils.isEmptyObj(this.state.loadedContractAccount)) {
      Feedback.toast.error(T('请输入合约账号'));
      return;
    }
    fractal.account.getAccountByName(this.state.loadedContractAccount).then(account => {
      if (account == null) {
        Feedback.toast.error(T('此账号不存在'));
        return;
      }
      if (account.codeSize == 0) {
        Feedback.toast.error(T('此账号非合约账号，无法加载'));
        return;
      }
      const contractAbi = utils.getContractABI(this.state.loadedContractAccount);
      if (!utils.isEmptyObj(contractAbi)) {
        const contractName = this.getContractName(this.state.loadedContractAccount);
        this.displayContractFunc(this.state.loadedContractAccount, 
                                 utils.isEmptyObj(contractName) ? 'tmpName-' + utils.getRandomInt(10000) : contractName , 
                                 contractAbi);
        return;
      }
      this.setState({ contractInfoVisible: true, txSendVisible: false });
    });
  }
  addLog = (logInfo) => {
    let date = new Date().toLocaleString();
    logInfo = date + ':' + logInfo + '\n\n';
    this.setState({resultInfo: this.state.resultInfo + logInfo});
  }

  compileContract = async () => {
    if (utils.isEmptyObj(this.state.selectedFileToCompile)) {
      Feedback.toast.error(T('请选择待编译的文件'));
      return;
    }
    this.addLog("开始编译");
    const compileResult = await CompilerSrv.compileSol(this.state.selectedAccountName, this.state.selectedFileToCompile);
    if (compileResult.err != null) {
      Feedback.toast.error("编译失败");
      this.addLog(compileResult.err);
      return;
    }
    Feedback.toast.success("编译成功");
    this.addLog("编译成功");

    this.state.fileContractMap[this.state.selectedFileToCompile] = compileResult;
    this.state.contractList = [];
    for (var contractFile in this.state.fileContractMap) {
      const compiledInfo = this.state.fileContractMap[contractFile];
      for (var contractName in compiledInfo) {
        this.state.contractList.push(contractFile + ":" + contractName);
        this.addLog("合约" + contractName + "编译结果\n" + compiledInfo[contractName].abi);
      }
    }
    this.setState({contractList: this.state.contractList});
  }
  setCompileSrv = () => {
    this.setState({compileSrvSettingVisible: true});
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
      const value = this.state.paraValue[contractName + '-' + funcName + '-' + paraName];
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
        this.addLog("调用函数" + funcName + "获得的结果：" + resp);
        this.state.result[contractName + funcName] = resp;
        self.setState({ result: this.state.result, txSendVisible: false });
      });
    } else {
      const assetId = this.state.transferTogether[contractName + funcName] ? parseInt(this.state.paraValue[contractName + '-' + funcName + '-transferAssetId']) : 0;
      const amount = this.state.transferTogether[contractName + funcName] ? parseInt(this.state.paraValue[contractName + '-' + funcName + '-transferAssetValue']) : 0;
      this.state.txInfo = { actionType: Constant.CALL_CONTRACT,
        toAccountName: contractAccountName,
        assetId,
        amount,
        payload };
      this.setState({ txSendVisible: true, curContractName: contractName, curCallFuncName: funcName });
    }
  }

  getTxInfo = (contractName, funcName) => {
    const txHash = this.state.curTxResult[contractName][funcName];
    if (txHash != null) {
      if (txHash.indexOf('0x') != 0) {
        Feedback.toast.error(T('非交易hash，无法查询'));
        return;
      }
      fractal.ft.getTransactionByHash(txHash).then(txInfo => {        
        this.addLog("交易信息\n" + JSON.stringify(txInfo));
        this.state.result[contractName + funcName + 'TxReceipt'] = JSON.stringify(txInfo);
        this.setState({result: this.state.result, txSendVisible: false});
      });
    }
  }

  getReceiptInfo = (contractName, funcName) => {
    const txHash = this.state.curTxResult[contractName][funcName];
    if (txHash != null) {
      if (txHash.indexOf('0x') != 0) {
        Feedback.toast.error(T('非交易hash，无法查询'));
        return;
      }
      fractal.ft.getTransactionReceipt(txHash).then(receipt => {        
        if (receipt == null) {
          Feedback.toast.error(T('receipt尚未生成'));
          return;
        }
        this.addLog("receipt\n" + JSON.stringify(receipt));
        this.state.result[contractName + funcName + 'TxReceipt'] = JSON.stringify(receipt);
        this.setState({result: this.state.result, txSendVisible: false});
        const actionResults = receipt.actionResults;
        if (actionResults[0].status == 0) {
          Feedback.toast.error(T('Receipt表明本次交易执行失败，原因') + ':' + actionResults[0].error);
        } else {
          Feedback.toast.success(T('Receipt表明本次交易执行成功'));
        }
      });
    }
  }

  getTxResult = (result) => {
    this.addLog("调用函数" + this.state.curCallFuncName + "获取的结果:" + result);
    this.state.result[this.state.curContractName + this.state.curCallFuncName] = result;
    this.setState({result: this.state.result, txSendVisible: false});
    this.state.curTxResult[this.state.curContractName] = {};
    this.state.curTxResult[this.state.curContractName][this.state.curCallFuncName] = result;
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
    this.state.solFileList.map((solFileName, index) => {
      if (solFileName == key) {        
        this.state.solFileList[index] = label;
      }
    });
    if (this.state.selectedFileToCompile == key) {
      this.state.selectedFileToCompile = label;
    }
    this.state.contractList.map((contractFile, index) => {
      const contractInfos = contractFile.split(":");
      if (contractInfos[0] == key) {        
        this.state.contractList[index] = label + ":" + contractInfos[1];
      }
    });
    if (this.state.selectedContractToDeploy != null && this.state.selectedContractToDeploy.split(":")[0] == key) {
      this.state.selectedContractToDeploy = label + ":" + this.state.selectedContractToDeploy.split(":")[1];
    }

    this.setState({solFileList: this.state.solFileList, contractFile: this.state.contractList});
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

  handleCompileSrvChange = (v) => {
    this.state.compileSrv = v;
  }

  onSetCompileSrvOK = () => {
    if (utils.isEmptyObj(this.state.compileSrv)) {
      Feedback.toast.error('请输入编译服务器地址');
      return;
    }
    CompilerSrv.changeSrv(this.state.compileSrv);
    Feedback.toast.success('编译服务器地址修改成功');
    global.localStorage.setItem('compileSrv', this.state.compileSrv);
    this.setState({compileSrvSettingVisible: false, txSendVisible: false});
  }

  onSetCompileSrvClose = () => {
    this.setState({compileSrvSettingVisible: false, txSendVisible: false});
  }  

  onAddContractABIOK = () => {
    if (!utils.isEmptyObj(this.state.contractABI) && !fractal.utils.isValidABI(this.state.contractABI)) {
      Feedback.toast.error(T('ABI信息不符合规范，请检查后重新输入'));
      return;
    }
    utils.storeContractABI(this.state.loadedContractAccount, JSON.parse(this.state.contractABI));
    const contractName = this.getContractName(this.state.loadedContractAccount);
    this.displayContractFunc(this.state.loadedContractAccount, utils.isEmptyObj(contractName) ? 'tmpName-' + utils.getRandomInt(10000) : contractName , JSON.parse(this.state.contractABI));
    this.setState({ contractInfoVisible: false });
  }

  onAddContractABIClose = () => {
    this.setState({ contractInfoVisible: false });
  }

  handleContractABIChange = (value) => {
    this.state.contractABI = value;
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
          Feedback.toast.success('进行中。。。');
          this.addLog('receipt尚未生成，继续查询');
          count++;
          if (count == 3) {
            this.addLog('receipt生成超时，请检查链是否正常');
            clearInterval(intervalId);
          }
        } else {
          this.addLog('receipt已生成');
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

  storeContractName = (contractAccountName, contractName) => {
    let storedName = utils.getDataFromFile(Constant.ContractNameFile);
    if (storedName != null) {
      storedName[contractAccountName] = contractName;
    } else {
      storedName = {};
      storedName[contractAccountName] = contractName;
    }
    utils.storeDataToFile(Constant.ContractNameFile, storedName);
  }
  
  getContractName = (contractAccountName) => {
    let storedName = utils.getDataFromFile(Constant.ContractNameFile);
    if (storedName != null) {
      return storedName[contractAccountName];
    }
    return null;
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
          this.processContractDepolyed(this.state.newContractAccountName, contractInfo[1], JSON.parse(contractCode.abi));
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
          Feedback.toast.success('合约账户创建成功，即将为账户添加合约代码');  
          this.addLog('合约账户已创建，可部署合约');    
          this.deployContractTx(this.state.newContractAccountName, contractCode.bin, this.state.gasPrice, this.state.gasLimit).then(txHash => {
            this.addLog('部署合约的交易hash:' + txHash);
            this.checkReceipt('部署合约', txHash, () => {
              Feedback.toast.success('成功部署合约'); 
              this.setState({deployContractVisible: false}); 
              this.processContractDepolyed(this.state.newContractAccountName, contractInfo[1], JSON.parse(contractCode.abi));
            });
          }).catch(error => {
            this.addLog('部署合约交易发送失败:' + error);
            Feedback.toast.error('部署合约交易发送失败：' + error);
          });
        });
      });
    }
  }
  processContractDepolyed = (contractAccountName, contractName, contractAbi) => {
    if (this.checkABI(contractAbi)) {
      this.displayContractFunc(contractAccountName, contractName, contractAbi);
      this.storeContractName(contractAccountName, contractName);
      utils.storeContractABI(contractAccountName, contractAbi);
    }
  }
  displayContractFunc = (contractAccountName, contractName, contractAbi) => {
    this.state.contractAccountInfo = [{contractAccountName, contractName, contractAbi}, ...this.state.contractAccountInfo];
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
    const self = this;
    return (
      <div style={{width:1500}}>
        <Row className="custom-row" style={{width:1500}}>
            <Col fixedSpan="11" className="custom-col-left-sidebar">
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
                            <ContractEditor fileName={fileName} accountName={this.state.selectedAccountName} style={{height:1200, width:1100}}/>
                          </Tab.Item>
                  )
                }
              </Tab>
              
              <br />
              <br />
              <Input multiple hasClear readOnly
                addonBefore={T("Log")}
                rows={20}
                style={{ height: 300 }}
                value={this.state.resultInfo}
                size="medium"
                onChange={this.handleABIInfoChange.bind(this)}
              />
              
              <br />
              <br />  
              <Input hasClear
                  onChange={this.handleContractNoChange.bind(this)}
                  style={{ width: 220 }}
                  addonBefore={T("编号")}
                  size="medium"
                />
              &nbsp;&nbsp;&nbsp;
              <Button type="primary" onClick={this.removeContractCall.bind(this)}>{T("删除")}</Button>
              <br />  
              <br />     
              <ContractCollapse self={self} contractAccountInfo={this.state.contractAccountInfo}/>
            </Col>
            <Col fixedSpan="10" className="custom-col-right-sidebar">
              <Select
                style={{ width: 280 }}
                placeholder={T("选择有权限发起合约操作的账户")}
                onChange={this.onChangeAccount.bind(this)}
                dataSource={this.state.accounts}
              />
              <br/><br/>
              <Row style={{width:280}}>
                <Select
                  style={{ width: 150 }}
                  placeholder={T("请选择待编译文件")}
                  onChange={this.onChangeContractFile.bind(this)}
                  value={this.state.selectedFileToCompile}
                  dataSource={this.state.solFileList}
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.compileContract.bind(this)}>{T("编译")}</Button>
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.setCompileSrv.bind(this)}>{T("配置")}</Button>
              </Row>
              <br/>
              <Row style={{width:280}}>
                <Select
                  style={{ width: 220 }}
                  placeholder={T("请选择合约")}
                  onChange={this.onChangeContract.bind(this)}
                  dataSource={this.state.contractList}
                  value={this.state.selectedContractToDeploy}
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.deployContract.bind(this)}>{T("部署")}</Button>
              </Row>
              <br/>
              <Row style={{width:280}}>
                <Input hasClear
                  onChange={this.handleLoadedContractAccountChange.bind(this)}
                  value={this.state.loadedContractAccount}
                  style={{ width: 220 }}
                  addonBefore={T("合约账号")}
                  size="medium"
                />
                &nbsp;&nbsp;&nbsp;
                <Button type="primary" onClick={this.loadContract.bind(this)}>{T("加载")}</Button>
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
          visible={this.state.compileSrvSettingVisible}
          title={T("请输入编译服务器地址")}
          closeable="true"
          footerAlign="center"
          onOk={this.onSetCompileSrvOK.bind(this)}
          onCancel={this.onSetCompileSrvClose.bind(this)}
          onClose={this.onSetCompileSrvClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleCompileSrvChange.bind(this)}
            style={{ width: 350 }}
            addonBefore={T("编译服务器地址")}
            size="medium"
          />
          <br />
          {
            !utils.isEmptyObj(this.state.compileSrv) && this.state.compileSrv != 'http://18.182.10.22:8888'  
              ? '当前服务器地址:' + this.state.compileSrv : ''
          }
          <br />
          默认服务器地址:http://18.182.10.22:8888
          <br />
          服务器代码:https://github.com/syslink/FTSolCompilerSrv
        </Dialog>
        <Dialog closeable='close,esc,mask'
          visible={this.state.contractInfoVisible}
          title={T("本地添加合约ABI信息")}
          footerAlign="center"
          onOk={this.onAddContractABIOK.bind(this)}
          onCancel={this.onAddContractABIClose.bind(this)}
          onClose={this.onAddContractABIClose.bind(this)}
        >
          <Input hasClear multiple
            onChange={this.handleContractABIChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("ABI信息")}
            size="medium"
            defaultValue={this.state.originalABI}
            hasLimitHint
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
