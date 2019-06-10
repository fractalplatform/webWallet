/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import * as fractal from 'fractal-web3';

import TransactionList from '../../../../TransactionList';


export default class TransactionsTable extends Component {
  static displayName = 'TransactionsTable';

  constructor(props) {
    super(props);

    this.state = {
      txHashArr: [],
      current: 1,
      assetInfos: {},
      txFrom: {},
      intervalId: 0,
    };
  }

  componentDidMount() {
    this.updateTxInfo();
    this.state.intervalId = setInterval(() => {
      this.updateTxInfo();
    }, 3000);
  }

  componentWillUnmount = () => {
    clearInterval(this.state.intervalId);
  }

  updateTxInfo = () => {
    fractal.ft.getCurrentBlock(false).then(async (block) => {
      let txNum = 0;
      var maxTxNum = 20;
      if (this.state.txHashArr.length > 0) {
        txNum = this.state.txHashArr.length;
        if (txNum + block.transactions.length > maxTxNum) {
          const leftNum = txNum + block.transactions.length - maxTxNum;
          this.state.txHashArr = this.state.txHashArr.slice(0, txNum - leftNum);
        }
        this.state.txHashArr = [...block.transactions, ...this.state.txHashArr];
      } else {
        var curHeight = block.number;
        var maxLookbackNum = 20;
        
        for (var height = curHeight; height > curHeight - maxLookbackNum && height > 0; height--) {
          if (txNum >= maxTxNum) {
            console.log('get tx from block:' + height + '~' + curHeight);
            break;
          }
          const blockInfo = await fractal.ft.getBlockByNum(height, false);
          if (blockInfo == null || blockInfo.transactions == null) {
            continue;
          }
          for (let txHash of blockInfo.transactions) {
            this.state.txHashArr.push(txHash);
            txNum++;
            if (txNum >= maxTxNum) {
              break;
            }
          }
        }
      }
      
      this.setState({txFrom: { txHashArr: this.state.txHashArr, maxTxNum }});
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