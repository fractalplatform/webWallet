import { getLatestBlockReq, getTransactionsNumReq } from './api';

import {
  LATEST_BLOCK_REQUEST,
  LATEST_BLOCK_SUCCESS,
  LATEST_BLOCK_FAILURE,
  TRANSACTION_NUM_REQUEST,
  TRANSACTION_NUM_SUCCESS,
  TRANSACTION_NUM_FAILURE,
} from './constants';


const getLatestBlockInfo = () => {
  return {
    type: LATEST_BLOCK_REQUEST
  };
};

const getLatestBlockInfoSuccess = (payload) => {
  return {
    type: LATEST_BLOCK_SUCCESS,
    payload,
  };
};

const getLatestBlockInfoFail = (payload) => {
  return {
    type: LATEST_BLOCK_FAILURE,
    payload,
  };
};

const getTransactionNum = () => {
  return {
    type: TRANSACTION_NUM_REQUEST,
    isLoading: true,
  };
};

const getTransactionNumSuccess = (payload) => {
  return {
    type: TRANSACTION_NUM_SUCCESS,
    payload,
    isLoading: false,
  };
};

const getTransactionNumFail = (payload) => {
  return {
    type: TRANSACTION_NUM_FAILURE,
    payload,
    isLoading: false,
  };
};

export const getLatestBlock = (params) => {
  return async (dispatch) => {
    dispatch(getLatestBlockInfo());
    try {
      const response = await getLatestBlockReq(params);
      dispatch(getLatestBlockInfoSuccess(response.data));
      return response.data;
    } catch (error) {
      dispatch(getLatestBlockInfoFail(error));
    }
  }
}

export const getTransactionsNum = (params) => {
  return async (dispatch) => {
    dispatch(getTransactionNum());
    try {
      const response = await getTransactionsNumReq(params);
      dispatch(getTransactionNumSuccess(response.data));
      return response.data;
    } catch (error) {
      dispatch(getTransactionNumFail(error));
    }
  }
}