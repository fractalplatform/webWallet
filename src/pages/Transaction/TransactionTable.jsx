/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import React, { Component } from 'react';
import { Search, Grid, Table, Feedback } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';
import IceContainer from '@icedesign/container';
import * as fractal from 'fractal-web3'
import * as txParser from '../../utils/transactionParser';
import TransactionList from '../../TransactionList';

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
    };
  }

  onSearch = async (value) => {
    const hash = value.key;
    if (hash.indexOf('0x') === 0) {
      let txInfo = await fractal.ft.getTransactionByHash(hash);
      if (txInfo !== undefined) {
        this.setState({
          txFrom: { txHashArr: [hash] },
        });
      } else {
        Feedback.toast.error('无法获取到交易信息');
      }
    } else {
      Feedback.toast.prompt('请输入十六进制的hash值');
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
                placeholder="交易hash"
                onFilterChange={this.onFilterChange.bind(this)}
              />
            </Col>
          </Row>
        </IceContainer>
        <br /><br />
        <TransactionList txFrom={this.state.txFrom}/>
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
