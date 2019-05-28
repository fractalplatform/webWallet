/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Input, Feedback, Select } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import { Button } from '@alifd/next';
import { encode } from 'rlp';
import * as fractal from 'fractal-web3';
import BigNumber from 'bignumber.js';
import copy from 'copy-to-clipboard';
import * as Constant from '../../utils/constant';
import * as TxParser from '../../utils/transactionParser';
import * as utils from '../../utils/utils';

const txTypes = [{ value: Constant.TRANSFER, label: '转账'},{value: Constant.CREATE_CONTRACT,label: '创建合约'},
                { value: Constant.CREATE_NEW_ACCOUNT, label: '创建账户' },{ value: Constant.UPDATE_ACCOUNT, label: '更新账户'},{ value: Constant.UPDATE_ACCOUNT_AUTHOR, label: '更新账户权限' },
                { value: Constant.ISSUE_ASSET, label: '发行资产' },{ value: Constant.INCREASE_ASSET, label: '增发资产' },{ value: Constant.DESTORY_ASSET, label: '销毁资产' },
                { value: Constant.SET_ASSET_OWNER, label: '设置资产所有者' },{ value: Constant.SET_ASSET_FOUNDER, label: '设置资产创办者' },{ value: Constant.REG_CANDIDATE, label: '注册候选者' },
                { value: Constant.UPDATE_CANDIDATE, label: '更新候选者' },{ value:  Constant.UNREG_CANDIDATE, label: '注销候选者' },{ value: Constant.VOTE_CANDIDATE, label: '给候选者投票' },
                { value: Constant.REFUND_DEPOSIT, label: '取回抵押金' }];

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
      testScene: '',
      sceneTestCase: '',
      sceneTestCaseNames: [],
      testCaseNames: [],
      testResult: '',
      nonPredictTestScenes: [],
    };
  }
  componentDidMount = () => {
    fractal.ft.getChainConfig().then(chainConfig => {
      fractal.ft.setChainId(chainConfig.chainId);
      const testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
      if (testCases != null) {
        this.setState({ sceneTestCase: JSON.stringify(testCases) });
      }
    });
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

  hasPayloadTx = (actionType) => {
    return actionType != Constant.TRANSFER && actionType != Constant.UNREG_CANDIDATE 
        && actionType != Constant.REFUND_DEPOSIT && actionType != Constant.DESTORY_ASSET;
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
  sendTransaction = () => {
    // if (!ethUtil.isValidPrivate(Buffer.from(utils.hex2Bytes(this.state.privateKey)))) {
    //   Feedback.toast.error('请输入合法的私钥');
    //   return;
    // }
    if (utils.isEmptyObj(this.state.txInfo)) {
      Feedback.toast.error('请先生成交易内容');
      return;
    }
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
  handleElementChange = (actionType, payloadName, index, isNumber, v) => {
    this.state[actionType + '-' + index] = { value: v, isNumber, payloadName };
  }
  handleActionElementChange = (actionElement, v) => {
    this.state[actionElement] = v;
  }
  handleSceneTestCaseChange = (v) => {
    this.setState({ sceneTestCase: v });
  }
  parseSceneTestCase = () => {
    try {
      const sceneTestCaseObj = JSON.parse(this.state.sceneTestCase);
      utils.storeDataToFile(Constant.CurTestSceneCases, sceneTestCaseObj);
      this.setState({sceneTestCaseNames: Object.keys(sceneTestCaseObj)});
    } catch (error) {
      Feedback.toast.error('测试用例解析失败');
    }
  }
  onChangeTestScene  = (v) => {
    this.state.testSceneName = v;
    const sceneTestCaseObj = JSON.parse(this.state.sceneTestCase);
    const testCases = sceneTestCaseObj[v].testCases;
    this.state.testCaseNames = [];
    let index = 0;
    for (const testCase of testCases) {
      let label = testCase.type + '-';
      if (testCase.type == 'send') {
        const actionType = testCase.info.actions[0].actionType;
        label += TxParser.getActionTypeStr(actionType);
      } else {
        label += testCase.info.method + '(' + testCase.info.arguments + ')';
      }
      this.state.testCaseNames.push({label, value: index});
      index++;
    }
    this.setState({testCaseNames: this.state.testCaseNames});
  }
  onChangeTestCase = (v) => {
    this.state.testCaseObj = v;
  }
  sleep = (delay) => {
    var start = (new Date()).getTime();
    while ((new Date()).getTime() - start < delay) {
      continue;
    }
  }
  getTxCorrespondingInfo = async (testCase) => {
    let statusInfo = {};
    const actionInfo = testCase.actions[0];
    const actionType = testCase.actions[0].actionType;
    const fromAccount = await fractal.account.getAccountByName(actionInfo.accountName);
    statusInfo.fromAccount = fromAccount;
    const toAccount = await fractal.account.getAccountByName(actionInfo.toAccountName);
    statusInfo.toAccount = toAccount;
    switch (actionType) {
      case Constant.TRANSFER:
        break;
      case Constant.CREATE_CONTRACT:
        break;    
      case Constant.CREATE_NEW_ACCOUNT:
        const newAccount = await fractal.account.getAccountByName(actionInfo.payloadDetailInfo.newAccountName);
        statusInfo.newAccount = newAccount;
        break;
      case Constant.UPDATE_ACCOUNT:
        break;
      case Constant.UPDATE_ACCOUNT_AUTHOR:
        break;
      case Constant.ISSUE_ASSET:
        const owner = await fractal.account.getAccountByName(actionInfo.payloadDetailInfo.owner);
        statusInfo.owner = owner;
        break;
      case Constant.INCREASE_ASSET:
        const increaseAccount = await fractal.account.getAccountByName(actionInfo.payloadDetailInfo.accountName);
        statusInfo.increaseAccount = increaseAccount;
        break;
      case Constant.DESTORY_ASSET:
      case Constant.SET_ASSET_OWNER:
      case Constant.SET_ASSET_FOUNDER:
        // 先向fractal.asset转账，然后fractal.asset减去这笔钱，最后修改资产信息
        const asset = await fractal.account.getAssetInfoById(actionInfo.assetId);
        statusInfo.asset = asset;
        break;
      case Constant.REG_CANDIDATE:
        break;
      case Constant.UPDATE_CANDIDATE:
        break;
      case Constant.UNREG_CANDIDATE:
        break;
      case Constant.VOTE_CANDIDATE:
        const candidate = await fractal.dpos.getCandidateByName(actionInfo.payloadDetailInfo.accountName);
        statusInfo.candidate = candidate;
        break;
      case Constant.REFUND_DEPOSIT:
        break;
      default:
        console.log('error action type:' + actionInfo.type);
    }
    return statusInfo;
  }

  compareStatusInfo = (testCase, receipt, historyStatusInfo, curStatusInfo, bSuccess) => {
    const actionType = testCase.actions[0].actionType;
    switch (actionType) {
      case Constant.TRANSFER:
        break;
      case Constant.CREATE_CONTRACT:
        break;    
      case Constant.CREATE_NEW_ACCOUNT:
        break;
      case Constant.UPDATE_ACCOUNT:
        break;
      case Constant.UPDATE_ACCOUNT_AUTHOR:
        break;
      case Constant.ISSUE_ASSET:
        break;
      case Constant.INCREASE_ASSET:
        break;
      case Constant.DESTORY_ASSET:
      case Constant.SET_ASSET_OWNER:
      case Constant.SET_ASSET_FOUNDER:
        break;
      case Constant.REG_CANDIDATE:
        break;
      case Constant.UPDATE_CANDIDATE:
        break;
      case Constant.UNREG_CANDIDATE:
        break;
      case Constant.VOTE_CANDIDATE:
        break;
      case Constant.REFUND_DEPOSIT:
        break;
      default:
        console.log('error action type:' + actionInfo.type);
    }
  }

  execTest = async (testSceneName) => {
    const sceneTestCaseObj = JSON.parse(this.state.sceneTestCase);
    const sceneTestCase = sceneTestCaseObj[testSceneName];
    const predictResult = sceneTestCase.predictResult == 1;
    let result = true;
    const testCases = sceneTestCase.testCases;
    let testResultInfo = '测试场景：' + testSceneName + '\n此场景包含测试用例数：' + testCases.length + ', 预期结果为:' + (predictResult ? '成功' : '失败');
    this.setState({ testResult: testResultInfo });
    for (const testCase of testCases) {
      try {
        const historyStatusInfo = await this.getTxCorrespondingInfo(testCase);

        const txTypeName = TxParser.getActionTypeStr(testCase.actions[0].actionType);
        const originalInfo = JSON.stringify(testCase);
        testResultInfo += '\n\n交易类型：' + txTypeName;
        testResultInfo += '\n交易原始信息：' + originalInfo;
        this.setState({ testResult: testResultInfo });
        const signInfo = await fractal.ft.signTx(testCase, testCase.privateKey);
        const txHash = await fractal.ft.sendSingleSigTransaction(testCase, signInfo);
        testResultInfo += '\n本次交易发送成功，获得交易hash：' + txHash;
        this.setState({ testResult: testResultInfo });
        let gotReceipt = false;
        while(!gotReceipt) {
          testResultInfo += '\n开始获取receipt...';
          this.setState({ testResult: testResultInfo });
          this.sleep(3000);
          const receipt = await fractal.ft.getTransactionReceipt(txHash);
          if (receipt != null) {
            gotReceipt = true;
            const status = receipt.actionResults[0].status;
            const error = receipt.actionResults[0].error;
            testResultInfo += '\n通过receipt表明此交易执行结果为:' + (status == 1 ? '成功' : ('失败，原因：' + error));
            result = result && (status == 1);

            const curStatusInfo = await this.getTxCorrespondingInfo(testCase);
          }
        }
      } catch (error) {
        testResultInfo += '\n本次交易失败，错误原因：' + error;
        result = false;
      }
      this.setState({ testResult: testResultInfo });
    }
    testResultInfo += '\n本测试场景与预期:' + (predictResult == result ? '相符' : '不符') + '\n\n';
    this.setState({ testResult: testResultInfo });
    return predictResult == result;
  }

  testOneScene = async () => {
    if (utils.isEmptyObj(this.state.testSceneName)) {
      Feedback.toast.error('请先选其中一个测试场景');
      return;
    }
    const bMatchPredictResult = await this.execTest(this.state.testSceneName);
    if (!bMatchPredictResult) {
      this.setState({ nonPredictTestScenes: [this.state.testSceneName] });
    }
  }
  
  testAllScene = async () => {
    const nonPredictTestScenes = [];
    if (predictResult != result) {
      nonPredictTestScenes.push()
    }
    const sceneTestCaseObj = JSON.parse(this.state.sceneTestCase);
    for (const testSceneName of Object.keys(sceneTestCaseObj)) {
      const bMatchPredictResult = await this.execTest(testSceneName);
      if (!bMatchPredictResult) {
        nonPredictTestScenes.push(testSceneName);
      }
    }
    this.setState({ nonPredictTestScenes });
  }
  
  testOneCase = () => {

  }  
  
  render() {
    return (
      <div>
        <Input multiple
          rows="13"
          style={styles.otherElement}
          addonBefore="测试场景:"
          size="medium"
          value={this.state.sceneTestCase}
          onChange={this.handleSceneTestCaseChange.bind(this)}
        />
        <br />
        <br />       
        <Button type="primary" onClick={this.parseSceneTestCase.bind(this)}>解析以上测试场景</Button>
        <br />
        <br />
        <Select
          style={{width: '300px'}}
          placeholder="测试场景列表"
          dataSource={this.state.sceneTestCaseNames}
          onChange={this.onChangeTestScene.bind(this)}
        />
        &nbsp;&nbsp;&nbsp;&nbsp;
        <Select
          style={{width: '300px'}}
          placeholder="详细用例列表"
          onChange={this.onChangeTestCase.bind(this)}
          dataSource={this.state.testCaseNames}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.testOneScene.bind(this)}>测试选中场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.testAllScene.bind(this)}>测试所有场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.testOneCase.bind(this)}>测试单个用例</Button>
        <br />
        <br />
        <Input multiple
          rows="50"
          style={styles.otherElement}
          addonBefore="测试结果:"
          size="medium"
          value={this.state.testResult}
        />
        <br />
        <br />
        <Select
          style={styles.otherElement}
          placeholder="不符合预期的测试场景列表"
          dataSource={this.state.nonPredictTestScenes}
          />
      </div>
    );
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