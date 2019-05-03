import axios from 'axios';

export async function bindAccountPublicKeyReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                    "method": "keystore_bindAccountAndPublicKey", 
                                    "params": params,
                                    "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function updateBoundInfoReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                    "method": "keystore_updateBindingInfo", 
                                    "params": params,
                                    "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function deleteBoundInfoReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                    "method": "keystore_deleteBound", 
                                    "params": params,
                                    "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getBoundInfoReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                    "method": "keystore_getAccountsByPublicKeys", 
                                    "params": params,
                                    "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getKeystoreReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                  "method": "keystore_listAccount", 
                                  "params": params,
                                  "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getAccountInfoReq(params) {
  var dataToSrv = JSON.stringify({"jsonrpc": "2.0", 
                                  "method": "account_getAccountByName", 
                                  "params": params,
                                  "id": 1});
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function createAccountBySystemReq(params) {
  let data = {"account": params.accountName,
              "publicKey": params.publicKey,
              "email": params.email,
            };
  return axios.post('http://192.168.0.170:8182/account/create', 
                    JSON.stringify(data)); 
}

export default {
  bindAccountPublicKeyReq,
  updateBoundInfoReq,
  deleteBoundInfoReq,
  getBoundInfoReq,
  getKeystoreReq,
  createAccountBySystemReq,
  getAccountInfoReq,
};