

import React, { Component } from 'react';

import './BasicTable.scss';

export default class BasicTable extends Component {
  static displayName = 'BasicTable';

  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <div>
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
        >
          测试网
        </a>
      </div>
    );
  }
}
