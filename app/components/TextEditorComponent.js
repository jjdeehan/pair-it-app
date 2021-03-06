// // @flow

import React from 'react'
import Promise from 'bluebird'

import AceEditor from 'react-ace'
import brace from 'brace'
import 'brace/mode/javascript'
import 'brace/theme/monokai'
import 'brace/ext/language_tools'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'

import io from 'socket.io-client'
import { serverLocation } from '../utils/server.settings.js'

const socket = io(serverLocation)

export default class TextEditorComponent extends React.Component {
	constructor(props){
		super(props)
		this.state = {
			code: ''
		}

    this.handleSelect = this.handleSelect.bind(this)
    this.codeIsHappening = this.codeIsHappening.bind(this)
    this.onSave = this.onSave.bind(this)
    this.onAddNewTab = this.onAddNewTab.bind(this)
    this.onCloseTab = this.onCloseTab.bind(this)
  }

  componentDidMount() {
  	socket.emit('room', {room: this.props.room})
    socket.on('receive code', (payload) => this.props.dispatchActiveFile({filePath: this.props.activeFile.filePath, text: payload.code}))
    socket.on('change to new tab', (payload) => {
      Promise.resolve(this.props.dispatchSetActiveFileAndReturnFileAndIndex(this.props.openFiles[payload.index]))
      .then(() => this.props.dispatchUpdateOpenFiles(payload.file))
      .then(() => this.props.dispatchSwitchTab(payload.index))
      .catch(error => console.error(error.message))
    })

    socket.on('new tab added', payload => {
      if (payload.length > this.props.openFiles.length) {
        this.props.dispatchAddToOpenFilesAndSetActive()
        this.props.dispatchSwitchTab(this.props.openFiles.length - 1)
      }
    })
    socket.on('a tab was closed', payload => {
     if (this.props.openFiles.filter(file => file.filePath === payload.fileToClose.filePath).length > 0) {
       Promise.resolve(this.props.dispatchCloseFile(payload.fileToClose))
       .then(() => this.props.dispatchSetActiveFileAndReturnFileAndIndex(payload.fileToActive) )
       .then(() => this.props.dispatchSwitchTab(payload.index))
       .catch(error => console.error(error.message))
     }
   })
    socket.on('file was saved', (payload) => {
      if (this.props.activeFile.filePath !== payload.filePath) {
        const file = { filePath: payload.filePath, text: payload.text }
        Promise.resolve(this.props.dispatchUpdateOpenFiles(file))
        .then(() => this.props.dispatchSetActiveFileAndReturnFileAndIndex(file))
        .then(() => this.props.dispatchSaveNewFile(file))
        .catch(error => console.error(error.message))
      }
    })
  }

  componentWillUnmount() {
    socket.removeAllListeners('receive code')
    socket.removeAllListeners('change to new tab')
    socket.removeAllListeners('new tab added')
    socket.removeAllListeners('a tab was closed')
    socket.removeAllListeners('file was saved')
    socket.emit('leave room', {message: 'leaving text-editor' + this.props.room})
  }

  codeIsHappening(newCode) {
    this.props.dispatchWholeFile({filePath:this.props.activeFile.filePath, text: newCode})
    socket.emit('coding event', {code: newCode, room: this.props.room})
  }

  handleSelect(index, last) {
    const file = this.props.activeFile
    socket.emit('tab changed', {file: file, index: index, room: this.props.room})
    Promise.resolve(this.props.dispatchUpdateOpenFiles(file))
    .then(() => this.props.dispatchSetActiveFileAndReturnFileAndIndex(this.props.openFiles[index]))
    .then(() => this.props.dispatchSwitchTab(index))
	  .catch(error => console.error(error.message))
  }

  onSave(ev) {
    ev.preventDefault()
    let filePath
    let isNewFile = false
    if (this.props.activeFile.filePath.length > 0) {
      filePath = this.props.activeFile.filePath
    } else {
      filePath = `${this.props.dir}/${ev.target.filename.value}`
      isNewFile = true
    }
    this.props.dispatchDriverSave(filePath, this.props.activeFile.text, isNewFile)
    .then(() => this.props.dispatchSetFileDirAndLoadFiles(this.props.dir))
    .then(() => socket.emit('save file', { filePath: filePath, text: this.props.activeFile.text, room: this.props.room }))
    .catch(error => console.error(error.message))
  }

  onAddNewTab() {
    Promise.resolve(this.props.dispatchAddToOpenFilesAndSetActive())
    .then(() => this.props.dispatchSwitchTab(this.props.openFiles.length - 1))
    .then(() => socket.emit('added a tab', {length: this.props.openFiles.length, room: this.props.room}))
  }

  onCloseTab(file){
    this.props.dispatchCloseTab(file, this.props.openFiles)
    .spread((fileToActive, index) => {
      this.props.dispatchSwitchTab(index)
      socket.emit('closed tab', { fileToClose: file, fileToActive: fileToActive, room: this.props.room, index: index})
    })
    .catch(error => console.error(error.message))
  }

	render() {
    if (this.props.openFiles.length === 0) {
      return (
        <div id="text-editor" className="col-sm-8 text-editor">
          {this.props.role === 'driver' &&

          <div>
            <div className="admin-btn-container">

              <div className="float-left" onClick={() => this.props.dispatchOpenGitMenu()}><i className="fa fa-git"/></div>
            <form className="float-left" onSubmit={this.onSave}>
              <input type="text" name="filename" placeholder="Name your file" />
              <button type="submit">SAVE</button>
            </form>

          </div>
          </div>
          }
          <AceEditor
            mode="javascript"
            theme="monokai"
            onChange={this.codeIsHappening}
            name="text-editor"
            value={this.state.code}
            width="100%"
            height="96vh"
            editorProps={{$blockScrolling: true}}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              tabSize: 2,
              fontSize: 16,
              showGutter: true,
              showPrintMargin: false,
              maxLines: Infinity
            }}
          />

        </div>
      )
    } else {
      return (
        <div id="text-editor" className="col-sm-8 text-editor">
              <div>
                {(this.props.role === 'driver' && this.props.activeFile.text.length > 0) ?
                <div className="admin-btn-container">
                  <div className="admin-btn add-tab" onClick={this.onAddNewTab}><i className="fa fa-plus-square-o"/></div>
                  <div className="admin-btn close-tab" onClick={() => this.onCloseTab(this.props.activeFile, this.props.openFiles) }><i className="fa fa-times" /></div>
                  <div className="admin-btn save" onClick={this.onSave}><i className="fa fa-floppy-o"/></div>
                  <div className="admin-btn" onClick={() => this.props.dispatchOpenGitMenu()}><i className="fa fa-git"/></div>
                </div>
                : (this.props.role === 'driver') ?
                <form onSubmit={this.onSave}>
                  <input type="text" name="filename" placeholder="Name your file" />
                  <input type="submit" value="SAVE"/>
                </form>
                : null
                }
             </div>

        <Tabs
          onSelect={this.handleSelect}
          selectedIndex={this.props.selectedTab}>
          <TabList>
            {
              this.props.openFiles.length > 0 && this.props.openFiles.map((file, index) => {
                const fileNameArr = file.filePath.split('/')
                const fileName = fileNameArr[fileNameArr.length - 1]
                return (
                  <Tab height="4vh" key={fileName}>{fileName}</Tab>
                )
              })
            }
          </TabList>
          {this.props.openFiles.length > 0 && this.props.openFiles.map((file, index) =>
            (<TabPanel key={file.filePath}>
              <AceEditor
              mode="javascript"
              theme="monokai"
              onChange={this.codeIsHappening}
              name="text-editor"
              value={this.props.activeFile.text}
              width="100%"
              height="96vh"
              editorProps={{$blockScrolling: true}}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                tabSize: 2,
                fontSize: 16,
                showGutter: true,
                showPrintMargin: false,
                maxLines: Infinity
              }}
              />
              </TabPanel>)
            )}
        </Tabs>
        </div>
		  )}
	  }
  }
