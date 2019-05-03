import {
  LATEST_BLOCK_REQUEST,
  LATEST_BLOCK_SUCCESS,
  LATEST_BLOCK_FAILURE,
  TRANSACTION_NUM_REQUEST,
  TRANSACTION_NUM_SUCCESS,
  TRANSACTION_NUM_FAILURE,
} from './constants';

// The initial state of the login
const initialState = {};

function blockTrxReducer(state = initialState, action) {
  switch (action.type) {
    case LATEST_BLOCK_REQUEST:
      return Object.assign({}, state, {
      });
    case LATEST_BLOCK_SUCCESS:
      return Object.assign({}, state, {
        blockInfo: action.payload,
      });
    case LATEST_BLOCK_FAILURE:
      return Object.assign({}, state, {
        errorInfo: action.payload,
      });
    case TRANSACTION_NUM_REQUEST:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
      });
    case TRANSACTION_NUM_SUCCESS:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
        txNum: action.payload,
      });
    case TRANSACTION_NUM_FAILURE:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
      });
    default:
      return state;
  }
}

export default blockTrxReducer;