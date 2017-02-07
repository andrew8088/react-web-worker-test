import React from 'react';
import { Table } from './Table';

export const App = React.createClass({
  getInitialState() {
    return {
      items: [],
      input: ''
    };
  },
  componentDidMount() {
    this.props.socket.on('data', data => this.setState({ items: data }));
  },
  handleChange(e) {
    this.setState({
      input: e.target.value
    }); 
  },
  render() {
    return <div>
      <input onChange={this.handleChange} value={this.state.input} />
      <Table items={this.state.items} />;
    </div>
  }
});
