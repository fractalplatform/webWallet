/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import * as fractal from 'fractal-web3';

import eventProxy from '../../../../utils/eventProxy';
import TransactionList from '../../../../TransactionList';


export default class TransactionsTable extends Component {
  static displayName = 'TransactionsTable';

  constructor(props) {
    super(props);

    this.state = {
      dataSource: [],
      current: 1,
      assetInfos: {},
      txFrom: {},
    };
  }

  componentDidMount() {
  	var _this = this;
    eventProxy.on('curHeight', async (msg) => {
      var curHeight = msg;
      var transactions = [];
      var maxLookbackNum = 200;
      var dposInfo;
      var maxTxNum = 20;
      var txNum = 0;
      fractal.dpos.getDposInfo().then(dposInfo => {
        let txSet = {};
        for (var height = curHeight; height > curHeight - maxLookbackNum && height > 0; height--) {
          if (txNum >= maxTxNum) {
            break;
          }
          fractal.ft.getBlockByNum(height, true).then(curBlockInfo => {
            let receiptPromiseArr = [];
            for (let transaction of curBlockInfo.transactions) {
              receiptPromiseArr.push(fractal.ft.getTransactionReceipt(transaction.txHash));
              txSet[transaction.txHash] = transaction;
              txNum++;
              if (txNum >= maxTxNum) {
                break;
              }
            }
            if (receiptPromiseArr.length > 0) {
              this.setState({txFrom: {txHashArr: Object.keys(txSet)}});
            }

          });
        }

      });
    });
  }

  render() {
    return (
      <div className="progress-table">
        <TransactionList txFrom={this.state.txFrom}/>
      </div>
    );
  }
}