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
      stepDetail: '',
      curTestCase: {},
      curStepIndex: 0,
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
      return 0;
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
  addSceneTestCase = () => {
    try {
      const sceneTestCaseArr = JSON.parse(this.state.sceneTestCase);
      let testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
      if (testCases == null) {
        testCases = [];
      }
      const testCaseNames = {};
      testCases.map(testCase => testCaseNames[testCase.name] = 1);
      sceneTestCaseArr.map(newTestCase => {
        if (testCaseNames[newTestCase.name] != 1) {
          testCases.push(newTestCase);
        }
      });
      utils.storeDataToFile(Constant.CurTestSceneCases, testCases);

      this.state.sceneTestCaseNames = [];
      testCases.map(testCase => {
        this.state.sceneTestCaseNames.push(testCase.name);
      })
      this.setState({sceneTestCaseNames: this.state.sceneTestCaseNames});
      Feedback.toast.success('添加成功');
    } catch (error) {
      Feedback.toast.error('测试用例解析失败');
    }
  }
  exportAllSceneTestCase  = () => {
    const testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
    copy(JSON.stringify(testCases));
    Feedback.toast.success('已导出到粘贴板');
  }
  onChangeTestScene  = (v) => {
    try {
      this.state.testSceneName = v;
      const testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
      
      const sceneTestCaseObj = testCases.filter(testCase => testCase.name == v);
      if (sceneTestCaseObj.length == 0) {
        return;
      }
      this.state.curTestCase = sceneTestCaseObj[0];
      const procedure = sceneTestCaseObj[0].procedure;
      this.state.testCaseNames = [];
      let index = 0;
      for (const step of procedure) {
        let label = step.type + '-';
        if (step.type == 'send') {
          const actionType = step.info.actions[0].actionType;
          label += TxParser.getActionTypeStr(actionType) + '-' + step.tooltip;
        } else {
          label += step.tooltip + '-' + step.info.method + '(' + step.info.arguments + ')';
        }
        this.state.testCaseNames.push({label, value: index});
        index++;
      }

      this.setState({testCaseNames: this.state.testCaseNames, stepDetail: ''});
    } catch (error) {
      Feedback.toast.error('测试步骤解析失败');
    }
    
  }

  onChangeTestStep = (v) => {
    this.state.curStepIndex = v;
    const procedure = this.state.curTestCase.procedure;
    this.setState({stepDetail: JSON.stringify(procedure[v])});
  }

  onChangeStepDetail = (v) => {
    this.setState({stepDetail: v});
  }

  saveStep = () => {
    const testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
    testCases.map(testCase => {
      if (testCase.name == this.state.curTestCase.name) {
        testCase.procedure[this.state.curStepIndex] = JSON.parse(this.state.stepDetail);  
        this.state.curTestCase = testCase;      
      }
    });
    utils.storeDataToFile(Constant.CurTestSceneCases, testCases);

    const sceneTestCaseArr = JSON.parse(this.state.sceneTestCase);
    sceneTestCaseArr.map(testCase => {
      if (testCase.name == this.state.curTestCase.name) {
        testCase.procedure[this.state.curStepIndex] = JSON.parse(this.state.stepDetail);        
      }
    });
    this.setState({sceneTestCase: JSON.stringify(sceneTestCaseArr)});
    Feedback.toast.success('保存成功');
  }

  handleTestPathChange = (v) => {
    this.state.testPath = v;
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
    const testCases = utils.getDataFromFile(Constant.CurTestSceneCases);
      
    const sceneTestCaseObj = testCases.filter(testCase => testCase.name == testSceneName);
    if (sceneTestCaseObj.length == 0) {
      return;
    }
    let result = true;
    const procedure = sceneTestCaseObj[0].procedure;
    let testResultInfo = '测试场景：' + testSceneName + '\n此场景包含测试步骤数：' + procedure.length;
    this.setState({ testResult: testResultInfo });
    for (const step of procedure) {
      if (step.type == 'get') {
        const getResult = this.testGetCase(step);
        if (!getResult) {
          result = false;
          break;
        }
      } else if (step.type == 'check') {
        const checkResult = this.testCheckCase(step);
        const expectedResult = step.expectedResult == 1;
        if (checkResult != expectedResult) {
          result = false;
          break;
        }
      } else {
        try {
          //const historyStatusInfo = await this.getTxCorrespondingInfo(testCase);
  
          const txTypeName = TxParser.getActionTypeStr(step.actions[0].actionType);
          const originalInfo = JSON.stringify(step);
          testResultInfo += '\n\n交易类型：' + txTypeName;
          testResultInfo += '\n交易原始信息：' + originalInfo;
          this.setState({ testResult: testResultInfo });
          const signInfo = await fractal.ft.signTx(step, step.privateKey);
          const txHash = await fractal.ft.sendSingleSigTransaction(step, signInfo);
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
              //const curStatusInfo = await this.getTxCorrespondingInfo(testCase);
            }
          }
        } catch (error) {
          testResultInfo += '\n本次交易失败，错误原因：' + error;
          result = false;
        }
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

  testSendCase = async (testCase) => {
    try {
      // const historyStatusInfo = await this.getTxCorrespondingInfo(testCase);

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

          // const curStatusInfo = await this.getTxCorrespondingInfo(testCase);
        }
      }
    } catch (error) {
      testResultInfo += '\n本次交易失败，错误原因：' + error;
      result = false;
    }
    this.setState({ testResult: testResultInfo });
  }  

  getResult = (method, params) => {
    const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
      method,
      params,
      id: 1 });
    return fractal.utils.postToNode({
      data: dataToSrv,
    });
  }

  testGetCase = async (testCase) => {
    const info = testCase.info;
    let testCaseInfo = '\n开始执行Get:' + info.method + '(' + info.arguments + ')';
    try {
      this.state[info.resultObj[0]] = await this.getResult(info.method, info.arguments);
    } catch (error) {
      testCaseInfo += '\n发生错误:' + error;
      this.setState({ testResult: this.state.testResult + testCaseInfo });
      return false;
    }
    this.setState({ testResult: this.state.testResult + testCaseInfo });
    return true;
  }

  equal = (first, second) => {
    if (first == null || second == null) {
      Feedback.toast.error('equal参数不符合要求');
      return false;
    }
    const firstElements = first.split(',');
    const secondElements = second.split(',');
    const fristNum = firstElements.length;
    const secondNum = secondElements.length;
    let firstValue = first;
    let secondValue = second;
    if (this.state[firstElements[0]] != null) {
      switch(fristNum) {
        case 2:
          firstValue = this.state[firstElements[0]][firstElements[1]];
          break;
        case 3:
          firstValue = this.state[firstElements[0]][firstElements[1]][firstElements[2]];
          break;
        case 4:
          firstValue = this.state[firstElements[0]][firstElements[1]][firstElements[2]][firstElements[3]];
          break;
      }
    }

    if (this.state[secondElements[0]] != null) {
      switch(secondNum) {
        case 2:
          secondValue = this.state[secondElements[0]][secondElements[1]];
          break;
        case 3:
          secondValue = this.state[secondElements[0]][secondElements[1]][secondElements[2]];
          break;
        case 4:
          secondValue = this.state[secondElements[0]][secondElements[1]][secondElements[2]][secondElements[3]];
          break;
      }
    }

    return firstValue == secondValue;
  }

  testCheckCase = (testCase) => {
    const info = testCase.info;
    if (info.method == 'equalstr') {
      return this.equal(info.arguments[0], info.arguments[1]);
    } else if (info.method == 'equalint') {

    } else if (info.method == 'equalbool') {
      
    } else if (info.method == 'add') {
      
    } else if (info.method == 'sub') {
      
    } else if (info.method == 'mul') {
      
    } else if (info.method == 'div') {
      
    }
  }

  testOneCase= (testCase) => {
    
  }

  testPathCase = (testCase) => {

  }  
  tranform = () => {
    try {
      const newTestCaseList = [];
      const testCaseObj = JSON.parse(this.state.sceneTestCase);
      Object.keys(testCaseObj).map(testCaseName => {
        let sendObjIndex = 0;
        let getObjIndex = 0;
        let checkObjIndex = 0;
        const newTestCase = {name: testCaseName, procedure: []};
        testCaseObj[testCaseName].testCases.map(oneStep => {
          if (oneStep.type == 'send') {
            oneStep.selfObj = 'sendObj' + sendObjIndex++;
            oneStep.tooltip = '';
            const payloadDetailObj = oneStep.info.actions[0].payloadDetailInfo;
            const newPayloadDetailObj = [];
            Object.keys(payloadDetailObj).map(payloadName => {
              newPayloadDetailObj.push({name: payloadName, value: payloadDetailObj[payloadName]});
            })
            oneStep.info.actions[0].payloadDetailInfo = newPayloadDetailObj;
          } else if (oneStep.type == 'get') {
            oneStep.selfObj = 'getObj' + getObjIndex++;
            oneStep.tooltip = '';
          } else if (oneStep.type == 'check') {
            oneStep.selfObj = 'checkObj' + checkObjIndex++;
            oneStep.tooltip = '';
            if (oneStep.info.method == 'equal') {
              oneStep.info.method = 'equalstr';
            }
          }
          newTestCase.procedure.push(oneStep);
        });
        newTestCaseList.push(newTestCase);
      });
      this.setState({sceneTestCase: JSON.stringify(newTestCaseList)});
    } catch (error) {
      Feedback.toast.error('转换失败' + error);
    }
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
        <Button type="primary" onClick={this.addSceneTestCase.bind(this)}>添加以上测试场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.exportAllSceneTestCase.bind(this)}>导出所有测试场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.tranform.bind(this)}>转化为最新JSON格式</Button>
        <br />
        <br />
        <Input multiple
          rows="10"
          style={styles.otherElement}
          addonBefore="步骤详情:"
          size="medium"
          value={this.state.stepDetail}
          onChange={this.onChangeStepDetail.bind(this)}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.saveStep.bind(this)}>保存步骤详情</Button>
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
          style={{width: '440px'}}
          placeholder="详细步骤列表"
          onChange={this.onChangeTestStep.bind(this)}
          dataSource={this.state.testCaseNames}
        />
        <br />
        <br />
        <Input hasClear
          style={styles.otherElement}
          addonBefore="路径:"
          size="medium"
          onChange={this.handleTestPathChange.bind(this, 'gasLimit')}
          />
        <br />
        <br />
        <Button type="primary" onClick={this.testOneScene.bind(this)}>测试选中场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.testAllScene.bind(this)}>测试所有场景</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.testOneCase.bind(this)}>测试单个Send</Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.testPathCase.bind(this)}>测试符合路径的场景</Button>
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