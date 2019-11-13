/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import React, { Component, useState } from 'react';
import { Search, Grid, Table, Feedback } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';
import IceContainer from '@icedesign/container';
import * as fractal from 'fractal-web3'
import ReactJson from 'react-json-view';
import formatHighlight from 'json-format-highlight';
import TransactionList from '../../TransactionList';
import { T } from '../../utils/lang';
import * as utils from '../../utils/utils';

const { Row, Col } = Grid;

export default class TransactionTable extends Component {
  static displayName = 'TransactionTable';

  constructor(props) {
    super(props);
    this.state = {
      txInfo: {},
      assetInfos: {},
      actions: [],
      txFrom: {},
      txRawData: {},
      txReceiptData: {},
      src: null,
      setSrc: null,
    };
  }

  onSearch = async (value) => {
    const hash = value.key;
    if (hash.indexOf('0x') === 0) {
      let txInfo = await fractal.ft.getTransactionByHash(hash);
      if (txInfo != null) {
        const txReceiptData = await fractal.ft.getTransactionReceipt(hash);//formatHighlight(await fractal.ft.getTransactionReceipt(hash), COLOR_OPTION);
        const txRawData = txInfo;//formatHighlight(txInfo, COLOR_OPTION);

        this.setState({
          txFrom: { txHashArr: [hash] },
          txRawData,
          txReceiptData
        });
      } else {
        Feedback.toast.error(T('无法获取到交易信息'));
      }
    } else {
      Feedback.toast.prompt(T('请输入十六进制的hash值'));
    }
  }

  // value为filter的值，obj为search的全量值
  onFilterChange = () => {
  }

  renderGasAllot = (value, index, record) => {
    return record.gasAllot.map((gasAllot) => {
      const defaultTrigger = <Tag type="normal" size="small">{gasAllot.account}->{gasAllot.gas}aft</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{gasAllot.account}->{gasAllot.gas}aft</Balloon>;
    });
  }

  render() {
    return (
      <div>
        <IceContainer>
          <Row style={{ justifyContent: 'center' }}>
            <Col span="24" s="10" l="10">
              <Search
                size="large"
                autoWidth="true"
                onSearch={this.onSearch.bind(this)}
                placeholder={T("交易hash")}
                onFilterChange={this.onFilterChange.bind(this)}
              />
            </Col>
          </Row>
        </IceContainer>
        <br /><br />
        <TransactionList txFrom={this.state.txFrom}/>
        <br />
        <IceContainer style={styles.container}>
          <h4 style={styles.title}>{T('交易原始信息')}</h4>
          <ReactJson
            src={this.state.txRawData}
          />
          {/* <div dangerouslySetInnerHTML={{__html: this.state.txRawData}} /> */}
        </IceContainer>
        <br />
        <IceContainer style={styles.container}>
          <h4 style={styles.title}>{T('交易Receipt信息')}</h4>
          <ReactJson
            src={this.state.txReceiptData}
          />
          {/* <div dangerouslySetInnerHTML={{__html: this.state.txReceiptData}} /> */}
        </IceContainer>
      </div>
    );
  }
}

const styles = {
  container: {
    margin: '0',
    padding: '0',
  },
  title: {
    margin: '0',
    padding: '15px 20px',
    fonSize: '16px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'rgba(0,0,0,.85)',
    fontWeight: '500',
    borderBottom: '1px solid #eee',
  },
  summary: {
    padding: '20px',
  },
  item: {
    height: '40px',
    lineHeight: '40px',
  },
  label: {
    display: 'inline-block',
    fontWeight: '500',
    minWidth: '74px',
    width: '150px',
  },
};
const COLOR_OPTION = {
  keyColor: 'red',
  numberColor: '#ff8c00',
  stringColor: 'green'
};