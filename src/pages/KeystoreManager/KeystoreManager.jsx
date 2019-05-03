import React, { Component } from 'react';
import EditableTable from './components/KeyList';

export default class KeystoreManager extends Component {
  static displayName = 'KeystoreManager';

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="keystoremanager-page">
        <EditableTable />
      </div>
    );
  }
}
