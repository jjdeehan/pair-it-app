// @flow
import { combineReducers } from 'redux';
import { routerReducer as routing } from 'react-router-redux';
import files from './FilesReducer'
import VideoChatReducer from '../VideoChat/VideoChatReducer';
import username from './UserReducer'

const rootReducer = combineReducers({
  routing,
  fileSystem: files,
  VideoChat: VideoChatReducer,
  User: username
});

export default rootReducer;
