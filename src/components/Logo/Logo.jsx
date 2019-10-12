import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import * as fractal from 'fractal-web3';

export default class Logo extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      networkType: '私网',
    };
  }
  componentDidMount = () => {
    fractal.ft.getChainConfig().then(chainConfig => {
      let networkType = '私网';
      if (chainConfig.chainId == 1) {
        networkType = '主网';
      } else if (chainConfig.chainId == 100) {
        networkType = '测试网';
      }
      this.setState({networkType});
    })
  }
  render() {
    return (
      <div className="logo" style={{}}>
        <Link to="/" className="logo-text">
          Fractal {this.state.networkType}
        </Link>
      </div>
    );
  }
}
