
// @flow
import React, { Component } from 'react';
import TextEditorContainer from '../containers/TextEditorContainer';
import FilesContainer from '../containers/FilesContainer'
import FileListContainer from '../containers/FileListContainer'
import Drawer from 'material-ui/Drawer'
import GitButtonsContainer from '../containers/GitButtonsContainer';
import ErrorBoxContainer from '../containers/ErrorBoxContainer';
import SuccessBoxContainer from '../containers/SuccessBoxContainer';
import{ serverLocation }from '../utils/server.settings'
import io from 'socket.io-client'

const socket = io(serverLocation)

export default class HomePageComponent extends Component {

  constructor(props){
    super(props)
    this.state = {
      remoteVideoRendered: false,
    }
    this.setSelfToDriver = this.setSelfToDriver.bind(this)
    this.setPartnerToDriver = this.setPartnerToDriver.bind(this)
    this.updateCSS = this.updateCSS.bind(this)
    this.returnToCollaborators = this.returnToCollaborators.bind(this);
  }

  componentDidMount(){
    const LocalVideo = document.getElementById('localWebchat')
    LocalVideo.src = URL.createObjectURL(this.props.localURL);
    LocalVideo.play();
    socket.on('partner picked self as driver', () => {
      this.props.setDriverToPartner()
      this.updateCSS()
    })
    socket.on('partner picked you as driver', () => {
      this.props.setDriverToMyself()
      this.updateCSS()
    })
    socket.on('peer connection severed', () => {
          URL.revokeObjectURL(this.props.URL);
          URL.revokeObjectURL(this.props.remoteURL)
    })
    setTimeout(()=>{
      socket.emit('room', {room: this.props.room,})
    }, 0)
  }

  componentWillUnmount() {
    window.pc.close();
    socket.removeAllListeners('partner picked self as driver')
    socket.removeAllListeners('partner picked you as driver')
    socket.removeAllListeners('peer connection severed')
  }

  componentDidUpdate(){
    if (this.props.remoteURL.length && this.state.remoteVideoRendered === false){
      const RemoteVideo = document.getElementById('webchatWindow');
      this.setState({remoteVideoRendered: true});
      RemoteVideo.src = this.props.remoteURL;
      RemoteVideo.play();
    }
  }

  setSelfToDriver(){
    this.props.setDriverToMyself()
    socket.emit('driver selected', {room: this.props.room})
    this.updateCSS()
  }

  setPartnerToDriver(){
    this.props.setDriverToPartner()
    socket.emit('navigator selected', {room: this.props.room})
    this.updateCSS()
  }

  updateCSS(){
    document.getElementById('webchatWindow').className="webchatWindow-text-editor"
    document.getElementById('localWebchat').className="localWebchat-text-editor"
    document.getElementById('video-container').className="col-sm-4 text-editor"
  }

  returnToCollaborators() {
    this.props.backToCollaborators();
    this.props.makeAvailable(this.props.myName)
    this.props.removeRole()
    socket.emit('closed connection', {room: this.props.room})
    socket.emit('set available', { room: this.props.repoId, name: this.props.myName })
    URL.revokeObjectURL(this.props.remoteURL)
    this.props.localURL.getVideoTracks()[0].stop();
    this.props.URL.getVideoTracks()[0].stop();
    this.props.URL.getAudioTracks()[0].stop();
    this.props.clearURLs();
    this.setState({remoteVideoRendered: false});
  }

  render() {
    return (
      //NO ROLES DEFINED
      <div>
      {(this.props.role === '') ?
            <div className="col-sm-12" id="set-driver">
                <h1 className="text-center">Who is driving?</h1>
                <p className="text-center">Click the video to choose.</p>
            </div>
        : <div></div>}
        <div id="video-container" className="col-sm-12 video-padding">
          <video id="webchatWindow" className="set-driver-view" onClick={this.setPartnerToDriver} />
          <video id="localWebchat" className="set-driver-view" onClick={this.setSelfToDriver} />
        </div>

        {(this.props.role === '') ?
        <footer>
            <div className="footer" onClick={this.returnToCollaborators}><h3><i className="fa fa-arrow-left" />   Return to Collaborators Page</h3></div>
        </footer>
        :
      //DRIVER VIEW
          (this.props.role === 'driver') ?
            <div>
              <TextEditorContainer gitOpen={this.props.openGitMenu}/>
              <FilesContainer />
                <div className="footer" onClick={this.returnToCollaborators}><h3><i className="fa fa-arrow-left" />   Return to Collaborators Page</h3></div>
              <Drawer
                open={this.props.gitOpen}
                docked={false}
                width={300}
                >
                <GitButtonsContainer />
                <ErrorBoxContainer />
                <SuccessBoxContainer />
              </Drawer>
            </div>
        :
      //NAVIGATOR VIEW
            <div>
              <TextEditorContainer />
              <FileListContainer/>
              <footer>
               <div className="footer" onClick={this.returnToCollaborators}><h3><i className="fa fa-arrow-left" />   Return to Collaborators Page</h3></div>
              </footer>
            </div>
      }


      </div>
    )
    }
}
