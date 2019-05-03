import React, { Component } from 'react';

import {
  Select,
} from '@icedesign/base';

const { Combobox } = Select;

// 对于 FormBinder 需要标准的表单交互 API，即 value 用于回填、onChange 用于更新 value
// 对于 Combobox 这种特殊交互的组件，需要封装一个业务组件使其具备标准 API，之后接入使用
export default class CustomCombobox extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      dataSource: props.dataSource,
    };
    this.onChange = this.onChange.bind(this);
    this.onInputUpdate = this.onInputUpdate.bind(this);
    this.onInputBlur = this.onInputBlur.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // 注意在上层 FormBinder 更新 value 之后，将组件内部 value 更新
    this.setState({
      value: nextProps.value,
    });
  }

  onInputUpdate = value => {
    // mock dataSource
    this.state.dataSource.push({ label: value, value });
    this.setState(this.state);
  };

  onInputBlur = (e, value) => {
    const newEle = { label: value, value };
    const exist = this.state.dataSource.some(element => {
      return newEle.label === element.label;
    });
    if (!exist) {
      this.state.dataSource.push(newEle);
      this.setState(this.state);
      if (this.props.onChange) {
        this.props.onChange(value);
      }
    }
  }

  onChange = value => {
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  };

  render() {
    return (
      <Combobox
        hasClear
        style={{ verticalAlign: 'middle' }}
        onChange={this.onChange}
        value={this.state.value}
        dataSource={this.state.dataSource}
        onInputBlur={this.onInputBlur}
      />
    );
  }
}