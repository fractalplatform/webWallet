/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint react/jsx-no-target-blank: 0 */
import React, { Component } from 'react';
import IceContainer from '@icedesign/container';
import { Balloon, Grid, Feedback } from '@icedesign/base';
import { connect } from 'react-redux';
import { compose } from 'redux';
import * as fractal from 'fractal-web3';
import './DisplayCard.scss';
import injectReducer from '../../../../utils/injectReducer';
import { getLatestBlock, getTransactionsNum } from './actions';
import reducer from './reducer';
import eventProxy from '../../../../utils/eventProxy';

const { Row, Col } = Grid;

class BlockTxLayout extends Component {
  static displayName = '';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      curBlockInfo: {},
      latestEpchoInfo: {},
      irreversible: {},
      curProducerList: [],
      activeProducers: [],
      totalTxNumInOneHour: 0,
      maxTPS: 0,
      txInfos: [],
      dposInfo: {},
    };
  }

  componentDidMount = async () => {
    await this.updateBlockChainInfo();
  }

  updateBlockChainInfo = async () => {
    try {
      const curBlockInfo = await fractal.ft.getCurrentBlock(false);
      const irreversibleInfo = await fractal.dpos.getDposIrreversibleInfo();
      //console.log(curBlockInfo.proposedIrreversible + '<->' + irreversibleInfo.proposedIrreversible)
      const latestEpchoInfo = await fractal.dpos.getValidCandidates();
      const candidates = await fractal.dpos.getCandidates(false);
      const dposInfo = await fractal.dpos.getDposInfo();
      const self = this;
      const curHeight = curBlockInfo.number;
      eventProxy.trigger('curHeight', curHeight);

      const maxSpan = dposInfo.blockFrequency * dposInfo.candidateScheduleSize;
      const interval = 1;

      if (self.state.txInfos.length > 12) {
        self.state.txInfos = self.state.txInfos.slice(self.state.txInfos.length - 12);
      }

      let lastMaxHeight = 0;
      if (self.state.txInfos.length > 0) {
        lastMaxHeight = self.state.txInfos[self.state.txInfos.length - 1].blockHeight;
      }
      let totalNum = self.state.totalTxNumInOneHour;
      let maxTxNum = self.state.maxTPS * dposInfo.blockInterval / 1000;
      if (curHeight - lastMaxHeight >= interval) {
        totalNum = 0;
        maxTxNum = 0;
        let promiseArr = [];
        let blockHeights = [];
        let fromHeight = curHeight - maxSpan;
        if (fromHeight < 0) {
          fromHeight = 0;
        }
        for (; fromHeight <= curHeight; fromHeight++) {
          promiseArr.push(fractal.ft.getBlockByNum(fromHeight, false));
          blockHeights.push(fromHeight);
        }
        Promise.all(promiseArr).then(blocks => {
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block == null) {
              continue;
            }
            const txNumber = block.transactions.length;
            self.state.txInfos.push({ blockHeight: blockHeights[i], txNum: txNumber });
            totalNum += txNumber;
            if (txNumber > maxTxNum) {
              maxTxNum = txNumber;
            }
          }
          eventProxy.trigger('txInfos', self.state.txInfos);

          self.setState({
            curBlockInfo,
            irreversible: irreversibleInfo,
            totalTxNumInOneHour: totalNum,
            maxTPS: Math.round(maxTxNum * 1000 / dposInfo.blockInterval),
            latestEpchoInfo,
            curProducerList: candidates,
            activeProducers: latestEpchoInfo.activatedCandidateSchedule,
          });
          
        }).catch(error => {
          console.log(error);
          Feedback.toast.error(error);
        });
      }
      setTimeout(() => { this.updateBlockChainInfo(); }, 3000);
    } catch (error) {
      Feedback.toast.error(error);
    }
  }

  caculateTxNums = async (curHeight, interval, maxSpan) => {
    const txNums = [];
    let totalNum = 0;
    let maxTxNum = 0;
    for (let from = curHeight; from > curHeight - maxSpan + interval;) {
      const resp = await getTotalTxNumByBlockNum([from, interval]);
      const txNum = resp.data.result;
      txNums.push(txNum);
      totalNum += txNum;
      if (txNum > maxTxNum) {
        maxTxNum = txNum;
      }
      from -= interval;
    }
    return { txNums, totalNum, maxTxNum };
  }

  render() {
    return (
      <IceContainer className="display-card-container" style={styles.container}>
        <Row wrap>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
              最新区块
            </div>
            <div className="count" style={styles.count}>
              {this.state.curBlockInfo.number}
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                  最新区块高度
                </Balloon>
              </span>
            </div>
            <div className="count" style={styles.smallCount}>
              {this.state.irreversible.bftIrreversible}
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                  不可逆区块高度
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
              交易信息
            </div>
            <div style={styles.count} className="count">
              {this.state.maxTPS} TPS
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                  两轮出块周期内最高TPS
                </Balloon>
              </span>
            </div>
            <div style={styles.smallCount} className="count">
              {this.state.totalTxNumInOneHour} Txns
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                 最近两轮的交易数
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
              生产者
            </div>
            <div style={styles.count} className="count">
              {this.state.curProducerList.length}
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                  注册为生产者的节点数量
                </Balloon>
              </span>
            </div>
            <div style={styles.smallCount} className="count">
              {this.state.activeProducers.length}
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                 出块节点数量
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
              投票数
            </div>
            <div style={styles.count} className="count">
              {this.state.latestEpchoInfo.totalQuantity} FT
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                  总投出的票数
                </Balloon>
              </span>
            </div>
            <div style={styles.smallCount} className="count">
              {this.state.latestEpchoInfo.activatedTotalQuantity} FT
              <span style={styles.extraIcon}>
                <Balloon
                  trigger={
                    <img
                      src={require('./images/TB1mfqwXFuWBuNjSszbXXcS7FXa-36-36.png')}
                      alt=""
                      width="12"
                      height="12"
                    />
                  }
                  triggerType="hover"
                  closable={false}
                >
                 出块节点获得的总票数
                </Balloon>
              </span>
            </div>
          </Col>
        </Row>
      </IceContainer>
    );
  }
}

const styles = {
  container: {
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '10px 0',
  },
  title: {
    fontSize: '12px',
    marginBottom: '5px',
  },
  count: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '3px',
  },
  smallCount: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '3px',
  },
  desc: {
    fontSize: '12px',
  },
  down: {
    width: '6px',
    height: '9px',
  },
  up: {
    width: '6px',
    height: '9px',
  },
  extraIcon: {
    marginLeft: '5px',
    position: 'relative',
    top: '1px',
  },
};


const mapDispatchToProps = {
  getLatestBlock,
  getTransactionsNum,
};

// 参数state就是redux提供的全局store，而loginResult会成为本组件的this.props的其中一个成员
const mapStateToProps = (state) => {
  return { lastBlockInfo: state.lastBlockInfo };
};

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

const withReducer = injectReducer({ key: 'blockTxLayout', reducer });

export default compose(
  withReducer,
  withConnect
)(BlockTxLayout);
