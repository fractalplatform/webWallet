/* eslint-disable react/no-string-refs */
import React, { Component } from 'react';

import { Button } from '@alifd/next';
import * as monaco from 'monaco-editor';
import 'monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js';
import 'monaco-editor/esm/vs/editor/contrib/find/findController.js';
import { T } from '../../../../utils/lang'
import * as CompilerSrv from '../../CompilerSrv';

export default class ContractEditor extends Component {
  constructor(props) {
    super(props);
    //const fractalsol = require('solc');
    //solc = solc.setupMethods(require("../../../../utils/soljson.js"));
    const solCode = global.localStorage.getItem('sol:' + props.fileName);
    this.state = {
      code: solCode,
      editor: null,
      fileName: props.fileName,
      accountName: props.accountName,
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
    this.state.editor.onDidBlurEditorWidget(() => {
      const latestCode = this.state.editor.getValue();
      global.localStorage.setItem('sol:' + this.state.fileName, latestCode);
      CompilerSrv.updateSol(this.state.accountName, this.state.fileName, latestCode);
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
                      {T('编译')}
          </Button>
          &nbsp;&nbsp;
          <Button type="primary" onClick={this.sendToChain.bind(this)}>
          {T('发布')}
          </Button>
        </p>
        <div ref="editorContainer" style={{ height: 1200, width: 1100 }} />
      </div>
    );
  }
}
