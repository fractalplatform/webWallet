import React, { Component } from 'react';
import { Input, Feedback, Card } from '@icedesign/base';
import { Button } from '@alifd/next';
import * as fractal from 'fractal-web3';
import cookie from 'react-cookies';

import * as utils from '../../utils/utils'
import ContractEditor from './components/Editor';
import TxSend from "../TxSend";
import * as Constant from '../../utils/constant';

export default class ContractManager extends Component {
  static displayName = 'ContractManager';

  constructor(props) {
    super(props);
    let abiInfoStr = '';
    const abiInfo = cookie.load('abiInfo');
    if (abiInfo != null) {
      abiInfoStr = JSON.stringify(abiInfo).replace(/\\"/g, '"');
    }
    const abiContractName = cookie.load('abiContractName');

    this.state = {
      contractFuncInfo: [],
      abiInfo: abiInfoStr,
      paraValue: {},
      funcParaTypes: {},
      funcParaNames: {},
      funcParaConstant: {},
      result: {},
      txInfo: {},
      txSendVisible: false,
      contractName: abiContractName,
    };
  }

  componentDidMount = () => {
    const abiInfo = cookie.load('abiInfo');
    if (abiInfo != null) {
      const abiInfoStr = JSON.stringify(abiInfo).replace(/\\"/g, '"');
      this.setState({ storedAbiInfo: abiInfoStr });
    }
  }

  handleContractAccountChange = (value) => {
    this.state.contractAccount = value;
  }

  saveContractName = (value) => {
    this.state.contractName = value.currentTarget.defaultValue;
    cookie.save('abiContractName', this.state.contractName);
  }

  handleABIInfoChange = (value) => {
    this.state.abiInfo = value;
  }

  parseABI = () => {
    if (!utils.isEmptyObj(this.state.abiInfo) && !fractal.utils.isValidABI(this.state.abiInfo)) {
      Feedback.toast.error('ABI信息不符合规范，请检查后重新输入');
      return;
    }
    this.state.contractFuncInfo = [];
    const abiInfo = JSON.parse(this.state.abiInfo);
    for (const interfaceInfo of abiInfo) {
      if (interfaceInfo.type === 'function') {
        const funcName = interfaceInfo.name;
        const parameterTypes = [];
        const parameterNames = [];
        for (const input of interfaceInfo.inputs) {
          parameterTypes.push(input.type);
          parameterNames.push(input.name);
        }
        this.state.funcParaTypes[funcName] = parameterTypes;
        this.state.funcParaNames[funcName] = parameterNames;
        this.state.funcParaConstant[funcName] = interfaceInfo.constant;
        this.state.contractFuncInfo.push(this.generateOneFunc(funcName, parameterTypes, parameterNames));
        this.state.contractFuncInfo.push(<br />);
        this.state.contractFuncInfo.push(<br />);
      }
    }
    cookie.save('abiInfo', this.state.abiInfo);
    this.setState({ contractFuncInfo: this.state.contractFuncInfo, txSendVisible: false });
  }

  handleParaValueChange = (funcName, paraName, value) => {
    this.state.paraValue[funcName + '-' + paraName] = value;
  }

  callContractFunc = async (funcName) => {
    if (utils.isEmptyObj(this.state.contractAccount)) {
      Feedback.toast.error('请输入合约账号名');
      return;
    }
    const contractAccount = await fractal.account.getAccountByName(this.state.contractAccount);
    if (contractAccount == null) {
      Feedback.toast.error('合约不存在，请检查合约名是否输入错误');
      return;
    }
    const paraNames = this.state.funcParaNames[funcName];
    const values = [];
    for (const paraName of paraNames) {
      const value = this.state.paraValue[funcName + '-' + paraName];
      if (value == null) {
        Feedback.toast.error('参数' + paraName + '尚未输入值');
        return;
      }
      values.push(value);
    }
    const payload = fractal.utils.getContractPayload(funcName, this.state.funcParaTypes[funcName], values);
    if (this.state.funcParaConstant[funcName]) {
      const callInfo = {actionType:0, from: 'fractal.admin', to: this.state.contractAccount, assetId:0, gas:100000, gasPrice:10000000000, value:0, data:payload, remark:''};
      fractal.ft.call(callInfo, 'latest').then(result => {
        this.state.result[resultName] = result;
        this.setState({ result: this.state.result });
      });
    } else {
      this.state.txInfo = { actionType: Constant.CALL_CONTRACT,
        toAccountName: this.state.contractAccount,
        assetId: 0,
        amount: 0,
        payload };
      this.setState({ txSendVisible: true });
    }
  }

  generateOneFunc = (funcName, parameterTypes, parameterNames) => {
    let index = 0;
    let inputElements = [];
    parameterNames.forEach(paraName => {
      inputElements.push(<Input hasClear
        onChange={this.handleParaValueChange.bind(this, funcName, paraName)}
        style={{ width: 600 }}
        addonBefore={paraName}
        size="medium"
        placeholder={parameterTypes[index++]}
      />)
    });
    const oneElement = <Card style={{ width: 800 }} bodyHeight="auto" title={funcName}>
                        {inputElements}
                        <br />
                        <br />
                        <Button type="primary" onClick={this.callContractFunc.bind(this, funcName)}>发起调用</Button>
                        <br />
                        <br />
                        <Input readOnly style={{ width: 600 }} addonBefore='结果' size="medium" value={this.state.result[funcName]}/>
                      </Card>;
  return oneElement;
  }

  render() {
    return (
      <div style={{width:800}}>
        {/* <ContractEditor style={{height:800, width:800}}/> */}
        <Input hasClear
          htmlType={this.state.htmlType}
          style={{ width: 800 }}
          maxLength={50}
          hasLimitHint
          addonBefore="合约账号:"
          defaultValue={this.state.contractName}
          size="medium"
          onChange={this.handleContractAccountChange.bind(this)}
          onBlur={this.saveContractName.bind(this)}
        />
        <br />
        <br />
        <Input multiple
          rows="13"
          style={{ width: 800 }}
          addonBefore="ABI信息:"
          defaultValue={this.state.abiInfo}
          size="medium"
          onChange={this.handleABIInfoChange.bind(this)}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.parseABI.bind(this)}>解析ABI</Button>
        <br />
        <br />
        {this.state.contractFuncInfo}

        <TxSend visible={this.state.txSendVisible} txInfo={this.state.txInfo}/>
      </div>
    );
  }
}
