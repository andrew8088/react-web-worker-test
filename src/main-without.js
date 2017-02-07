import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';

const el = document.getElementById('main');
const socket = io('http://localhost:8000');

ReactDOM.render(<App socket={socket} />, el);
