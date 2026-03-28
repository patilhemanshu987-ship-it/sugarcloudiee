/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

global.Buffer = Buffer;
global.process = process;
global.crypto = require('crypto-js');

AppRegistry.registerComponent(appName, () => App);
