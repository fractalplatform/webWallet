import React, { Component } from 'react';

import DisplayCard from './components/DisplayCard';

import TabChart from './components/TabChart';

import BlocksTable from './components/BlocksTable';

import TransactionsTable from './components/TransactionsTable';

import './Dashboard.scss';

export default class Dashboard extends Component {
  static displayName = 'Dashboard';

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
      <div className="dashboard-page">
        <DisplayCard />
{/* 
        <TabChart /> */}

        <BlocksTable />

        <TransactionsTable />
      </div>
    );
  }
}
