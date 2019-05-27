/* eslint-disable react/no-string-refs */
import React, { Component } from 'react';

import { Button } from '@alifd/next';
import * as monaco from 'monaco-editor';
import 'monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js';
import 'monaco-editor/esm/vs/editor/contrib/find/findController.js';
//import solc from 'solc';

export default class ContractEditor extends Component {
  constructor(props) {
    super(props);
    //const fractalsol = require('solc');
    //solc = solc.setupMethods(require("../../../../utils/soljson.js"));
    const solCode = global.localStorage.getItem('solCode');
    this.state = {
      code: solCode,
      editor: null,
      //fractalsol: solc
    };
  }
  componentDidMount() {
    this.state.editor = monaco.editor.create(this.refs.editorContainer, {
      value: this.state.code,
      language: 'sol',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      theme: 'vs-dark',
    });
    this.state.editor.onDidChangeModelContent(() => {
      const latestCode = this.state.editor.getValue();
      global.localStorage.setItem('solCode', latestCode);
    });
  }
  componentWillUnmount() {
    this.state.editor.dispose();
  }
  compile = () => {
    
    var input = {
      language: 'Solidity',
      sources: {
        'test.sol': {
          content: this.state.editor.getValue(),
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': [ '*' ]
          }
        }
      }
    }
    var output = JSON.parse(this.state.fractalsol.compile(JSON.stringify(input)))
    for (var contractName in output.contracts['test.sol']) {
      console.log(contractName + ': ' + output.contracts['test.sol'][contractName].evm.bytecode.object)
    }
  }
  sendToChain = () => {

  }
  render() {
    return (
      <div>
        <p style={{display: 'none'}}>
          <Button type="primary" onClick={this.compile.bind(this)}>
                      编译
          </Button>
          &nbsp;&nbsp;
          <Button type="primary" onClick={this.sendToChain.bind(this)}>
                      发布
          </Button>
        </p>
        合约编辑器
        <div ref="editorContainer" style={{ height: 800, width: 800 }} />
      </div>
    );
  }
}
