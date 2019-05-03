import React, { Component } from 'react';
import TrendChart from './components/TrendChart';

export default class Performance extends Component {
  static displayName = 'Performance';

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="performance-page">
        <TrendChart />
      </div>
    );
  }
}
