import React, { Component } from 'react';
import { Search, Grid } from "@icedesign/base";
import IceContainer from '@icedesign/container';
import * as fractal from 'fractal-web3'

import { Table, Pagination, Feedback } from '@icedesign/base';
import BigNumber from "bignumber.js";
import TransactionList from '../../TransactionList';
import * as utils from '../../utils/utils';

const { Row, Col } = Grid;

export default class BlockTable extends Component {
  static displayName = 'BlockTable';

  constructor(props) {
    super(props);
    this.state = {
        filter: [
            {
              text: "区块高度",
              value: "height"
            },
            {
              text: "区块Hash值",
              value: "hash"
            }
        ],
        value: "",
        blockInfo: {},
        txNum: '',
        transactions: [],
        assetInfos: {},
        onePageNum: 10,
        txFrom: {},
    };
  }

  componentDidMount = async () => {
    //var blockInfo = await fractal.ft.getBlockByNum(0, true);
    //this.setState({ blockInfo, txFrom: {blockHeight: blockInfo.number} });
  }

  onSearch = async (value) => {
    var blockInfo = {};
    var blockInfo2 = {};
    if (value.key.indexOf("0x") == 0) {
      blockInfo = await fractal.ft.getBlockByHash(value.key, true);
      blockInfo2 = await fractal.ft.getBlockByNum(blockInfo.number, false);
      if (blockInfo.hash != blockInfo2.hash) {
        Feedback.toast.prompt('注意：此区块已被回滚');
      }
    } else {
      blockInfo = await fractal.ft.getBlockByNum(value.key, true);
    }

    if (blockInfo != null) {
      this.setState({ blockInfo, txFrom: {blockHeight: blockInfo.number}, txNum: blockInfo.transactions.length });
    } else {
        Feedback.toast.prompt('区块不存在');
    }
  }

  // value为filter的值，obj为search的全量值
  onFilterChange(value, obj) {
        console.log(`filter is: ${value}`);
        console.log("fullData: ", obj);
  }

  getReadableNumber = (value, assetID) => {
    let {assetInfos} = this.state;
    var decimals = assetInfos[assetID].decimals;

    var renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(decimals * -1);
    
    BigNumber.config({ DECIMAL_PLACES: 6 });
    renderValue = renderValue.toString(10);
    return renderValue;
  }
  onChange = (currentPage) => {
    var startNo = (currentPage - 1) * this.state.onePageNum;
    var transactions = this.state.transactions.slice(startNo, startNo + this.state.onePageNum);
    this.setState({
      transactionsOnePage: transactions,
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
                    placeholder="height/hash"
                    onFilterChange={this.onFilterChange.bind(this)}
                />
            </Col>
          </Row>
        </IceContainer>

        <IceContainer style={styles.container}>
            <h4 style={styles.title}>区块信息</h4>
            <ul style={styles.summary}>
              <li style={styles.item}>
                <span style={styles.label}>高度：</span>
                <span style={styles.value}>
                  {this.state.blockInfo.number}
                </span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>不可逆高度：</span>
                <span style={styles.value}>
                  {this.state.blockInfo.proposedIrreversible}
                </span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>时间戳：</span>
                <span style={styles.value}>{this.state.blockInfo.timestamp != null ? 
                                            utils.getValidTime(this.state.blockInfo.timestamp) : ''}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>交易数：</span>
                <span style={styles.value}>{this.state.txNum}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Hash：</span>
                <span style={styles.value}>{this.state.blockInfo.hash}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>父区块Hash：</span>
                <span style={styles.value}>{this.state.blockInfo.parentHash}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Receipt Root：</span>
                <span style={styles.value}>{this.state.blockInfo.receiptsRoot}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>State Root：</span>
                <span style={styles.value}>{this.state.blockInfo.stateRoot}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Transaction Root：</span>
                <span style={styles.value}>{this.state.blockInfo.transactionsRoot}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>生产者：</span>
                <span style={styles.value}>{this.state.blockInfo.miner}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>大小：</span>
                <span style={styles.value}>{this.state.blockInfo.size}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Gas Used：</span>
                <span style={styles.value}>{this.state.blockInfo.gasUsed}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Gas Limit：</span>
                <span style={styles.value}>{this.state.blockInfo.gasLimit}</span>
              </li>
              <li style={styles.item}>
                <span style={styles.label}>Extra Data：</span>
                <span style={styles.value}>{this.state.blockInfo.extraData}</span>
              </li>
              <br/>
              <br/>
              <li style={styles.item}>
                <span style={styles.label}>Logs Bloom：</span>
                <span style={styles.value}>{this.state.blockInfo.logsBloom}</span>
              </li>
            </ul>
          </IceContainer>

          <br/>
          <br/>
          <TransactionList txFrom={this.state.txFrom}/>
      </div>
    );
  }
}

const styles = {
    container: {
      margin: '0',
      padding: '0',
      height: '800px',
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