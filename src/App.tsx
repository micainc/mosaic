import React from 'react';
import { useAppSelector } from './store';
import Toolbar from './components/Toolbar';
import CanvasWorkspace from './components/CanvasWorkspace';

const App: React.FC = () => {
  const hasLayers = useAppSelector(state => state.canvas.hasLayers);

  return (
    <div className="app">
      <Toolbar />
      {!hasLayers && (
        <span id="no-layers-tip">
          <img src={`${import.meta.env.BASE_URL}img/drag_and_drop.png`} alt="drag and drop" />
          Drag image layers in...
        </span>
      )}
      <CanvasWorkspace />
    </div>
  );
};

export default App;
