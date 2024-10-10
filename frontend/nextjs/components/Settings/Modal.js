import React, { useState, useEffect } from "react";
import './App.css';
import ChatBox from './ChatBox';
import axios from 'axios';
import { getHost } from '../../helpers/getHost';
import { motion } from 'framer-motion';

export default function Modal({ setChatBoxSettings, chatBoxSettings }) {
  const [activeTab] = useState('search'); // Force 'search' tab to be active
  const [apiVariables, setApiVariables] = useState({
    ANTHROPIC_API_KEY: '',
    TAVILY_API_KEY: '',
    LANGCHAIN_TRACING_V2: 'true',
    LANGCHAIN_API_KEY: '',
    OPENAI_API_KEY: '',
    DOC_PATH: './my-docs',
    RETRIEVER: 'tavily', // Keep Tavily as the default retriever
    GOOGLE_API_KEY: '',
    GOOGLE_CX_KEY: '',
    BING_API_KEY: '',
    SEARCHAPI_API_KEY: '',
    SERPAPI_API_KEY: '',
    SERPER_API_KEY: '',
    SEARX_URL: '',
    LANGGRAPH_HOST_URL: ''
  });

  useEffect(() => {
    const storedConfig = localStorage.getItem('apiVariables');
    if (storedConfig) {
      setApiVariables(JSON.parse(storedConfig));
    } else {
      axios.get(`${getHost()}/getConfig`)
        .then(response => {
          setApiVariables(response.data);
          localStorage.setItem('apiVariables', JSON.stringify(response.data));
        })
        .catch(error => {
          console.error('Error fetching config:', error);
        });
    }
  }, []);

  const handleSaveChanges = () => {
    setChatBoxSettings(chatBoxSettings);
    localStorage.setItem('apiVariables', JSON.stringify(apiVariables));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApiVariables(prevState => ({
      ...prevState,
      [name]: value
    }));
    localStorage.setItem('apiVariables', JSON.stringify({
      ...apiVariables,
      [name]: value
    }));
  };

  const renderConditionalInputs = () => {
    switch (apiVariables.RETRIEVER) {
      case 'google':
        return (
          <>
            <div className="form-group">
              <label className="form-group-label">GOOGLE_API_KEY</label>
              <input type="text" name="GOOGLE_API_KEY" value={apiVariables.GOOGLE_API_KEY} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-group-label">GOOGLE_CX_KEY</label>
              <input type="text" name="GOOGLE_CX_KEY" value={apiVariables.GOOGLE_CX_KEY} onChange={handleInputChange} />
            </div>
          </>
        );
      case 'bing':
        return (
          <div className="form-group">
            <label className="form-group-label">BING_API_KEY</label>
            <input type="text" name="BING_API_KEY" value={apiVariables.BING_API_KEY} onChange={handleInputChange} />
          </div>
        );
      case 'searchapi':
        return (
          <div className="form-group">
            <label className="form-group-label">SEARCHAPI_API_KEY</label>
            <input type="text" name="SEARCHAPI_API_KEY" value={apiVariables.SEARCHAPI_API_KEY} onChange={handleInputChange} />
          </div>
        );
      case 'serpapi':
        return (
          <div className="form-group">
            <label className="form-group-label">SERPAPI_API_KEY</label>
            <input type="text" name="SERPAPI_API_KEY" value={apiVariables.SERPAPI_API_KEY} onChange={handleInputChange} />
          </div>
        );
      case 'googleSerp':
        return (
          <div className="form-group">
            <label className="form-group-label">SERPER_API_KEY</label>
            <input type="text" name="SERPER_API_KEY" value={apiVariables.SERPER_API_KEY} onChange={handleInputChange} />
          </div>
        );
      case 'searx':
        return (
          <div className="form-group">
            <label className="form-group-label">SEARX_URL</label>
            <input type="text" name="SEARX_URL" value={apiVariables.SEARX_URL} onChange={handleInputChange} />
          </div>
        );
      // Add cases for other retrievers if needed
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="settings-modal"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="settings-content">
        {/* Comment out the tabs */}
        {/* <div className="settings-tabs">
          <button onClick={() => setActiveTab('search')} className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}>Search</button>
          <button onClick={() => setActiveTab('api')} className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}>API</button>
        </div> */}
        <motion.div
          className="settings-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {activeTab === 'search' && (
            <div className="settings-section">
              <ChatBox setChatBoxSettings={setChatBoxSettings} chatBoxSettings={chatBoxSettings} />
            </div>
          )}
          {/* Comment out the API tab content */}
          {/* {activeTab === 'api' && (
            <form className="settings-form">
              ... API form content ...
            </form>
          )} */}
        </motion.div>
      </div>
      <motion.div
        className="settings-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="save-button"
            type="button"
            onClick={handleSaveChanges}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}