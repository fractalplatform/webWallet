import React, { Component } from 'react';
import ContractEditor from './components/Editor';

export default class ContractManager extends Component {
  static displayName = 'ContractManager';

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div style={{height:800, width:800}}>
        <ContractEditor style={{height:800, width:800}}/>
      </div>
    );
  }
}
