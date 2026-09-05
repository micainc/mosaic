import React from 'react';
import { useAppSelector } from './redux/store';
import Toolbar from './components/Toolbar';
import Stage from './components/Stage';
import Polygons from './components/Polygons/Polygons';
import Tooltip from './components/Tooltip/Tooltip';
import { useKeys } from './hooks/useKeys';

const App: React.FC = () => {
  const hasLayers = useAppSelector(state => state.canvas.hasLayers);
  useKeys();

  return (
    <div className="app">
      <Tooltip/>
      <Toolbar />
      {!hasLayers && (
        <span id="no-layers-tip">
          <img src={`${import.meta.env.BASE_URL}img/drag_and_drop.svg`} alt="drag and drop" />
          Drag image layers in...
        </span>
      )}
      <Stage />
      <Polygons />
    </div>
  );
};

export default App;
