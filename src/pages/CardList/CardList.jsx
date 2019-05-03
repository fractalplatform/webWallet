

import React, { Component } from 'react';

import TransactionsTable from '../Dashboard/components/TransactionsTable';
import './CardList.scss';

export default class CardList extends Component {
  static displayName = 'CardList';

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="card-list-page">
        <TransactionsTable />
      </div>
    );
  }
}
