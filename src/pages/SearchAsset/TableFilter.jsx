/* eslint react/no-string-refs:0 */
import React, { Component } from 'react';
import { Grid } from '@icedesign/base';
import {
  FormBinderWrapper as IceFormBinderWrapper,
  FormBinder as IceFormBinder,
  FormError as IceFormError,
} from '@icedesign/form-binder';
import CustomCombobox from './CustomCombobox';

const { Row, Col } = Grid;

export default class Filter extends Component {
  static displayName = 'Filter';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      value: {
        blockHeight: 'latest',
        userAddr: '',
        assetId: '',
      },
    };
    this.formChange = this.formChange.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  formChange = (value) => {
    console.log('value', value);
    this.setState({
      value,
    });
  };

  onChange(value) {
    this.setState({
      value,
    });
  }
  render() {
    return (
      <IceFormBinderWrapper
        value={this.state.value}
        onChange={this.formChange}
        ref="form"
      >
        <Row wrap gutter="20" style={styles.formRow}>

          <Col l="8">
            <div style={styles.formItem}>
              <span style={styles.formLabel}>Block Height：</span>
              <IceFormBinder required
                pattern="\b(latest|earliest|pending|\d+)\b"
                message="Required!"
              >
                <CustomCombobox
                  name="blockHeight"
                  dataSource={[{ label: 'latest', value: 'latest' },
                                { label: 'earliest', value: 'earliest' },
                                { label: 'pending', value: 'pending' }]}
                />
              </IceFormBinder>
              <div style={styles.formError}>
                <IceFormError name="blockHeight" />
              </div>
            </div>
          </Col>
          <Col l="8">
            <div style={styles.formItem}>
              <span style={styles.formLabel}>User Address：</span>
              <IceFormBinder required triggerType="onBlur" message="Required!">
                <CustomCombobox
                  name="userAddr"
                  dataSource={[]}
                />
              </IceFormBinder>
              <div style={styles.formError}>
                <IceFormError name="userAddr" />
              </div>
            </div>
          </Col>
          <Col l="8">
            <div style={styles.formItem}>
              <span style={styles.formLabel}>Asset Id:</span>
              <IceFormBinder triggerType="onBlur">
                <CustomCombobox
                  name="assetId"
                  dataSource={[]}
                />
              </IceFormBinder>
              <div style={styles.formError}>
                <IceFormError name="assetId" />
              </div>
            </div>
          </Col>
        </Row>
      </IceFormBinderWrapper>
    );
  }
}

const styles = {
  container: {
    margin: '20px',
    padding: '0',
  },
  title: {
    margin: '0',
    padding: '20px',
    fonSize: '16px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'rgba(0,0,0,.85)',
    fontWeight: '500',
    borderBottom: '1px solid #eee',
  },
  formRow: {
    padding: '10px 20px',
  },
  formItem: {
    display: 'flex',
    alignItems: 'center',
    margin: '10px 0',
  },
  formLabel: {
    minWidth: '70px',
  },
};
