import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { createHashHistory } from 'history';
import axios from 'axios';
import cookie from 'react-cookies';
import { Feedback } from '@icedesign/base';
import * as fractal from 'fractal-web3';

// 载入默认全局样式 normalize 、.clearfix 和一些 mixin 方法等
import '@icedesign/base/reset.scss';

import router from './router';
import configureStore from './configureStore';

// Create redux store with history
const initialState = {};
const history = createHashHistory();
const store = configureStore(initialState, history);
const ICE_CONTAINER = document.getElementById('ice-container');
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.baseURL = 'http://127.0.0.1:8545';
const nodeInfo = cookie.load('nodeInfo');
if (nodeInfo != null && nodeInfo !== '') {
  axios.defaults.baseURL = nodeInfo;
  fractal.utils.setProvider(nodeInfo);
}
if (!window.localStorage) {
  Feedback.toast.warn('请升级浏览器，当前浏览器无法保存交易结果');
}
if (!ICE_CONTAINER) {
  throw new Error('当前页面不存在 <div id="ice-container"></div> 节点.');
}

ReactDOM.render(
  <Provider store={store}>
    <ConnectedRouter history={history}>{router()}</ConnectedRouter>
  </Provider>,
  ICE_CONTAINER
);
