import React, { Component } from 'react';
import ConfigureStatus from './components/ConfigureTable';

export default class Configure extends Component {
  static displayName = 'Configure';

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="configure-page">
        <ConfigureStatus />
      </div>
    );
  }
}
