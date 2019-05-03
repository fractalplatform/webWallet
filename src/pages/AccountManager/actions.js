import { bindAccountPublicKeyReq,
  updateBoundInfoReq,
  deleteBoundInfoReq,
  getBoundInfoReq,
  getKeystoreReq,
  createAccountBySystemReq,
  getAccountInfoReq,
} from './api';
import { sendTransaction } from '../../api';
import { saveTxHash, saveTxBothFromAndTo } from '../../utils/utils';
import {
  BIND_ACCOUNT_REQUEST,
  BIND_ACCOUNT_SUCCESS,
  BIND_ACCOUNT_FAILURE,

  UPDATE_BOUND_REQUEST,
  UPDATE_BOUND_SUCCESS,
  UPDATE_BOUND_FAILURE,

  DELETE_BOUND_REQUEST,
  DELETE_BOUND_SUCCESS,
  DELETE_BOUND_FAILURE,

  GET_BOUND_REQUEST,
  GET_BOUND_SUCCESS,
  GET_BOUND_FAILURE,

  GET_KEYSTORE_REQUEST,
  GET_KEYSTORE_SUCCESS,
  GET_KEYSTORE_FAILURE,


  CREATE_ACCOUNT_BY_SYSTEM_DIALOG_OPEN,
  CREATE_ACCOUNT_BY_SYSTEM_DIALOG_CLOSE,
  CREATE_ACCOUNT_BY_SYSTEM_TX_REQUEST,
  CREATE_ACCOUNT_BY_SYSTEM_TX_SUCCESS,
  CREATE_ACCOUNT_BY_SYSTEM_TX_FAILURE,

  CREATE_ACCOUNT_BY_SELF_DIALOG_OPEN,
  CREATE_ACCOUNT_BY_SELF_DIALOG_CLOSE,

  GET_ACCOUNT_INFO_REQUEST,
  GET_ACCOUNT_INFO_SUCCESS,
  GET_ACCOUNT_INFO_FAILURE,

  IMPORT_ACCOUNT_DIALOG_OPEN,
  IMPORT_ACCOUNT_DIALOG_CLOSE,
  IMPORT_ACCOUNT_REQUEST,
  IMPORT_ACCOUNT_SUCCESS,
  IMPORT_ACCOUNT_FAILURE,

  TRANSFER_DIALOG_OPEN,
  TRANSFER_DIALOG_CLOSE,
  TRANSFER_REQUEST,
  TRANSFER_SUCCESS,
  TRANSFER_FAILURE,

  UPDATE_PK_DIALOG_OPEN,
  UPDATE_PK_DIALOG_CLOSE,
  UPDATE_PK_REQUEST,
  UPDATE_PK_SUCCESS,
  UPDATE_PK_FAILURE,

  CLOSE_FAIL_DIALOG,

  CREATE_NEW_ACCOUNT,
} from './constants';


const bindAccountPublicKeyAction = () => {
  return {
    type: BIND_ACCOUNT_REQUEST,
  };
};

const bindAccountPublicKeySuccessAction = (payload) => {
  return {
    type: BIND_ACCOUNT_SUCCESS,
    result: payload,
  };
};

const bindAccountPublicKeyFailAction = (payload) => {
  return {
    type: BIND_ACCOUNT_FAILURE,
    result: payload,
  };
};

const updateBoundInfoAction = () => {
  return {
    type: UPDATE_BOUND_REQUEST,
    isLoading: true,
  };
};

const updateBoundInfoSuccessAction = (payload) => {
  return {
    type: UPDATE_BOUND_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const updateBoundInfoFailAction = (payload) => {
  return {
    type: UPDATE_BOUND_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const deleteBoundInfoAction = () => {
  return {
    type: DELETE_BOUND_REQUEST,
    isLoading: true,
  };
};

const deleteBoundInfoSuccessAction = (payload) => {
  return {
    type: DELETE_BOUND_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const deleteBoundInfoFailAction = (payload) => {
  return {
    type: DELETE_BOUND_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const getBoundInfoAction = () => {
  return {
    type: GET_BOUND_REQUEST,
    isLoading: true,
  };
};

const getBoundInfoSuccessAction = (payload) => {
  return {
    type: GET_BOUND_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const getBoundInfoFailAction = (payload) => {
  return {
    type: GET_BOUND_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const getKeystoreAction = () => {
  return {
    type: GET_KEYSTORE_REQUEST,
    isLoading: true,
  };
};

const getKeystoreSuccessAction = (payload) => {
  return {
    type: GET_KEYSTORE_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const getKeystoreFailAction = (payload) => {
  return {
    type: GET_KEYSTORE_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const openDialogOfCreateAccountBySystemAction = () => {
  return {
    type: CREATE_ACCOUNT_BY_SYSTEM_DIALOG_OPEN,
  };
};

const closeDialogOfCreateAccountBySystemAction = () => {
  return {
    type: CREATE_ACCOUNT_BY_SYSTEM_DIALOG_CLOSE,
  };
};

const createAccountBySystemAction = () => {
  return {
    type: CREATE_ACCOUNT_BY_SYSTEM_TX_REQUEST,
    isLoading: true,
  };
};

const createAccountBySystemSuccessAction = (payload) => {
  return {
    type: CREATE_ACCOUNT_BY_SYSTEM_TX_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const createAccountBySystemFailAction = (payload) => {
  return {
    type: CREATE_ACCOUNT_BY_SYSTEM_TX_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const openDialogOfCreateAccountBySelfAction = () => {
  return {
    type: CREATE_ACCOUNT_BY_SELF_DIALOG_OPEN,
  };
};

const closeDialogOfCreateAccountBySelfAction = () => {
  return {
    type: CREATE_ACCOUNT_BY_SELF_DIALOG_CLOSE,
  };
};

const closeFailDialogAction = () => {
  return {
    type: CLOSE_FAIL_DIALOG,
  };
};

const getAccountInfoAction = () => {
  return {
    type: GET_ACCOUNT_INFO_REQUEST,
    isLoading: true,
  };
};

const getAccountInfoSuccessAction = (payload) => {
  return {
    type: GET_ACCOUNT_INFO_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const getAccountInfoFailAction = (payload) => {
  return {
    type: GET_ACCOUNT_INFO_FAILURE,
    result: payload,
    isLoading: false,
  };
};


const openImportAccountDialogAction = () => {
  return {
    type: IMPORT_ACCOUNT_DIALOG_OPEN,
  };
};

const closeImportAccountDialogAction = () => {
  return {
    type: IMPORT_ACCOUNT_DIALOG_CLOSE,
  };
};

const importAccountAction = () => {
  return {
    type: IMPORT_ACCOUNT_REQUEST,
    isLoading: true,
  };
};

const importAccountSuccessAction = (payload) => {
  return {
    type: IMPORT_ACCOUNT_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const importAccountFailAction = (payload) => {
  return {
    type: IMPORT_ACCOUNT_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const openTransferDialogAction = () => {
  return {
    type: TRANSFER_DIALOG_OPEN,
  };
};

const closeTransferDialogAction = () => {
  return {
    type: TRANSFER_DIALOG_CLOSE,
  };
};

const transferRequestAction = () => {
  return {
    type: TRANSFER_REQUEST,
    isLoading: true,
  };
};

const transferSuccessAction = (payload) => {
  return {
    type: TRANSFER_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const transferFailAction = (payload) => {
  return {
    type: TRANSFER_FAILURE,
    result: payload,
    isLoading: false,
  };
};

const openUpdatePKDialogAction = () => {
  return {
    type: UPDATE_PK_DIALOG_OPEN,
  };
};

const closeUpdatePKDialogAction = () => {
  return {
    type: UPDATE_PK_DIALOG_CLOSE,
  };
};

const updatePKRequestAction = () => {
  return {
    type: UPDATE_PK_REQUEST,
    isLoading: true,
  };
};

const updatePKSuccessAction = (payload) => {
  return {
    type: UPDATE_PK_SUCCESS,
    result: payload,
    isLoading: false,
  };
};

const updatePKFailAction = (payload) => {
  return {
    type: UPDATE_PK_FAILURE,
    result: payload,
    isLoading: false,
  };
};


// 绑定账户：
// 节点钱包会获取账户信息，若存在，则将账号和公钥保存在本地硬盘上
export const bindAccountPublicKey = (params) => {
  return async (dispatch) => {
    dispatch(bindAccountPublicKeyAction());
    try {
      const response = await bindAccountPublicKeyReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(bindAccountPublicKeySuccessAction(params));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(bindAccountPublicKeyFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(bindAccountPublicKeyFailAction(error));
    }
  };
};

export const deleteBoundInfo = (params) => {
  return async (dispatch) => {
    dispatch(deleteBoundInfoAction());
    try {
      const response = await deleteBoundInfoReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(deleteBoundInfoSuccessAction(...params));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(deleteBoundInfoFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(deleteBoundInfoFailAction(error));
    }
  };
};

export const updateBoundInfo = (params) => {
  return async (dispatch) => {
    dispatch(updateBoundInfoAction());
    try {
      const response = await updateBoundInfoReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(updateBoundInfoSuccessAction(response.data.result));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(updateBoundInfoFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(updateBoundInfoFailAction(error));
    }
  };
};

export const getBoundInfo = (params) => {
  return async (dispatch) => {
    dispatch(getBoundInfoAction());
    try {
      const response = await getBoundInfoReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        if (response.data.result !== undefined) {
          dispatch(getBoundInfoSuccessAction(response.data.result));
        } else {
          dispatch(getBoundInfoSuccessAction([]));
        }
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(getBoundInfoFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(getBoundInfoFailAction(error));
    }
  };
};

// 获取keystore信息成功后便会查询所有的账号绑定信息
export const getKeystore = (params) => {
  return async (dispatch) => {
    dispatch(getKeystoreAction());
    try {
      const response = await getKeystoreReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(getKeystoreSuccessAction(response.data.result));
        const publicKeys = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const keyInfo of response.data.result) {
          publicKeys.push(keyInfo.publicKey);
        }
        dispatch(getBoundInfo([[...publicKeys]]));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(getKeystoreFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(getKeystoreFailAction(error));
    }
  };
};

export const openDialogOfCreateAccountBySystem = () => {
  return async (dispatch) => {
    dispatch(openDialogOfCreateAccountBySystemAction());
  };
};

export const closeDialogOfCreateAccountBySystem = () => {
  return async (dispatch) => {
    dispatch(closeDialogOfCreateAccountBySystemAction());
  };
};

export const openDialogOfCreateAccountBySelf = () => {
  return async (dispatch) => {
    dispatch(openDialogOfCreateAccountBySelfAction());
  };
};

export const closeDialogOfCreateAccountBySelf = () => {
  return async (dispatch) => {
    dispatch(closeDialogOfCreateAccountBySelfAction());
  };
};

export const closeFailDialog = () => {
  return async (dispatch) => {
    dispatch(closeFailDialogAction());
  };
};

// 此方法执行成功后需要关闭创建页面
export const createAccountBySystem = (params) => {
  return async (dispatch) => {
    dispatch(createAccountBySystemAction());
    try {
      const response = await createAccountBySystemReq(params);
      if (response.status === 200) {
        if (response.data.code === 0) {
          saveTxHash(params.accountName, CREATE_NEW_ACCOUNT, response.data.message);
          dispatch(createAccountBySystemSuccessAction(''));
          setTimeout(() => {
            dispatch(getAccountInfo([params.accountName])).then(resp => {
              if (Object.prototype.hasOwnProperty.call(resp, 'result')) {
                dispatch(bindAccountPublicKey([resp.result.accountName]));
              }
            });
          }, 3000);
        } else {
          dispatch(createAccountBySystemFailAction(response.data.message));
        }
      } else {
        dispatch(createAccountBySystemFailAction(response.status));
      }
      return response.data;
    } catch (error) {
      dispatch(createAccountBySystemFailAction(error));
    }
  };
};

export const createAccountBySelf = (params) => {
  return async (dispatch) => {
    dispatch(createAccountBySystemAction());
    try {
      const response = await sendTransaction(params);
      if (response.status === 200) {
        if (response.data.result != null) {
          saveTxBothFromAndTo(params.accountName, params.toAccountName, params.actionType, response.data.result);
          dispatch(createAccountBySystemSuccessAction(''));
          setTimeout(() => {
            dispatch(getAccountInfo([params.toAccountName])).then(resp => {
              if (Object.prototype.hasOwnProperty.call(resp, 'result')) {
                dispatch(bindAccountPublicKey([resp.result.accountName]));
              }
            });
          }, 3000);
        } else {
          dispatch(createAccountBySystemFailAction(response.data.error));
        }
      } else {
        dispatch(createAccountBySystemFailAction(response.status));
      }
      return response.data;
    } catch (error) {
      dispatch(createAccountBySystemFailAction(error));
    }
  };
};

export const getAccountInfo = (params) => {
  return async (dispatch) => {
    dispatch(getAccountInfoAction());
    try {
      const response = await getAccountInfoReq(params);
      if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(getAccountInfoSuccessAction(response.data.result));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(getAccountInfoFailAction(response.data.error));
      }
      return response.data;
    } catch (error) {
      dispatch(getAccountInfoFailAction(error));
    }
  };
};


export const openDialogOfImportAccount = () => {
  return async (dispatch) => {
    dispatch(openImportAccountDialogAction());
  };
};

export const closeDialogOfImportAccount = () => {
  return async (dispatch) => {
    dispatch(closeImportAccountDialogAction());
  };
};

export const importAccount = (params) => {
  return async (dispatch) => {
    dispatch(importAccountAction());
    try {
      const response = await getAccountInfoReq(params);

      if (Object.prototype.hasOwnProperty.call(response.data, 'result') && response.data.result != null) {
        dispatch(getAccountInfoSuccessAction(response.data.result));
        dispatch(bindAccountPublicKey([response.data.result.accountName])).then(resp => {
          if (Object.prototype.hasOwnProperty.call(resp, 'result')) {
            dispatch(importAccountSuccessAction());
          } else if (Object.prototype.hasOwnProperty.call(resp, 'error')) {
            dispatch(importAccountFailAction(resp.error));
          }
        });
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'error')) {
        dispatch(getAccountInfoFailAction(response.data.error));
      } else if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
        dispatch(getAccountInfoFailAction('Account is not exist.'));
      }
      return response.data;
    } catch (error) {
      dispatch(importAccountFailAction(error));
    }
  };
};

export const openDialogOfTransfer = () => {
  return async (dispatch) => {
    dispatch(openTransferDialogAction());
  };
};

export const closeDialogOfTransfer = () => {
  return async (dispatch) => {
    dispatch(closeTransferDialogAction());
  };
};

export const transfer = (params) => {
  return async (dispatch) => {
    dispatch(transferRequestAction());
    try {
      const response = await sendTransaction(params);
      if (response.status === 200) {
        if (response.data.result != null) {
          saveTxBothFromAndTo(params.accountName, params.toAccountName, params.actionType, response.data.result);
          dispatch(transferSuccessAction(response.data.result));
        } else {
          dispatch(transferFailAction(response.data.error));
        }
      } else {
        dispatch(transferFailAction(response.status));
      }
      return response.data;
    } catch (error) {
      dispatch(transferFailAction(error));
    }
  };
};

export const openDialogOfUpdatePK = () => {
  return async (dispatch) => {
    dispatch(openUpdatePKDialogAction());
  };
};

export const closeDialogOfUpdatePK = () => {
  return async (dispatch) => {
    dispatch(closeUpdatePKDialogAction());
  };
};

export const updatePK = (params) => {
  return async (dispatch) => {
    dispatch(updatePKRequestAction());
    try {
      const response = await sendTransaction(params);
      if (response.status === 200) {
        if (response.data.result != null) {
          saveTxHash(params.accountName, params.actionType, response.data.result);
          dispatch(updatePKSuccessAction(response.data.result));
          setTimeout(() => {
            dispatch(getAccountInfo([params.accountName])).then(resp => {
              if (Object.prototype.hasOwnProperty.call(resp, 'result') && resp.result != null) {
                dispatch(bindAccountPublicKey([resp.result.accountName]));
              }
            });
          }, 3000);
        } else {
          dispatch(updatePKFailAction(response.data.error));
        }
      } else {
        dispatch(updatePKFailAction(response.status));
      }
      return response.data;
    } catch (error) {
      dispatch(updatePKFailAction(error));
    }
  };
};
