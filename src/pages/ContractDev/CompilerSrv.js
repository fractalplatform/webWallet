let srvAddr = "http://18.182.10.22:8888/solidity/";

export function changeSrv(compileSrv) {
  srvAddr = compileSrv + '/solidity/';
}

export function addSol(accountName, solFileName) {
  const dataToSrv = JSON.stringify({ type: 0,
    accountName: accountName,
    solFileName: solFileName,
    newSolFileName: "",
    solFileContent: ""});
  fetch(srvAddr, 
        {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv})
  .then(resp => {
          resp.json().then(response => console.log(response));
        });
}

export function delSol(accountName, solFileName) {
  const dataToSrv = JSON.stringify({ type: 1,
    accountName: accountName,
    solFileName: solFileName,
    newSolFileName: "",
    solFileContent: ""});
  fetch(srvAddr, 
        {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv})
  .then(resp => {
          resp.json().then(response => console.log(response));
        });
}

export function updateSol(accountName, solFileName, solFileContent) {
  const dataToSrv = JSON.stringify({ type: 2,
    accountName: accountName,
    solFileName: solFileName,
    newSolFileName: "",
    solFileContent: solFileContent});
  fetch(srvAddr, 
        {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv})
  .then(resp => {
          resp.json().then(response => console.log(response));
        });
}

export async function listSol(accountName) {
  const dataToSrv = JSON.stringify({ type: 3,
    accountName: accountName,
    solFileName: "",
    newSolFileName: "",
    solFileContent: ""});
  let resp = await fetch(srvAddr, 
        {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv});
  resp = await resp.json();
  console.log(resp);
  return resp;
}

export function renameSol(accountName, solFileName, newSolFileName) {
  const dataToSrv = JSON.stringify({ type: 4,
    accountName: accountName,
    solFileName: solFileName,
    newSolFileName: newSolFileName,
    solFileContent: ""});
  fetch(srvAddr, 
        {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv})
  .then(resp => {
          resp.json().then(response => console.log(response));
        });
}

export async function compileSol(accountName, solFileName) {
  const dataToSrv = JSON.stringify({ type: 5,
    accountName: accountName,
    solFileName: solFileName,
    newSolFileName: "",
    solFileContent: ""});
  let resp = await fetch(srvAddr, 
      {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToSrv});
  resp = await resp.json();
  console.log(resp);
  return resp;
}
