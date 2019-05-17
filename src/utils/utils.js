/* eslint-disable prefer-template */
import pathToRegexp from 'path-to-regexp';

import BigNumber from 'bignumber.js';
import EthCrypto from 'eth-crypto';
import * as Constant from './constant';
import * as fractal from 'fractal-web3';
/**
 * 格式化菜单数据结构，如果子菜单有权限配置，则子菜单权限优先于父级菜单的配置
 * 如果子菜单没有配置，则继承自父级菜单的配置
 * @param {Array} menuData
 * @param {String} parentPath
 * @param {string} parentAuthority
 */
function formatterMenuData(menuData, parentPath = '', parentAuthority) {
  return menuData.map((item) => {
    const { path } = item;
    const result = {
      ...item,
      path,
      authority: item.authority || parentAuthority,
    };
    if (item.children) {
      result.children = formatterMenuData(
        item.children,
        `${parentPath}${item.path}`,
        item.authority
      );
    }
    return result;
  });
}

/**
 * 将 Array 结构的 Menu 数据转化成以 path 为 key 的 Object 结构
 * 扁平化 Menu 数据，通过递归调用将父子层结构的数据处理为扁平化结构
 * @param {array} menuConfig
 *
 * eg：
 *  "/dashboard": {name: "dashboard", icon: "dashboard", path: "/dashboard", children: Array(3), authority: undefined}
 *  "/form": {name: "表单页", icon: "form", path: "/form", children: Array(3), authority: undefined}
 *  "/list": {name: "列表页", icon: "table", path: "/list", children: Array(4), authority: undefined}
 */
function getFlatMenuData(menuConfig) {
  let keys = {};
  menuConfig.forEach((item) => {
    if (item.children) {
      keys[item.path] = { ...item };
      keys = { ...keys, ...getFlatMenuData(item.children) };
    } else {
      keys[item.path] = { ...item };
    }
  });
  return keys;
}

/**
 *
 * @param {Array}  routerConfig
 * @param {Object} menuConfig
 */
function getRouterData(routerConfig, menuConfig) {
  const menuData = getFlatMenuData(formatterMenuData(menuConfig));

  const routerData = [];

  routerConfig.forEach((item, index) => {
    // 匹配菜单中的路由，当路由的 path 能在 menuData 中找到匹配（即菜单项对应的路由），则获取菜单项中当前 path 的配置 menuItem
    // eg.  router /product/:id === /product/123
    const pathRegexp = pathToRegexp(item.path);
    const menuKey = Object.keys(menuData).find((key) =>
      pathRegexp.test(`${key}`)
    );

    let menuItem = {};
    if (menuKey) {
      menuItem = menuData[menuKey];
    }

    let router = routerConfig[index];
    router = {
      ...router,
      name: router.name || menuItem.name,
      authority: router.authority || menuItem.authority,
    };

    routerData.push(router);
  });

  return routerData;
}

function hex2Bytes(str) {
  let pos = 0;
  let len = str.length;
  let hexA = new Uint8Array();

  if (str[0] === '0' && (str[1] === 'x' || str[1] === 'X')) {
    pos = 2;
    len -= 2;
  }
  if (len === 0) {
    return hexA;
  }
  if (len % 2 !== 0) {
    if (pos === 0) {
      str = '0' + str;
    } else {
      str = str.substr(0, pos) + '0' + str.substr(pos);
      len += 1;
    }
  }

  len /= 2;
  hexA = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    const s = str.substr(pos, 2);
    const v = parseInt(s, 16);
    hexA[i] = v;
    pos += 2;
  }
  return hexA;
}

function str2Bytes(str) {
  let bytes = [];
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    code -= 48;
    bytes = bytes.concat([code]);
  }
  return bytes;
}

function bytes2Hex(array) {
  let hexStr = '0x';
  array.map((item) => {
    let hex = item.toString(16);
    if (hex.length === 1) {
      hex = '0' + hex;
    }
    hexStr += hex;
    return hex;
  });
  return hexStr;
}
// 每个byte里存放的是二进制数据，从高位依次到低位
function bytes2Number(bytes) {
  try {
    if (bytes == null) {
      return new BigNumber(0);
    }
    const len = bytes.length;
    let number = new BigNumber(0);
    for (let i = len - 1; i >= 0; i -= 1) {
      const byteValue = new BigNumber(bytes[i]);
      const factor = new BigNumber(2).pow((len - 1 - i) * 8);
      number = number.plus(byteValue.multipliedBy(factor));
    }
    return number;
  } catch (error) {
    return new BigNumber(0);
  }
}

function saveTxHash(accountName, actionType, txHash) {
  let txHashSet = global.localStorage.getItem(accountName);
  if (txHashSet === undefined) {
    txHashSet = [];
  } else {
    txHashSet = JSON.parse(txHashSet);
  }
  const curDate = new Date().toLocaleString();
  const txHashInfo = { date: curDate, txHash, actionType };
  txHashSet = [txHashInfo, ...txHashSet];
  global.localStorage.setItem(accountName, JSON.stringify(txHashSet));
}

function saveTxBothFromAndTo(fromAccount, toAccount, actionType, txHash) {
  saveTxHash(fromAccount, actionType, txHash);
  if (toAccount !== undefined && toAccount !== '') {
    saveTxHash(toAccount, actionType, txHash);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function checkPassword(password) {//必须为字母加数字且长度不小于8位
  var str = password;
   if (str == null || str.length <8) {
       return false;
   }
   var reg1 = new RegExp(/^[0-9A-Za-z]+$/);
   if (!reg1.test(str)) {
       return false;
   }
   var reg = new RegExp(/[A-Za-z].*[0-9]|[0-9].*[A-Za-z]/);
   if (reg.test(str)) {
       return true;
   } else {
       return false;
   }
}

function parsePrivateKey(privateKey) {
  if (!ethUtil.isValidPrivate(Buffer.from(hex2Bytes(privateKey)))) {
    Feedback.toast.error('无效私钥！');
    return;
  }
  const publicKey = EthCrypto.publicKeyByPrivateKey(privateKey);
  console.log('私钥：' + privateKey);
  console.log('公钥：' + publicKey);
  console.log('地址：' + EthCrypto.publicKey.toAddress(publicKey));
  //const bs58 = require('bs58');
  //console.log(bs58.decode('EeGCnq9vgtb8qQ1XzLxF7g3w7XxrwrDUTz').toString('hex')); 
}

function getPublicKeyWithPrefix(publicKey) {
  if (publicKey.startsWith(Constant.PublicKeyPrefix)) {
    return publicKey;
  }
  if (publicKey.startsWith('0x')) {
    return Constant.PublicKeyPrefix + publicKey.substr(2);
  }
  if (publicKey.startsWith('04')) {
    return Constant.PublicKeyPrefix + publicKey.substr(2);
  }
  return Constant.PublicKeyPrefix + publicKey;
}

function isEmptyObj(obj) {
  return obj == null || obj == '';
}

/**
 * utf8 byte to unicode string
 * @param utf8Bytes
 * @returns {string}
 */
function utf8ByteToUnicodeStr(utf8Bytes){
  var unicodeStr ="";
  for (var pos = 0; pos < utf8Bytes.length;){
      var flag= utf8Bytes[pos];
      var unicode = 0 ;
      if ((flag >>>7) === 0 ) {
          unicodeStr+= String.fromCharCode(utf8Bytes[pos]);
          pos += 1;

      } else if ((flag &0xFC) === 0xFC ){
          unicode = (utf8Bytes[pos] & 0x3) << 30;
          unicode |= (utf8Bytes[pos+1] & 0x3F) << 24;
          unicode |= (utf8Bytes[pos+2] & 0x3F) << 18;
          unicode |= (utf8Bytes[pos+3] & 0x3F) << 12;
          unicode |= (utf8Bytes[pos+4] & 0x3F) << 6;
          unicode |= (utf8Bytes[pos+5] & 0x3F);
          unicodeStr+= String.fromCharCode(unicode) ;
          pos += 6;

      }else if ((flag &0xF8) === 0xF8 ){
          unicode = (utf8Bytes[pos] & 0x7) << 24;
          unicode |= (utf8Bytes[pos+1] & 0x3F) << 18;
          unicode |= (utf8Bytes[pos+2] & 0x3F) << 12;
          unicode |= (utf8Bytes[pos+3] & 0x3F) << 6;
          unicode |= (utf8Bytes[pos+4] & 0x3F);
          unicodeStr+= String.fromCharCode(unicode) ;
          pos += 5;

      } else if ((flag &0xF0) === 0xF0 ){
          unicode = (utf8Bytes[pos] & 0xF) << 18;
          unicode |= (utf8Bytes[pos+1] & 0x3F) << 12;
          unicode |= (utf8Bytes[pos+2] & 0x3F) << 6;
          unicode |= (utf8Bytes[pos+3] & 0x3F);
          unicodeStr+= String.fromCharCode(unicode) ;
          pos += 4;

      } else if ((flag &0xE0) === 0xE0 ){
          unicode = (utf8Bytes[pos] & 0x1F) << 12;;
          unicode |= (utf8Bytes[pos+1] & 0x3F) << 6;
          unicode |= (utf8Bytes[pos+2] & 0x3F);
          unicodeStr+= String.fromCharCode(unicode) ;
          pos += 3;

      } else if ((flag &0xC0) === 0xC0 ){ //110
          unicode = (utf8Bytes[pos] & 0x3F) << 6;
          unicode |= (utf8Bytes[pos+1] & 0x3F);
          unicodeStr+= String.fromCharCode(unicode) ;
          pos += 2;

      } else{
          unicodeStr+= String.fromCharCode(utf8Bytes[pos]);
          pos += 1;
      }
  }
  return unicodeStr;
}

function getDataFromFile(fileName, chainId) {
  if (chainId == null) {
    chainId = fractal.ft.getChainId();
  }
  const data = global.localStorage.getItem(fileName);
  if (data != null) {
    const dataObj = JSON.parse(data);
    return dataObj[Constant.ChainIdPrefix + chainId];
  }
  return null;
}

function storeDataToFile(fileName, toSaveObj, chainId) {
  if (chainId == null) {
    chainId = fractal.ft.getChainId();
  }
  let dataObj = {};
  const data = global.localStorage.getItem(fileName);
  if (data != null) {
    dataObj = JSON.parse(data);
  }
  dataObj[Constant.ChainIdPrefix + chainId] = toSaveObj;
  global.localStorage.setItem(fileName, JSON.stringify(dataObj));
}

function removeDataFromFile(fileName) {
  const chainId = fractal.ft.getChainId();
  let dataObj = {};
  const data = global.localStorage.getItem(fileName);
  if (data != null) {
    dataObj = JSON.parse(data);
  }
  delete dataObj[Constant.ChainIdPrefix + chainId];
  global.localStorage.setItem(fileName, JSON.stringify(dataObj));
}


function loadKeystoreFromLS() {
  const keystoreInfoObj = getDataFromFile(Constant.KeyStoreFile);
  if (keystoreInfoObj != null) {
    return keystoreInfoObj.keyList;
  }
  return null;
}
async function loadAccountsFromLS() {
  const accountInfos = [];
  const accounts = getDataFromFile(Constant.AccountFile);
  if (accounts != null) {
    for (const account of accounts) {
      const accountObj = await fractal.account.getAccountByName(account);
      if (accountObj != null) {
        accountInfos.push(accountObj);
      } 
    }
  }
  return accountInfos;
}

function getReadableNumber(value, assetDecimal, displayDecimal) {
  let renderValue = new BigNumber(value);
  renderValue = renderValue.shiftedBy(assetDecimal * -1);

  BigNumber.config({ DECIMAL_PLACES: displayDecimal == null ? 6 : displayDecimal });
  renderValue = renderValue.toString(10);
  return renderValue;
}


function confuseInfo(originalInfo) {
  originalInfo = originalInfo.replace(/a-z0-9A-Z/g, '*');
}

export { getFlatMenuData, getRouterData, formatterMenuData, hex2Bytes, bytes2Hex, str2Bytes, 
         saveTxHash, saveTxBothFromAndTo, bytes2Number, deepClone, parsePrivateKey, checkPassword, 
         isEmptyObj, getPublicKeyWithPrefix, utf8ByteToUnicodeStr, getDataFromFile, storeDataToFile, 
         removeDataFromFile, loadKeystoreFromLS, loadAccountsFromLS, getReadableNumber, confuseInfo };
