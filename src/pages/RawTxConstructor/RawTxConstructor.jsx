/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Input, Feedback } from '@icedesign/base';
import { Button } from '@alifd/next';
import { encode } from 'rlp';
import * as fractal from 'fractal-web3';
import BigNumber from 'bignumber.js';
import copy from 'copy-to-clipboard';


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

  handleTxInfoChange = (v) => {
    this.state.txInfo = v;
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
    if (this.state.privateKey == null || this.state.privateKey.length !== 64) {
      Feedback.toast.prompt('请输入合法的私钥');
    }
    let txInfo = this.state.txInfo.trim();
    const regex = /'/gi;
    txInfo = txInfo.replace(regex, '"');
    if (txInfo.length > 130 && txInfo.charAt(0) === '{' && txInfo.charAt(txInfo.length - 1) === '}') {
      try {
        const txObj = JSON.parse(txInfo);
        fractal.ft.sendSingleSigTransaction(txInfo, this.state.privateKey).then(txHash => {
          this.setState({ txResult: txHash });
        });
      } catch (error) {
        Feedback.toast.error(error.message);
      }
    } else {
      Feedback.toast.prompt('请输入合规的交易信息');
    }
  }
  getReceipt = () => {
    if (this.state.txResult != null) {
      fractal.ft.getTransactionReceipt(this.state.txResult).then(resp => {
        this.setState({ receipt: resp });
      });
    } else {
      Feedback.toast.prompt('无法获取receipt');
    }
  }
  render() {
    return (
      <div>
        <Input hasClear
          style={{ width: 800 }}
          addonBefore="payload信息:"
          size="medium"
          placeholder="字符串需要加双引号(英文)，字段间通过逗号(英文)隔开，如:“accountName”,10,“toAccount”,100"
          onChange={this.handlePayloadChange.bind(this)}
        />
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.rlpEncode.bind(this)}>获取RLP编码结果</Button>
        <br />
        <br />
        <Input hasClear
          htmlType={this.state.htmlType}
          style={{ width: 800 }}
          maxLength={64}
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
        <Input multiple
          rows="13"
          style={{ width: 800 }}
          addonBefore="交易内容:"
          size="medium"
          placeholder="此处需输入符合规范的交易结构体：{'chainId':1, 'actionType':256, 'accountName':'ftsystemio', 'gasAssetId':1, 'gasPrice':10,
                        'assetId':1, 'toAccountName': 'fractal001', 'gasLimit':100000,'amount':100,'payload':'0x1123322...'}"
          defaultValue="此处需输入符合规范的交易结构体，示例：{'chainId':1, 'actionType':256, 'accountName':'ftsystemio', 'gasAssetId':1, 'gasPrice':10,
                        'assetId':1, 'toAccountName': 'fractal001', 'gasLimit':100000,'amount':100,'payload':'0x1123322...'}"
          onChange={this.handleTxInfoChange.bind(this)}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.sendTransaction.bind(this)}>发送交易</Button>
        <br />
        <br />
        <Input multiple
          rows="2"
          style={{ width: 800 }}
          addonBefore="交易结果:"
          size="medium"
          value={this.state.txResult}
        />
        <br />
        <br />
        <Button type="primary" onClick={this.getReceipt.bind(this)}>获取Receipt</Button>
        <br />
        <br />
        <Input multiple
          rows="10"
          style={{ width: 800 }}
          addonBefore="Receipt:"
          size="medium"
          value={this.state.receipt}
        />
      </div>
    );
  }
}
