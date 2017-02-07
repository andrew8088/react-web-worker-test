import React from 'react';

export const Row = React.createClass({
  render() {
    return (<tr>
      <td> {this.props.value} </td>
      <td> {this.props.timestamp} </td>
    </tr>);
  }
});

export const Table = React.createClass({
  render() {
    return (<table>
      <tbody>
      {this.props.items.map((data, i) =>
        <Row key={i} value={data.value} timestamp={data.timestamp} />)}
      </tbody>
    </table>);
  }
});
