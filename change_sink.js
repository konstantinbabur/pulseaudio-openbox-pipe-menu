const {spawn} = require('child_process');

const streamDataPromisify = (stream, encoding) => {
  return new Promise((resolve, reject) => {
    let dataArray = [];
    stream.on('data', data => dataArray.push(data.toString(encoding)));
    stream.on('end', () => resolve(dataArray.join('')))
  });
};

const listSinkInputsPromise = 
  streamDataPromisify(spawn('pacmd', ['list-sink-inputs']).stdout, 'utf-8');

const listSinksPromise = 
  streamDataPromisify(spawn('pacmd', ['list-sinks']).stdout, 'utf-8');

const inputSinkRegexp = /((index):\s*(\d+)|(sink):\s*(\d+))/g;
const sinkRegexp = /((index):\s*(\d+)|(device\.description)\s*=\s*"(.+)")/g;

listSinkInputsPromise.then(data => {
  let match;
  const inputsSinks = {};
  while (match = inputSinkRegexp.exec(data)) {
    inputsSinks[match[2]] = match[3];
  }
});

listSinksPromise.then(data => {
  let match;
  while (match = sinkRegexp.exec(data)) {
    console.log(match);
  }
});
