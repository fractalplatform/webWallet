import React, { Component } from 'react';
import { Search, Grid } from "@icedesign/base";
import IceContainer from '@icedesign/container';
import {getBlockByNum, getBlockByHash} from '../../api'

import { Table, Pagination, Feedback } from '@icedesign/base';
import BigNumber from "bignumber.js"
import {getAssetInfoById, getTransactionReceipt} from '../../api'
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
        txNum: 1,
        transactions: [],
        assetInfos: {},
        onePageNum: 10,
    };
  }

  componentDidMount = async () => {
    var resp = await getBlockByNum([0, true]);
    this.setState({blockInfo: resp.data.result});
  }

  onSearch = async (value) => {
    var resp = {};
    if (value.key.indexOf("0x") == 0) {
      resp = await getBlockByHash([value.key, true]);
    } else {
      resp = await getBlockByNum([value.key, true]);
    }
    if (resp.data.result != undefined) {
      var curBlockInfo = resp.data.result;
      var transactions = [];
      for (let transaction of curBlockInfo.transactions) {
        var actionInfo = transaction.actions[0];
        if (this.state.assetInfos[actionInfo.assetID] == undefined) {
          var resp = await getAssetInfoById([actionInfo.assetID]);
          this.state.assetInfos[actionInfo.assetID] = resp.data.result;
        }
        switch(actionInfo.type) {
          case 0:
            transaction['actionType'] = '转账';
            transaction['detailInfo'] = actionInfo.from + "向" + actionInfo.to + "转账" 
                                + this.getReadableNumber(actionInfo.value, actionInfo.assetID) + this.state.assetInfos[actionInfo.assetID].symbol;
            break;
          case 256:
            transaction['actionType'] = '创建账户';
            transaction['detailInfo'] = actionInfo.from + "创建账户：" + actionInfo.to;
            if (actionInfo.value > 0) {
              transaction['detailInfo'] += "并转账" + this.getReadableNumber(actionInfo.value, actionInfo.assetID) + assetInfos[actionInfo.assetID].symbol;
            }     
            break;   
          case 257:  
            transaction['actionType'] = '更新账户';
            transaction['detailInfo'] = "更新账户";
        }

        var receiptResp = await getTransactionReceipt([transaction.txHash]);
        var actionResult = receiptResp.data.result.actionResults[0];
        transaction['result'] = actionResult.status == 1 ? '成功' : '失败（' + actionResult.error + '）';
        transaction['gasFee'] = actionResult.gasUsed + 'aft';
        transactions.push(transaction);
        if (transactions.length >= 20) {
          break;
        }
      }

      this.setState({
        blockInfo: curBlockInfo,
        txNum: transactions.length,
        transactions: transactions,
        transactionsOnePage: transactions.slice(0, this.state.onePageNum),
      });
    } else if (resp.data.error != undefined) {
        Feedback.toast.error(resp.data.error.message);
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
  getValidTime = (timestamp) => {
    var renderTime = new BigNumber(timestamp);
    renderTime = renderTime.shiftedBy(6 * -1);

    return new Date(renderTime.toNumber()).toLocaleString()
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
                <span style={styles.label}>时间戳：</span>
                <span style={styles.value}>{this.getValidTime(this.state.blockInfo.timestamp)}</span>
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
          <IceContainer>
            <h4 style={styles.title}>交易信息</h4>
            <Table
              getRowClassName={(record, index) => {
                return `progress-table-tr progress-table-tr${index}`;
              }}
              dataSource={this.state.transactionsOnePage}
            >
              <Table.Column title="交易Hash" dataIndex="txHash" width={150} />
              <Table.Column title="区块Hash" dataIndex="blockHash" width={150} />
              <Table.Column title="类型" dataIndex="actionType" width={50} />
              <Table.Column title="详情" dataIndex="detailInfo" width={180} />
              <Table.Column title="结果" dataIndex="result" width={50} />
              <Table.Column title="手续费" dataIndex="gasFee" width={80} />
            </Table>
            <Pagination onChange={this.onChange.bind(this)} className="page-demo" total={this.state.transactions.length}/>
        </IceContainer>
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