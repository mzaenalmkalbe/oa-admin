import React, { PureComponent, Fragment } from 'react';
import { connect } from 'dva';
import moment from 'moment';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  Modal,
  Badge,
} from 'antd';
import StandardTable from '@/components/StandardTable';
import PageHeaderWrapper from '@/components/PageHeaderWrapper';

import styles from './TableList.less';

const FormItem = Form.Item;
const { Option } = Select;
const getValue = obj =>
  Object.keys(obj)
    .map(key => obj[key])
    .join(',');
const statusMap = ['default', 'processing', 'success', 'error'];
const status = ['未审批', '通过', '不通过'];
const leaveType = ['事假','婚假','丧假','产假','年假','调休','病假'];

@Form.create()
class AuditForm extends PureComponent {
  constructor(props) {
    super(props);
    console.log(props.values);

    this.state = {
      formVals: {
        status: '0',
      },
    };

    this.formLayout = {
      labelCol: { span: 7 },
      wrapperCol: { span: 13 },
    };
  }

  render() {
    const { auditModalVisible, handleUpdateModalVisible, handleAudit, values } = this.props;
    const { formVals } = this.state;
    const { form } = this.props;

    return (
      <Modal
        width={640}
        bodyStyle={{ padding: '32px 40px 48px' }}
        destroyOnClose
        title="请假审批"
        visible={auditModalVisible}
        onCancel={() => handleUpdateModalVisible()}
        onOk={() => handleAudit(values,form)}
      >
        <div>
          <Row>
            <Col span={12}>用户标识：</Col>
            <Col span={12}>{values.openId}</Col>
          </Row>
          <Row>
            <Col span={12}>请假类型：</Col>
            <Col span={12}>{values.leaveType===0?"事假":
              (values.leaveType===1?"婚假":
                (values.leaveType===2?"丧假":
                  (values.leaveType===3?"产假":
                    (values.leaveType===4?"年假":
                      (values.leaveType===5?"调休":"病假"
                      )))))}
            </Col>
          </Row>
          <Row>
            <Col span={12}>请假理由：</Col>
            <Col span={12}>{values.message}</Col>
          </Row>
          <Row>
            <Col span={12}>请假时间：</Col>
            <Col span={12}>{moment(values.createTime).format('YYYY-MM-DD HH:mm:ss')}</Col>
          </Row>
          <FormItem key="status" {...this.formLayout} label="请假审批">
            {form.getFieldDecorator('status', {
              initialValue: formVals.status,
            })(
              <Select style={{ width: '100%' }}>
                <Option value="0">未审批</Option>
                <Option value="1">通过</Option>
                <Option value="2">不通过</Option>
              </Select>
            )}
          </FormItem>,
        </div>
      </Modal>
    );
  }
}

/* eslint react/no-multi-comp:0 */
@connect(({ leave, loading }) => ({
  leave,
  loading: loading.models.leave,
}))
@Form.create()
class TableList extends PureComponent {
  state = {
    auditModalVisible: false,
    selectedRows: [],
    formValues: {},
    stepFormValues: {},
  };

  columns = [
    {
      title: '用户标识',
      dataIndex: 'openId',
    },
    {
      title: '请假理由',
      dataIndex: 'message',
    },
    {
      title: '请假类型',
      dataIndex: 'leaveType',
      render(val) {
        return leaveType[val];
      },
    },
    // {
    //   title: '服务调用次数',
    //   dataIndex: 'callNo',
    //   sorter: true,
    //   align: 'right',
    //   render: val => `${val} 万`,
    //   // mark to display a total number
    //   needTotal: true,
    // },
    {
      title: '状态',
      dataIndex: 'status',
      render(val) {
        return <Badge status={statusMap[val]} text={status[val]} />;
      },
    },
    {
      title: '请假申请时间',
      dataIndex: 'createTime',
      render: val => <span>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: '操作',
      render: (text, record) => (
        <Fragment>
          <a onClick={() => this.handleUpdateModalVisible(true, record)}>审批</a>
        </Fragment>
      ),
    },
  ];

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch({
      type: 'leave/fetch',
    });
  }

  handleStandardTableChange = (pagination, filtersArg, sorter) => {
    const { dispatch } = this.props;
    const { formValues } = this.state;

    const filters = Object.keys(filtersArg).reduce((obj, key) => {
      const newObj = { ...obj };
      newObj[key] = getValue(filtersArg[key]);
      return newObj;
    }, {});

    const params = {
      currentPage: pagination.current,
      pageSize: pagination.pageSize,
      ...formValues,
      ...filters,
    };
    if (sorter.field) {
      params.sorter = `${sorter.field}_${sorter.order}`;
    }

    dispatch({
      type: 'leave/fetch',
      payload: params,
    });
  };

  handleFormReset = () => {
    const { form, dispatch } = this.props;
    form.resetFields();
    this.setState({
      formValues: {},
    });
    dispatch({
      type: 'leave/fetch',
      payload: {},
    });
  };

  handleRemove = () => {
    const { dispatch } = this.props;
    const { selectedRows } = this.state;

    if (!selectedRows) return;
    dispatch({
      type: 'leave/remove',
      payload: {
        key: selectedRows.map(row => row.key),
      },
      callback: () => {
        this.setState({
          selectedRows: [],
        });
      },
    });
  };

  handleSelectRows = rows => {
    this.setState({
      selectedRows: rows,
    });
  };

  handleSearch = e => {
    e.preventDefault();
    const { dispatch, form } = this.props;
    form.validateFields((err, fieldsValue) => {
      if (err) return;
      const values = {
        ...fieldsValue,
        updatedAt: fieldsValue.updatedAt && fieldsValue.updatedAt.valueOf(),
      };
      this.setState({
        formValues: values,
      });
      dispatch({
        type: 'leave/fetch',
        payload: values,
      });
    });
  };

  handleUpdateModalVisible = (flag, record) => {
    this.setState({
      auditModalVisible: !!flag,
      stepFormValues: record || {},
    });
  };

  handleAudit = (rowData,form) => {
    const { dispatch } = this.props;
    const that = this;
    form.validateFields((err, values) => {
      if (!err) {
        console.log(rowData.id);
        console.log(values.status);
        dispatch({
          type: 'leave/update',
          payload: {
            id:rowData.id,
            status:values.status,
          },
          callback:()=>{
            that.setState({
              auditModalVisible:false,
            });
          }
        });
      }
    });
  };

  render() {
    const {
      leave: { data },
      loading,
    } = this.props;

    const { selectedRows, auditModalVisible, stepFormValues } = this.state;

    return (
      <PageHeaderWrapper title="请假列表">
        <Card bordered={false}>
          <div className={styles.tableList}>
            <StandardTable
              selectedRows={selectedRows}
              loading={loading}
              data={data}
              rowKey="id"
              columns={this.columns}
              onSelectRow={this.handleSelectRows}
              onChange={this.handleStandardTableChange}
            />
          </div>
        </Card>
        {
          stepFormValues && Object.keys(stepFormValues).length ? (
            <AuditForm
              handleUpdateModalVisible={this.handleUpdateModalVisible}
              handleAudit={this.handleAudit}
              auditModalVisible={auditModalVisible}
              values={stepFormValues}
            />
          ) : null
        }

      </PageHeaderWrapper>
    );
  }
}
export default TableList;
