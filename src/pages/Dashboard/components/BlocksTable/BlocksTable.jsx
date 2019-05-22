/* eslint no-mixed-operators:0 */
import React, { Component } from 'react';
import { Table, Progress, Pagination } from '@icedesign/base';
import IceContainer from '@icedesign/container';
import copy from 'copy-to-clipboard';

import eventProxy from '../../../../utils/eventProxy';
import * as fractal from 'fractal-web3';

export default class BlocksTable extends Component {
  static displayName = 'BlocksTable';

  constructor(props) {
    super(props);

    this.state = {
      dataSource: [],
    };
  }

  componentDidMount() {
  	
    eventProxy.on('curHeight', async (msg) => {
      this.state.dataSource = [];
      var curHeight = msg;
      console.log('curHeight = ' + curHeight);
      for (var i = curHeight; i > curHeight - 18 && i >= 0; i--) {
        var curBlockInfo = await fractal.ft.getBlockByNum(i, false);
        curBlockInfo['txn'] = curBlockInfo.transactions.length;
        this.state.dataSource.push(curBlockInfo);
      }
      console.log('dataSource length = ' + this.state.dataSource.length);
      
      this.setState({
        dataSource: this.state.dataSource,
      });
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

  render() {
    return (
      <div className="progress-table">
        <IceContainer className="tab-card" title="区块">
          <Table
            dataSource={this.state.dataSource}
            primaryKey="number"
          >
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
