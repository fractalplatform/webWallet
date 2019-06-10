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
import { T } from '../../../../utils/lang';

const { Row, Col } = Grid;

class BlockTxLayout extends Component {
  static displayName = '';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      blockInfoList: [],
      curBlockInfo: {},
      latestEpchoInfo: {},
      irreversible: {},
      curProducerList: [],
      activeProducers: [],
      txNum: 0,
      curTps:  0,
      txInfos: [],
      dposInfo: {},
      intervalId: 0,
    };
  }

  componentDidMount = () => {
    this.updateBlockChainInfo();
    this.state.intervalId = setInterval(() => {
      this.updateBlockChainInfo();
    }, 3000);
  }

  componentWillUnmount = () => {
    clearInterval(this.state.intervalId);
  }

  updateBlockChainInfo = () => {
    try {
      const self = this;
      fractal.dpos.getDposIrreversibleInfo().then(irreversibleInfo => {
        this.setState({ irreversible: irreversibleInfo });
      });
      fractal.dpos.getValidCandidates(0).then(latestEpchoInfo => {
        this.setState({ latestEpchoInfo, activeProducers: latestEpchoInfo.activatedCandidateSchedule });
      });
      fractal.dpos.getCandidates(0, false).then(candidates => {
        this.setState({ curProducerList: candidates });
      });
      fractal.dpos.getDposInfo().then(dposInfo => {
        fractal.ft.getCurrentBlock(false).then(curBlockInfo => {
          const txNum = curBlockInfo.transactions.length;
          const curTps = Math.round(txNum * 1000 / dposInfo.blockInterval);
          this.setState({ curTps, txNum, curBlockInfo });
        });
      });
    } catch (error) {
      Feedback.toast.error(error.message || error);
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
              {T('最新区块')}
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
                  {T('最新区块高度')}
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
                  {T('不可逆区块高度')}
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
            {T('交易信息')}
            </div>
            <div style={styles.count} className="count">
              {this.state.curTps} TPS
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
                  {T('最新区块的TPS')}
                </Balloon>
              </span>
            </div>
            <div style={styles.smallCount} className="count">
              {this.state.txNum} Txns
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
                 {T('最新区块的交易量')}
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
            {T('生产者')}
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
                  {T('注册为生产者的节点数量')}
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
                 {T('出块节点数量')}
                </Balloon>
              </span>
            </div>
          </Col>
          <Col xxs="24" s="12" l="6" style={styles.item}>
            <div style={styles.title} className="title">
            {T('投票数')}
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
                  {T('总投出的票数')}
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
                 {T('出块节点获得的总票数')}
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
