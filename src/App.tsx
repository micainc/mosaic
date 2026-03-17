import React from 'react';
import { useAppSelector } from './store';
import Toolbar from './components/Toolbar';
import Stage from './components/Stage';

const App: React.FC = () => {
  const hasLayers = useAppSelector(state => state.canvas.hasLayers);

  return (
    <div className="app">
      <Toolbar />
      {!hasLayers && (
        <span id="no-layers-tip">
          <img src={`${import.meta.env.BASE_URL}img/drag_and_drop.svg`} alt="drag and drop" />
          Drag image layers in...
        </span>
      )}
      <Stage />
    </div>
  );
};

export default App;
