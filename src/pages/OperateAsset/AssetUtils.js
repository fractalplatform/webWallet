import * as fractal from 'fractal-web3';
import * as utils from '../../utils/utils';

async function getAssetInfoOfOwner(accountName) {
  if (utils.isEmptyObj(accountName)) {
    return;
  }
  const account = await fractal.account.getAccountByName(accountName);
  const assetInfoSet = [];
  const assetBalances = account.balances;
  for (const assetBalance of assetBalances) {
    const assetInfo = await fractal.account.getAssetInfoById(assetBalance.assetID);
    if (assetInfo.owner === accountName) {
      const assetId = assetInfo.assetId == null ? 0 : assetInfo.assetId;
      assetInfo.assetId = assetId;
      assetInfo.label = `${assetInfo.assetId}--${assetInfo.assetName}`;
      assetInfo.value = assetInfo.assetId;
      assetInfoSet.push(assetInfo);
    }
  }
  return assetInfoSet;
}

async function getAllAssetInfo(accountName) {
    if (utils.isEmptyObj(accountName)) {
      return;
    }
    const account = await fractal.account.getAccountByName(accountName);
    const assetInfoSet = [];
    const assetBalances = account.balances;
    for (const assetBalance of assetBalances) {
      const assetInfo = await fractal.account.getAssetInfoById(assetBalance.assetID);
      const assetId = assetInfo.assetId == null ? 0 : assetInfo.assetId;
      assetInfo.assetId = assetId;
      assetInfo.label = `${assetInfo.assetId}--${assetInfo.assetName}`;
      assetInfo.value = assetInfo.assetId;
      assetInfoSet.push(assetInfo);
    }
    return assetInfoSet;
  }

export { getAssetInfoOfOwner, getAllAssetInfo };