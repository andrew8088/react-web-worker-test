import ReactDOM from 'react-worker-dom/page';

const el = document.getElementById('main');

ReactDOM.render(new Worker('/worker.js'), el);
