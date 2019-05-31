/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import { Table, Progress, Pagination } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import copy from 'copy-to-clipboard';

import * as utils from '../../../../utils/utils';
import * as fractal from 'fractal-web3';

export default class BlocksTable extends Component {
  static displayName = 'BlocksTable';

  constructor(props) {
    super(props);

    this.state = {
      blockList: [],
    };
  }

  componentDidMount() {
  	this.updateBlockInfo();
  }

  updateBlockInfo = () => {
    fractal.ft.getCurrentBlock().then(async(block) => {
      this.state.blockList = [block, ...this.state.blockList];
      block['txn'] = block.transactions.length;
      let length = this.state.blockList.length;
      if (length < 18) {
        const lastBlock = this.state.blockList[length - 1];
        var startHeight = lastBlock.number - 1;
        for (var i = startHeight; i > startHeight - (18 - length) && i >= 0; i--) {
          var curBlockInfo = await fractal.ft.getBlockByNum(i, false);
          curBlockInfo['txn'] = curBlockInfo.transactions.length;
          this.state.blockList.push(curBlockInfo);
        }
      } 
      while (length > 18) {
        this.state.blockList.pop();
        length = this.state.blockList.length;
      }

      // const blockList = [];
      // var curHeight = block.number;
      // for (var i = curHeight; i > curHeight - 18 && i >= 0; i--) {
      //   var curBlockInfo = await fractal.ft.getBlockByNum(i, false);
      //   curBlockInfo['txn'] = curBlockInfo.transactions.length;
      //   blockList.push(curBlockInfo);
      // }
      this.setState({
        blockList: this.state.blockList,
      });
      setTimeout(() => { this.updateBlockInfo(); }, 3000);
    });
  }

  renderCellProgress = value => (
    <Progress showInfo={false} percent={parseInt(value, 10)} />
  );

  renderSize = value => {

  }
  copyValue = (value) => {
    copy(value);
    Feedback.toast.success('已复制到粘贴板');
  }

  renderHash = (value) => {
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={'点击可复制'} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }

  renderTimeStamp = (value) => {
    return utils.getValidTime(value);
  }

  render() {
    return (
      <div className="progress-table">
        <IceContainer className="tab-card" title="区块">
          <Table
            dataSource={this.state.blockList}
            primaryKey="number"
          >
            <Table.Column title="时间" dataIndex="timestamp" width={100} cell={this.renderTimeStamp.bind(this)}/>
            <Table.Column title="高度" dataIndex="number" width={100} />
            <Table.Column title="Hash" dataIndex="hash" width={150} cell={this.renderHash.bind(this)}/>
            <Table.Column title="交易数" dataIndex="txn" width={100} />
            <Table.Column title="Gas消耗" dataIndex="gasUsed" width={100} />
            <Table.Column title="区块大小(B)" dataIndex="size" width={100}/>
            <Table.Column title="生产者" dataIndex="miner" width={100} />
          </Table>
        </IceContainer>
      </div>
    );
  }
}

const styles = {
  paginationWrapper: {
    display: 'flex',
    padding: '20px 0 0 0',
    flexDirection: 'row-reverse',
  },
};
