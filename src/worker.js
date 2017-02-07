importScripts('/socket.io/socket.io.js');

import React from 'react';
import ReactDOM from 'react-dom';
import WorkerDOM from 'react-worker-dom/worker';
import { App } from './components/App';

const socket = io('http://localhost:8000');

ReactDOM.render(<App socket={socket} />, WorkerDOM);
